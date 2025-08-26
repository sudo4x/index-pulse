import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions, transfers } from "@/lib/db/schema";
import { TransactionType, TransferType, HoldingDetail, PortfolioOverview } from "@/types/investment";

import { FinancialCalculator } from "./financial-calculator";
import { StockPriceService } from "./stock-price-service";
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
    // 获取当前价格
    const currentPrice = await this.getStockPrice(symbol);
    return this.calculateHoldingStatsWithPrice(portfolioId, symbol, currentPrice);
  }

  /**
   * 使用提供的价格计算单个品种的持仓信息（用于批量优化）
   */
  private static async calculateHoldingStatsWithPrice(
    portfolioId: string,
    symbol: string,
    currentPrice?: StockPrice,
  ): Promise<HoldingDetail | null> {
    const portfolioIdInt = parseInt(portfolioId);
    if (isNaN(portfolioIdInt)) {
      throw new Error("portfolioId 必须是有效的数字");
    }

    // 分别获取当前周期和全历史数据
    const currentCycleData = await TransactionProcessor.getCurrentCycleSharesData(portfolioIdInt, symbol);
    const allHistoryData = await TransactionProcessor.getAllHistorySharesData(portfolioIdInt, symbol);

    if (currentCycleData.totalShares === 0 && currentCycleData.totalBuyAmount === 0) {
      return null;
    }

    // 如果没有提供价格，则获取
    const finalPrice = currentPrice ?? (await this.getStockPrice(symbol));

    // 计算统一成本价
    const cost = FinancialCalculator.calculateCost(allHistoryData, currentCycleData.totalShares);
    const marketValue = FinancialCalculator.calculateMarketValue(currentCycleData.totalShares, finalPrice.currentPrice);
    const profitLoss = FinancialCalculator.calculateProfitLoss(allHistoryData, finalPrice, cost, marketValue);

    // 获取股票名称（从全历史数据的第一条记录）
    const allTransactions = await db
      .select({ name: transactions.name })
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioIdInt), eq(transactions.symbol, symbol)))
      .orderBy(transactions.transactionDate)
      .limit(1);

    return {
      id: `${portfolioId}-${symbol}`,
      symbol,
      name: allTransactions[0]?.name ?? "",
      shares: currentCycleData.totalShares,
      currentPrice: finalPrice.currentPrice,
      change: finalPrice.change,
      changePercent: finalPrice.changePercent,
      marketValue,
      cost,
      profitAmount: profitLoss.profitAmount,
      profitRate: profitLoss.profitRate,
      dayFloatAmount: profitLoss.dayFloatAmount,
      dayFloatRate: profitLoss.dayFloatRate,
      isActive: currentCycleData.totalShares > 0,
      openTime: currentCycleData.openTime?.toISOString() ?? "",
      liquidationTime: currentCycleData.liquidationTime?.toISOString(),
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
   * 获取持仓详情（优化版：批量获取股票价格）
   */
  private static async getHoldingDetails(portfolioId: string, portfolioIdInt: number): Promise<HoldingDetail[]> {
    const holdingSymbols = await db
      .selectDistinct({ symbol: transactions.symbol })
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolioIdInt));

    // 批量获取所有股票价格
    const symbols = holdingSymbols.map((h) => h.symbol);
    const priceMap = await StockPriceService.getStockPriceMap(symbols);

    const holdingDetails: HoldingDetail[] = [];
    for (const { symbol } of holdingSymbols) {
      const holding = await this.calculateHoldingStatsWithPrice(portfolioId, symbol, priceMap.get(symbol));
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
    const totalProfitAmount = holdingDetails.reduce((sum, holding) => sum + holding.profitAmount, 0);
    const totalDayFloatAmount = holdingDetails.reduce((sum, holding) => sum + holding.dayFloatAmount, 0);

    const totalAssets = totalMarketValue + cashData.cash;
    const profitRate = totalMarketValue > 0 ? totalProfitAmount / totalMarketValue : 0;
    const dayFloatRate = totalMarketValue > 0 ? totalDayFloatAmount / totalMarketValue : 0;

    return {
      totalAssets,
      marketValue: totalMarketValue,
      cash: cashData.cash,
      principal: cashData.principal,
      profitAmount: totalProfitAmount,
      profitRate,
      dayFloatAmount: totalDayFloatAmount,
      dayFloatRate,
    };
  }

  /**
   * 获取股票当前价格
   */
  private static async getStockPrice(symbol: string): Promise<StockPrice> {
    return await StockPriceService.getStockPrice(symbol);
  }
}
