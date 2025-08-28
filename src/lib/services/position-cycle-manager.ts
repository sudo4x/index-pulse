import { eq, and, max, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions, holdings } from "@/lib/db/schema";
import { TransactionType } from "@/types/investment";

/**
 * 仓位周期管理器
 * 负责管理仓位周期ID的分配和维护
 */
export class PositionCycleManager {
  /**
   * 为新交易分配仓位周期ID
   */
  static async assignCycleId(
    portfolioId: number,
    symbol: string,
    transactionType: TransactionType,
    _transactionShares: number,
  ): Promise<number> {
    // 获取当前持股数
    const currentShares = await this.getCurrentShares(portfolioId, symbol);

    switch (transactionType) {
      case TransactionType.BUY:
        return this.handleBuyTransaction(portfolioId, symbol, currentShares);

      case TransactionType.SELL:
        return this.handleSellTransaction(portfolioId, symbol, currentShares);

      case TransactionType.MERGE:
      case TransactionType.SPLIT:
      case TransactionType.DIVIDEND:
        return this.handleOtherTransaction(portfolioId, symbol);

      default:
        throw new Error(`Unsupported transaction type: ${transactionType}`);
    }
  }

  /**
   * 处理买入交易的周期ID分配
   */
  private static async handleBuyTransaction(
    portfolioId: number,
    symbol: string,
    currentShares: number,
  ): Promise<number> {
    if (currentShares === 0) {
      // 空仓买入，开启新周期
      return await this.getNextCycleId(portfolioId, symbol);
    } else {
      // 加仓，使用当前周期
      return await this.getCurrentCycleId(portfolioId, symbol);
    }
  }

  /**
   * 处理卖出交易的周期ID分配
   */
  private static async handleSellTransaction(
    portfolioId: number,
    symbol: string,
    currentShares: number,
  ): Promise<number> {
    if (currentShares === 0) {
      throw new Error("Cannot sell when no shares are held");
    }
    // 卖出永远使用当前周期ID
    return await this.getCurrentCycleId(portfolioId, symbol);
  }

  /**
   * 处理其他交易类型（合股、拆股、除权除息）
   */
  private static async handleOtherTransaction(portfolioId: number, symbol: string): Promise<number> {
    // 这些操作不改变持仓性质，使用当前周期ID
    return await this.getCurrentCycleId(portfolioId, symbol);
  }

  /**
   * 获取下一个周期ID
   */
  private static async getNextCycleId(portfolioId: number, symbol: string): Promise<number> {
    const result = await db
      .select({ maxId: max(transactions.positionCycleId) })
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.symbol, symbol)));

    const maxCycleId = result[0]?.maxId ?? 0;
    return maxCycleId + 1;
  }

  /**
   * 获取当前活跃周期ID
   */
  private static async getCurrentCycleId(portfolioId: number, symbol: string): Promise<number> {
    const result = await db
      .select({ cycleId: transactions.positionCycleId })
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.symbol, symbol)))
      .orderBy(desc(transactions.transactionDate))
      .limit(1);

    if (!result[0]) {
      // 没有历史交易记录，创建新周期
      return await this.getNextCycleId(portfolioId, symbol);
    }

    return result[0].cycleId;
  }

  /**
   * 获取当前持股数（从holdings表获取，性能更高）
   */
  private static async getCurrentShares(portfolioId: number, symbol: string): Promise<number> {
    const result = await db
      .select({ shares: holdings.shares })
      .from(holdings)
      .where(and(eq(holdings.portfolioId, portfolioId), eq(holdings.symbol, symbol)))
      .limit(1);

    if (!result[0]) {
      return 0;
    }

    return Number(result[0].shares);
  }

  /**
   * 获取指定周期的所有交易记录
   */
  static async getTransactionsByCycle(portfolioId: number, symbol: string, cycleId: number) {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.portfolioId, portfolioId),
          eq(transactions.symbol, symbol),
          eq(transactions.positionCycleId, cycleId),
        ),
      )
      .orderBy(transactions.transactionDate);
  }

  /**
   * 获取当前活跃周期的所有交易记录
   */
  static async getCurrentCycleTransactions(portfolioId: number, symbol: string) {
    const currentCycleId = await this.getCurrentCycleId(portfolioId, symbol);
    return await this.getTransactionsByCycle(portfolioId, symbol, currentCycleId);
  }

  /**
   * 验证周期数据完整性
   */
  static async validateCycleIntegrity(portfolioId: number, symbol: string): Promise<boolean> {
    try {
      // 获取所有周期ID
      const cycles = await db
        .selectDistinct({ cycleId: transactions.positionCycleId })
        .from(transactions)
        .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.symbol, symbol)))
        .orderBy(transactions.positionCycleId);

      // 检查周期ID是否连续
      for (let i = 0; i < cycles.length; i++) {
        if (cycles[i].cycleId !== i + 1) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error validating cycle integrity:", error);
      return false;
    }
  }
}
