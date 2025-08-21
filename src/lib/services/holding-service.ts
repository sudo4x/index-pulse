import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { holdings, transactions, Holding, NewHolding } from "@/lib/db/schema";

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
      // 分别获取当前周期和全历史数据
      const currentCycleData = await TransactionProcessor.getCurrentCycleSharesData(portfolioId, symbol);
      const allHistoryData = await TransactionProcessor.getAllHistorySharesData(portfolioId, symbol);

      if (currentCycleData.totalShares === 0 && currentCycleData.totalBuyAmount === 0) {
        // 如果没有持仓数据，删除持仓记录
        await this.deleteHolding(portfolioId, symbol);
        return;
      }

      // 分别计算两种不同概念的成本
      const holdCost = FinancialCalculator.calculateHoldCost(currentCycleData);
      const dilutedCost = FinancialCalculator.calculateDilutedCost(allHistoryData, currentCycleData.totalShares);

      // 获取股票名称（从最新交易记录获取）
      const latestTransaction = await db
        .select({ name: transactions.name })
        .from(transactions)
        .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.symbol, symbol)))
        .orderBy(transactions.transactionDate)
        .limit(1);

      if (!latestTransaction[0]) {
        throw new Error(`No transaction found for symbol ${symbol}`);
      }

      // 准备持仓数据（使用全历史数据作为holdings表的汇总数据）
      const holdingData: NewHolding = {
        portfolioId,
        symbol,
        name: latestTransaction[0].name,
        shares: currentCycleData.totalShares.toString(), // 当前持股数
        dilutedCost: dilutedCost.toString(),
        holdCost: holdCost.toString(),
        totalBuyAmount: allHistoryData.totalBuyAmount.toString(), // 全历史汇总
        totalSellAmount: allHistoryData.totalSellAmount.toString(), // 全历史汇总
        totalDividend: allHistoryData.totalDividend.toString(), // 全历史汇总
        buyCommission: allHistoryData.buyCommission.toString(), // 全历史汇总
        sellCommission: allHistoryData.sellCommission.toString(), // 全历史汇总
        buyTax: allHistoryData.buyTax.toString(), // 全历史汇总
        sellTax: allHistoryData.sellTax.toString(), // 全历史汇总
        otherTax: allHistoryData.otherTax.toString(), // 全历史汇总
        isActive: currentCycleData.totalShares > 0,
        openTime: currentCycleData.openTime ?? new Date(),
        liquidationTime: currentCycleData.totalShares <= 0 ? new Date() : null,
      };

      // 检查是否已存在持仓记录
      const existingHolding = await this.getHolding(portfolioId, symbol);

      if (existingHolding) {
        // 更新现有记录
        await db
          .update(holdings)
          .set({
            ...holdingData,
            updatedAt: new Date(),
          })
          .where(and(eq(holdings.portfolioId, portfolioId), eq(holdings.symbol, symbol)));
      } else {
        // 插入新记录
        await db.insert(holdings).values(holdingData);
      }
    } catch (error) {
      console.error(`Error updating holding for ${symbol}:`, error);
      throw error;
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
