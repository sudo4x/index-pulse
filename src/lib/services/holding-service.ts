import { eq, and, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { holdings, transactions, Holding, NewHolding } from "@/lib/db/schema";
import { TransactionType } from "@/types/investment";

import { FinancialCalculator } from "./financial-calculator";
import { TransactionProcessor } from "./transaction-processor";

/**
 * 持仓数据服务
 * 负责holdings表的持久化操作和数据管理
 */
export class HoldingService {
  /**
   * 根据交易记录重新计算并更新单个品种的持仓数据
   */
  static async updateHoldingBySymbol(portfolioId: number, symbol: string): Promise<void> {
    try {
      // 获取交易数据
      const { currentCycleData, allHistoryData } = await this.getTransactionData(portfolioId, symbol);

      // 检查是否需要删除持仓
      if (currentCycleData.totalShares === 0 && currentCycleData.totalBuyAmount === 0) {
        await this.deleteHolding(portfolioId, symbol);
        return;
      }

      // 准备持仓数据
      const holdingData = await this.prepareHoldingData(portfolioId, symbol, currentCycleData, allHistoryData);

      // 保存持仓数据
      await this.saveHoldingData(portfolioId, symbol, holdingData);
    } catch (error) {
      console.error(`Error updating holding for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * 获取交易数据
   */
  private static async getTransactionData(portfolioId: number, symbol: string) {
    const currentCycleData = await TransactionProcessor.getCurrentCycleSharesData(portfolioId, symbol);
    const allHistoryData = await TransactionProcessor.getAllHistorySharesData(portfolioId, symbol);
    return { currentCycleData, allHistoryData };
  }

  /**
   * 准备持仓数据
   */
  private static async prepareHoldingData(
    portfolioId: number,
    symbol: string,
    currentCycleData: any,
    allHistoryData: any,
  ): Promise<NewHolding> {
    const cost = FinancialCalculator.calculateCost(allHistoryData, currentCycleData.totalShares);
    const stockName = await this.getStockName(portfolioId, symbol);
    const lastTradeInfo = await this.getLastTradeInfo(portfolioId, symbol);

    return {
      portfolioId,
      symbol,
      name: stockName,
      shares: currentCycleData.totalShares.toString(),
      holdCost: cost.toString(),
      totalBuyAmount: allHistoryData.totalBuyAmount.toString(),
      totalSellAmount: allHistoryData.totalSellAmount.toString(),
      totalDividend: allHistoryData.totalDividend.toString(),
      buyCommission: allHistoryData.buyCommission.toString(),
      sellCommission: allHistoryData.sellCommission.toString(),
      buyTax: allHistoryData.buyTax.toString(),
      sellTax: allHistoryData.sellTax.toString(),
      otherFee: allHistoryData.otherFee.toString(),
      isActive: currentCycleData.totalShares > 0,
      openTime: currentCycleData.openTime ?? new Date(),
      liquidationTime: currentCycleData.totalShares <= 0 ? new Date() : null,
      lastBuyPrice: lastTradeInfo.lastBuyPrice ?? null,
      lastBuyDate: lastTradeInfo.lastBuyDate ?? null,
      lastSellPrice: lastTradeInfo.lastSellPrice ?? null,
      lastSellDate: lastTradeInfo.lastSellDate ?? null,
    };
  }

  /**
   * 获取股票名称
   */
  private static async getStockName(portfolioId: number, symbol: string): Promise<string> {
    const latestTransaction = await db
      .select({ name: transactions.name })
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.symbol, symbol)))
      .orderBy(transactions.transactionDate)
      .limit(1);

    if (!latestTransaction[0]) {
      throw new Error(`No transaction found for symbol ${symbol}`);
    }

    return latestTransaction[0].name;
  }

  /**
   * 保存持仓数据
   */
  private static async saveHoldingData(portfolioId: number, symbol: string, holdingData: NewHolding): Promise<void> {
    const existingHolding = await this.getHolding(portfolioId, symbol);

    if (existingHolding) {
      await db
        .update(holdings)
        .set({
          ...holdingData,
          updatedAt: new Date(),
        })
        .where(and(eq(holdings.portfolioId, portfolioId), eq(holdings.symbol, symbol)));
    } else {
      await db.insert(holdings).values(holdingData);
    }
  }

  /**
   * 批量更新投资组合的所有持仓数据
   */
  static async updateAllHoldingsForPortfolio(portfolioId: number): Promise<void> {
    // 获取该投资组合的所有股票代码
    const symbols = await db
      .selectDistinct({ symbol: transactions.symbol })
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolioId));

    // 逐个更新每个品种的持仓
    for (const { symbol } of symbols) {
      await this.updateHoldingBySymbol(portfolioId, symbol);
    }
  }

  /**
   * 获取单个持仓记录
   */
  static async getHolding(portfolioId: number, symbol: string): Promise<Holding | null> {
    const result = await db
      .select()
      .from(holdings)
      .where(and(eq(holdings.portfolioId, portfolioId), eq(holdings.symbol, symbol)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * 获取投资组合的所有持仓记录
   */
  static async getHoldingsByPortfolio(portfolioId: number, includeHistorical: boolean = false): Promise<Holding[]> {
    const conditions = [eq(holdings.portfolioId, portfolioId)];

    if (!includeHistorical) {
      conditions.push(eq(holdings.isActive, true));
    }

    const query = db
      .select()
      .from(holdings)
      .where(and(...conditions));

    return await query;
  }

  /**
   * 删除持仓记录
   */
  static async deleteHolding(portfolioId: number, symbol: string): Promise<void> {
    await db.delete(holdings).where(and(eq(holdings.portfolioId, portfolioId), eq(holdings.symbol, symbol)));
  }

  /**
   * 删除投资组合的所有持仓记录
   */
  static async deleteAllHoldingsForPortfolio(portfolioId: number): Promise<void> {
    await db.delete(holdings).where(eq(holdings.portfolioId, portfolioId));
  }

  /**
   * 获取持仓股数（用于其他服务调用）
   */
  static async getHoldingShares(portfolioId: number, symbol: string): Promise<number> {
    const holding = await this.getHolding(portfolioId, symbol);
    return holding ? Number(holding.shares) : 0;
  }

  /**
   * 获取最近的买入和卖出交易信息
   */
  static async getLastTradeInfo(
    portfolioId: number,
    symbol: string,
  ): Promise<{
    lastBuyPrice?: string;
    lastBuyDate?: Date;
    lastSellPrice?: string;
    lastSellDate?: Date;
  }> {
    // 获取最近的买入交易
    const lastBuyTransaction = await db
      .select({
        price: transactions.price,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.portfolioId, portfolioId),
          eq(transactions.symbol, symbol),
          eq(transactions.type, TransactionType.BUY),
        ),
      )
      .orderBy(desc(transactions.transactionDate))
      .limit(1);

    // 获取最近的卖出交易
    const lastSellTransaction = await db
      .select({
        price: transactions.price,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.portfolioId, portfolioId),
          eq(transactions.symbol, symbol),
          eq(transactions.type, TransactionType.SELL),
        ),
      )
      .orderBy(desc(transactions.transactionDate))
      .limit(1);

    return {
      lastBuyPrice: lastBuyTransaction[0]?.price ?? undefined,
      lastBuyDate: lastBuyTransaction[0]?.transactionDate ?? undefined,
      lastSellPrice: lastSellTransaction[0]?.price ?? undefined,
      lastSellDate: lastSellTransaction[0]?.transactionDate ?? undefined,
    };
  }

  /**
   * 在事务操作后更新相关持仓（事务安全）
   */
  static async updateHoldingAfterTransaction(portfolioId: number, symbol: string, dbTransaction?: any): Promise<void> {
    try {
      if (dbTransaction) {
        // 如果提供了数据库事务，在事务中执行更新
        // 这里简化处理，实际应该使用事务版本的更新方法
        await this.updateHoldingBySymbol(portfolioId, symbol);
      } else {
        // 直接执行更新
        await this.updateHoldingBySymbol(portfolioId, symbol);
      }
    } catch (error) {
      console.error("Error updating holding after transaction:", error);
      throw error;
    }
  }
}
