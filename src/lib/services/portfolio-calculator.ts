import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions, transfers, stockPrices } from "@/lib/db/schema";
import { TransactionType, TransferType, HoldingDetail, PortfolioOverview } from "@/types/investment";

import { FinancialCalculator } from "./financial-calculator";
import { TransactionProcessor } from "./transaction-processor";
import { StockPrice, CashData } from "./types/calculator-types";

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

    const sharesData = TransactionProcessor.calculateSharesAndAmounts(holdingTransactions);
    const costs = FinancialCalculator.calculateCosts(sharesData, currentPrice);
    const profitLoss = FinancialCalculator.calculateProfitLoss(sharesData, currentPrice, costs);

    return {
      id: `${portfolioId}-${symbol}`,
      symbol,
      name: holdingTransactions[0].name,
      shares: sharesData.totalShares,
      currentPrice: currentPrice.currentPrice,
      change: currentPrice.change,
      changePercent: currentPrice.changePercent,
      marketValue: costs.marketValue,
      dilutedCost: costs.dilutedCost,
      holdCost: costs.holdCost,
      floatAmount: profitLoss.floatAmount,
      floatRate: profitLoss.floatRate,
      accumAmount: profitLoss.accumAmount,
      accumRate: profitLoss.accumRate,
      dayFloatAmount: profitLoss.dayFloatAmount,
      dayFloatRate: profitLoss.dayFloatRate,
      isActive: sharesData.totalShares > 0,
      openTime: sharesData.openTime?.toISOString() ?? "",
      liquidationTime: sharesData.liquidationTime?.toISOString(),
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

    const holdingDetails = await this.getHoldingDetails(portfolioId, portfolioIdInt);
    const cashData = await this.calculateCashData(portfolioIdInt);
    const portfolioSummary = this.calculatePortfolioSummary(holdingDetails, cashData);

    return {
      portfolioId,
      name: "", // 需要从 portfolios 表获取
      ...portfolioSummary,
    };
  }

  /**
   * 获取持仓详情
   */
  private static async getHoldingDetails(portfolioId: string, portfolioIdInt: number): Promise<HoldingDetail[]> {
    const holdingSymbols = await db
      .selectDistinct({ symbol: transactions.symbol })
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolioIdInt));

    const holdingDetails: HoldingDetail[] = [];
    for (const { symbol } of holdingSymbols) {
      const holding = await this.calculateHoldingStats(portfolioId, symbol);
      if (holding) {
        holdingDetails.push(holding);
      }
    }
    return holdingDetails;
  }

  /**
   * 计算现金相关数据
   */
  private static async calculateCashData(portfolioIdInt: number): Promise<CashData> {
    const transferRecords = await db.select().from(transfers).where(eq(transfers.portfolioId, portfolioIdInt));
    const allTransactions = await db.select().from(transactions).where(eq(transactions.portfolioId, portfolioIdInt));

    let cash = 0;
    let principal = 0;

    for (const transfer of transferRecords) {
      const amount = parseFloat(String(transfer.amount)) || 0;
      if (transfer.type === TransferType.DEPOSIT) {
        cash += amount;
        principal += amount;
      } else {
        cash -= amount;
      }
    }

    let totalBuyAmount = 0;
    let totalSellAmount = 0;
    let totalDividend = 0;

    for (const transaction of allTransactions) {
      const amount = parseFloat(String(transaction.amount)) || 0;
      if (transaction.type === TransactionType.BUY) {
        totalBuyAmount += amount;
      } else if (transaction.type === TransactionType.SELL) {
        totalSellAmount += amount;
      } else if (transaction.type === TransactionType.DIVIDEND) {
        totalDividend += amount;
      }
    }

    cash = cash - totalBuyAmount + totalSellAmount + totalDividend;
    return { cash, principal };
  }

  /**
   * 计算组合汇总数据
   */
  private static calculatePortfolioSummary(holdingDetails: HoldingDetail[], cashData: CashData) {
    const totalMarketValue = holdingDetails.reduce((sum, holding) => sum + holding.marketValue, 0);
    const totalFloatAmount = holdingDetails.reduce((sum, holding) => sum + holding.floatAmount, 0);
    const totalAccumAmount = holdingDetails.reduce((sum, holding) => sum + holding.accumAmount, 0);
    const totalDayFloatAmount = holdingDetails.reduce((sum, holding) => sum + holding.dayFloatAmount, 0);

    const totalAssets = totalMarketValue + cashData.cash;
    const floatRate = totalMarketValue > 0 ? totalFloatAmount / totalMarketValue : 0;
    const accumRate = cashData.principal > 0 ? totalAccumAmount / cashData.principal : 0;
    const dayFloatRate = totalMarketValue > 0 ? totalDayFloatAmount / totalMarketValue : 0;

    return {
      totalAssets,
      marketValue: totalMarketValue,
      cash: cashData.cash,
      principal: cashData.principal,
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
  private static async getStockPrice(symbol: string): Promise<StockPrice> {
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
