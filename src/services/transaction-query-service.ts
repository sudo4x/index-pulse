import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { TransactionDetail, TransactionType } from "@/types/investment";
import { TransactionHelpers } from "@/utils/transaction-helpers";

/**
 * 交易查询服务
 * 提供交易记录的查询和过滤功能
 */
export class TransactionQueryService {
  /**
   * 根据组合ID和股票代码获取交易记录，支持按交易类型过滤
   * @param portfolioId 投资组合ID
   * @param symbol 股票代码
   * @param types 允许的交易类型数组，默认为所有类型
   * @returns 交易记录数组
   */
  static async getTransactionsBySymbol(
    portfolioId: number,
    symbol: string,
    types: TransactionType[] = [
      TransactionType.BUY,
      TransactionType.SELL,
      TransactionType.DIVIDEND,
      TransactionType.SPLIT,
      TransactionType.MERGE,
    ],
  ): Promise<TransactionDetail[]> {
    try {
      const transactionRecords = await db
        .select({
          id: transactions.id,
          portfolioId: transactions.portfolioId,
          symbol: transactions.symbol,
          name: transactions.name,
          type: transactions.type,
          transactionDate: transactions.transactionDate,
          shares: transactions.shares,
          price: transactions.price,
          amount: transactions.amount,
          commission: transactions.commission,
          tax: transactions.tax,
          unitShares: transactions.unitShares,
          unitIncreaseShares: transactions.unitIncreaseShares,
          unitDividend: transactions.unitDividend,
          comment: transactions.comment,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.portfolioId, portfolioId),
            eq(transactions.symbol, symbol),
            inArray(transactions.type, types),
          ),
        )
        .orderBy(transactions.transactionDate);

      return transactionRecords.map((record) => TransactionHelpers.enrichTransactionData(record as any));
    } catch (error) {
      console.error(`Error fetching transactions for symbol ${symbol}:`, error);
      return [];
    }
  }

  /**
   * 获取买卖交易记录（仅用于XIRR计算）
   * @param portfolioId 投资组合ID
   * @param symbol 股票代码
   * @returns 买卖交易记录数组
   */
  static async getBuySellTransactions(portfolioId: number, symbol: string): Promise<TransactionDetail[]> {
    return this.getTransactionsBySymbol(portfolioId, symbol, [TransactionType.BUY, TransactionType.SELL]);
  }

  /**
   * 获取除权除息交易记录
   * @param portfolioId 投资组合ID
   * @param symbol 股票代码
   * @returns 除权除息交易记录数组
   */
  static async getDividendTransactions(portfolioId: number, symbol: string): Promise<TransactionDetail[]> {
    return this.getTransactionsBySymbol(portfolioId, symbol, [TransactionType.DIVIDEND]);
  }

  /**
   * 获取合股拆股交易记录
   * @param portfolioId 投资组合ID
   * @param symbol 股票代码
   * @returns 合股拆股交易记录数组
   */
  static async getSplitMergeTransactions(portfolioId: number, symbol: string): Promise<TransactionDetail[]> {
    return this.getTransactionsBySymbol(portfolioId, symbol, [TransactionType.SPLIT, TransactionType.MERGE]);
  }
}
