import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, transfers, holdings, stockPrices } from "@/lib/db/schema";
import { TransactionType, TransferType, HoldingDetail, PortfolioOverview } from "@/types/investment";

/**
 * 投资组合计算服务
 * 实现根据交易记录和转账记录计算持仓和组合统计数据的核心业务逻辑
 */
export class PortfolioCalculator {
  /**
   * 计算单个品种的持仓信息
   */
  static async calculateHoldingStats(portfolioId: string, symbol: string): Promise<HoldingDetail | null> {
    const portfolioIdInt = parseInt(portfolioId);
    if (isNaN(portfolioIdInt)) {
      throw new Error("portfolioId 必须是有效的数字");
    }

    // 获取该品种的所有交易记录
    const holdingTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioIdInt), eq(transactions.symbol, symbol)))
      .orderBy(transactions.transactionDate);

    if (holdingTransactions.length === 0) {
      return null;
    }

    // 获取当前价格
    const currentPrice = await this.getStockPrice(symbol);

    let totalShares = 0; // 持股数
    let totalBuyAmount = 0; // 总买入金额
    let totalSellAmount = 0; // 总卖出金额
    let totalDividend = 0; // 总现金股息
    let buyShares = 0; // 买入股数（用于计算持仓成本）

    let openTime: Date | null = null;
    let liquidationTime: Date | null = null;

    for (const transaction of holdingTransactions) {
      const shares = parseFloat(String(transaction.shares)) || 0;
      const amount = parseFloat(String(transaction.amount)) || 0;

      switch (transaction.type) {
        case TransactionType.BUY:
          totalShares += shares;
          buyShares += shares;
          totalBuyAmount += amount;
          if (!openTime) openTime = transaction.transactionDate;
          break;

        case TransactionType.SELL:
          totalShares -= shares;
          totalSellAmount += amount;
          if (totalShares <= 0) {
            liquidationTime = transaction.transactionDate;
          }
          break;

        case TransactionType.MERGE:
          // 合股：原股数 / 合股比例
          const mergeRatio = parseFloat(String(transaction.unitShares)) || 1;
          totalShares = totalShares / mergeRatio;
          buyShares = buyShares / mergeRatio;
          break;

        case TransactionType.SPLIT:
          // 拆股：原股数 * 拆股比例
          const splitRatio = parseFloat(String(transaction.unitShares)) || 1;
          totalShares = totalShares * splitRatio;
          buyShares = buyShares * splitRatio;
          break;

        case TransactionType.DIVIDEND:
          // 现金股息
          const dividend = parseFloat(String(transaction.unitDividend)) || 0;
          const increaseShares = parseFloat(String(transaction.unitIncreaseShares)) || 0;

          if (dividend > 0) {
            totalDividend += dividend * totalShares;
          }

          // 转增股
          if (increaseShares > 0) {
            totalShares += increaseShares * totalShares;
            buyShares += increaseShares * buyShares;
          }
          break;
      }
    }

    // 计算成本和盈亏
    const holdCost = buyShares > 0 ? totalBuyAmount / buyShares : 0; // 持仓成本
    const dilutedCost = totalShares > 0 ? (totalBuyAmount - totalSellAmount - totalDividend) / totalShares : 0; // 摊薄成本
    const marketValue = totalShares * parseFloat(String(currentPrice.currentPrice)) || 0; // 市值

    // 浮动盈亏
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;
    const floatAmount = (currentPriceValue - holdCost) * totalShares;
    const floatRate = holdCost > 0 ? floatAmount / (holdCost * totalShares) : 0;

    // 累计盈亏
    const accumAmount = marketValue - totalBuyAmount + totalSellAmount + totalDividend;
    const accumRate = totalBuyAmount > 0 ? accumAmount / totalBuyAmount : 0;

    // 当日盈亏（这里简化处理，实际需要昨日收盘价）
    const dayFloatAmount = currentPrice.change * totalShares;
    const dayFloatRate =
      currentPrice.currentPrice > 0
        ? dayFloatAmount / ((currentPrice.currentPrice - currentPrice.change) * totalShares)
        : 0;

    return {
      id: `${portfolioId}-${symbol}`,
      symbol,
      name: holdingTransactions[0].name,
      shares: totalShares,
      currentPrice: currentPrice.currentPrice,
      change: currentPrice.change,
      changePercent: currentPrice.changePercent,
      marketValue,
      dilutedCost,
      holdCost,
      floatAmount,
      floatRate,
      accumAmount,
      accumRate,
      dayFloatAmount,
      dayFloatRate,
      isActive: totalShares > 0,
      openTime: openTime?.toISOString() || "",
      liquidationTime: liquidationTime?.toISOString(),
    };
  }

  /**
   * 计算组合概览信息
   */
  static async calculatePortfolioOverview(portfolioId: string): Promise<PortfolioOverview> {
    const portfolioIdInt = parseInt(portfolioId);
    if (isNaN(portfolioIdInt)) {
      throw new Error("portfolioId 必须是有效的数字");
    }

    // 获取所有持仓品种
    const holdingSymbols = await db
      .selectDistinct({ symbol: transactions.symbol })
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolioIdInt));

    // 计算所有持仓的统计数据
    const holdingDetails: HoldingDetail[] = [];
    for (const { symbol } of holdingSymbols) {
      const holding = await this.calculateHoldingStats(portfolioId, symbol);
      if (holding) {
        holdingDetails.push(holding);
      }
    }

    // 获取转账记录计算现金
    const transferRecords = await db.select().from(transfers).where(eq(transfers.portfolioId, portfolioIdInt));

    let cash = 0;
    let principal = 0; // 本金（转入金额）

    for (const transfer of transferRecords) {
      const amount = parseFloat(String(transfer.amount)) || 0;
      if (transfer.type === TransferType.DEPOSIT) {
        cash += amount;
        principal += amount;
      } else {
        cash -= amount;
      }
    }

    // 获取所有买卖交易计算现金变动
    const allTransactions = await db.select().from(transactions).where(eq(transactions.portfolioId, portfolioIdInt));

    let totalBuyAmount = 0;
    let totalSellAmount = 0;
    let totalDividend = 0;

    for (const transaction of allTransactions) {
      const amount = parseFloat(String(transaction.amount)) || 0;

      switch (transaction.type) {
        case TransactionType.BUY:
          totalBuyAmount += amount;
          break;
        case TransactionType.SELL:
          totalSellAmount += amount;
          break;
        case TransactionType.DIVIDEND:
          totalDividend += amount;
          break;
      }
    }

    // 从现金中扣除净投资金额
    cash = cash - totalBuyAmount + totalSellAmount + totalDividend;

    // 汇总组合数据
    const totalMarketValue = holdingDetails.reduce((sum, holding) => sum + holding.marketValue, 0);
    const totalFloatAmount = holdingDetails.reduce((sum, holding) => sum + holding.floatAmount, 0);
    const totalAccumAmount = holdingDetails.reduce((sum, holding) => sum + holding.accumAmount, 0);
    const totalDayFloatAmount = holdingDetails.reduce((sum, holding) => sum + holding.dayFloatAmount, 0);

    const totalAssets = totalMarketValue + cash;
    const floatRate = totalMarketValue > 0 ? totalFloatAmount / totalMarketValue : 0;
    const accumRate = principal > 0 ? totalAccumAmount / principal : 0;
    const dayFloatRate = totalMarketValue > 0 ? totalDayFloatAmount / totalMarketValue : 0;

    return {
      portfolioId,
      name: "", // 需要从 portfolios 表获取
      totalAssets,
      marketValue: totalMarketValue,
      cash,
      principal,
      floatAmount: totalFloatAmount,
      floatRate,
      accumAmount: totalAccumAmount,
      accumRate,
      dayFloatAmount: totalDayFloatAmount,
      dayFloatRate,
    };
  }

  /**
   * 获取股票当前价格
   */
  private static async getStockPrice(symbol: string) {
    // 先从缓存中获取
    const cached = await db.select().from(stockPrices).where(eq(stockPrices.symbol, symbol)).limit(1);

    if (cached.length > 0) {
      const price = cached[0];
      // 检查是否需要更新（5分钟内的数据认为有效）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (new Date(price.lastUpdated) > fiveMinutesAgo) {
        return {
          currentPrice: Number(price.currentPrice),
          change: Number(price.change),
          changePercent: Number(price.changePercent),
        };
      }
    }

    // 从外部接口获取（这里返回模拟数据）
    return {
      currentPrice: 100,
      change: 1.5,
      changePercent: 0.015,
    };
  }
}
