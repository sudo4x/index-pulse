import type { TransactionFormData } from "@/app/(main)/investment/portfolios/_components/transaction-form-types";
import { TransactionHelpers } from "@/lib/helpers/transaction-helpers";
import { PortfolioCalculator } from "@/lib/services/portfolio-calculator";
import { TransactionService } from "@/lib/services/transaction-service";
import type { BulkTransactionRequest, BulkTransactionResponse } from "@/types/quick-entry";

/**
 * 批量交易处理服务
 * 负责处理快速录入的批量交易逻辑
 */
export class BulkTransactionService {
  /**
   * 处理批量交易请求
   */
  static async processBulkTransactions(
    request: BulkTransactionRequest,
    portfolio: any,
    userId: number,
  ): Promise<BulkTransactionResponse> {
    const { portfolioId, transactions: transactionData } = request;
    const groupedBySymbol = this.groupTransactionsBySymbol(transactionData);

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ index: number; error: string }> = [];

    // 按品种分组处理
    for (const [symbol, symbolTransactions] of Object.entries(groupedBySymbol)) {
      const symbolResult = await this.processSymbolTransactions(
        symbol,
        symbolTransactions,
        portfolioId,
        portfolio,
        userId,
      );

      successCount += symbolResult.successCount;
      failureCount += symbolResult.failureCount;
      errors.push(...symbolResult.errors);
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 处理单个品种的所有交易
   */
  private static async processSymbolTransactions(
    symbol: string,
    symbolTransactions: (TransactionFormData & { originalIndex: number })[],
    portfolioId: string,
    portfolio: any,
    userId: number,
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ index: number; error: string }> = [];

    try {
      const savedTransactions = [];

      // 按交易日期排序，确保时间顺序正确（买入记录先于除权除息记录处理）
      const sortedTransactions = this.sortTransactionsByDate(symbolTransactions);

      // 处理该品种的所有交易
      for (let i = 0; i < sortedTransactions.length; i++) {
        const transaction = sortedTransactions[i];
        const result = await this.processSingleTransaction(transaction, portfolioId, portfolio, userId);

        if (result.success) {
          savedTransactions.push(result.data);
          successCount++;
        } else {
          failureCount++;
          errors.push({
            index: transaction.originalIndex || i,
            error: result.error ?? "保存交易记录时发生错误",
          });
        }
      }

      // 更新holdings数据
      if (savedTransactions.length > 0) {
        await this.updateHoldingsAfterTransactions(portfolioId, symbol, userId);
      }
    } catch (error) {
      console.error(`Error processing symbol ${symbol}:`, error);
      // 整个品种处理失败时，标记所有交易为失败
      symbolTransactions.forEach((transaction, index) => {
        failureCount++;
        errors.push({
          index: transaction.originalIndex || index,
          error: `处理股票 ${symbol} 时发生错误`,
        });
      });
    }

    return { successCount, failureCount, errors };
  }

  /**
   * 处理单个交易记录
   */
  private static async processSingleTransaction(
    transaction: TransactionFormData & { originalIndex: number },
    portfolioId: string,
    portfolio: any,
    userId: number,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // 处理交易数据，计算佣金、税费等
      const processResult = await TransactionService.processTransactionData(
        {
          portfolioId: parseInt(portfolioId),
          userId,
          ...transaction,
          type: TransactionHelpers.stringToTransactionType(transaction.type),
        },
        portfolio,
      );

      if (!processResult.success) {
        return { success: false, error: processResult.error ?? "交易数据处理失败" };
      }

      // 保存到数据库
      const saveResult = await TransactionService.createTransaction(processResult.data);

      if (!saveResult.success) {
        return { success: false, error: saveResult.error ?? "保存交易记录失败" };
      }

      return { success: true, data: saveResult.data };
    } catch (error) {
      console.error("Error processing single transaction:", error);
      return { success: false, error: error instanceof Error ? error.message : "处理交易时发生错误" };
    }
  }

  /**
   * 更新holdings数据
   */
  private static async updateHoldingsAfterTransactions(
    portfolioId: string,
    symbol: string,
    userId: number,
  ): Promise<void> {
    try {
      await PortfolioCalculator.updateHoldingsForSymbol(parseInt(portfolioId), symbol, userId.toString());
    } catch (error) {
      console.error(`Error updating holdings for ${symbol}:`, error);
      // holdings更新失败不影响交易保存成功的状态
    }
  }

  /**
   * 按股票代码分组交易数据
   */
  private static groupTransactionsBySymbol(
    transactions: TransactionFormData[],
  ): Record<string, (TransactionFormData & { originalIndex: number })[]> {
    const grouped: Record<string, (TransactionFormData & { originalIndex: number })[]> = {};

    transactions.forEach((transaction, index) => {
      const symbol = transaction.symbol.toUpperCase();

      if (!grouped[symbol]) {
        grouped[symbol] = [];
      }

      grouped[symbol].push({
        ...transaction,
        originalIndex: index,
      });
    });

    return grouped;
  }

  /**
   * 按交易日期对交易记录进行排序（升序）
   * 严格按照时间顺序处理，同一天的交易按录入顺序
   */
  private static sortTransactionsByDate(
    transactions: (TransactionFormData & { originalIndex: number })[],
  ): (TransactionFormData & { originalIndex: number })[] {
    return transactions.sort((a, b) => {
      try {
        const dateA = new Date(a.transactionDate);
        const dateB = new Date(b.transactionDate);

        // 日期升序排序
        const dateDiff = dateA.getTime() - dateB.getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }

        // 如果日期相同，按原始索引排序，保持录入顺序
        return a.originalIndex - b.originalIndex;
      } catch (error) {
        console.warn("Error parsing transaction dates, falling back to original order:", error);
        return a.originalIndex - b.originalIndex;
      }
    });
  }
}
