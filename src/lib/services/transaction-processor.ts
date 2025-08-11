import { TransactionType } from "@/types/investment";

import { SharesData, TransactionData, TransactionRecord } from "./types/calculator-types";

/**
 * 交易处理器
 * 负责处理各种类型的交易记录并计算持仓变化
 */
export class TransactionProcessor {
  /**
   * 计算股份和金额统计
   */
  static calculateSharesAndAmounts(transactions: TransactionRecord[]): SharesData {
    let totalShares = 0;
    let totalBuyAmount = 0;
    let totalSellAmount = 0;
    let totalDividend = 0;
    let buyShares = 0;
    let openTime: Date | null = null;
    let liquidationTime: Date | null = null;

    for (const transaction of transactions) {
      const shares = parseFloat(String(transaction.shares)) || 0;
      const amount = parseFloat(String(transaction.amount)) || 0;

      const result = this.processTransaction(transaction, shares, amount, {
        totalShares,
        buyShares,
        totalBuyAmount,
        totalSellAmount,
        totalDividend,
      });

      totalShares = result.totalShares;
      buyShares = result.buyShares;
      totalBuyAmount = result.totalBuyAmount;
      totalSellAmount = result.totalSellAmount;
      totalDividend = result.totalDividend;

      if (transaction.type === TransactionType.BUY) {
        openTime ??= transaction.transactionDate;
      } else if (transaction.type === TransactionType.SELL && totalShares <= 0) {
        liquidationTime = transaction.transactionDate;
      }
    }

    return {
      totalShares,
      totalBuyAmount,
      totalSellAmount,
      totalDividend,
      buyShares,
      openTime,
      liquidationTime,
    };
  }

  /**
   * 处理单个交易记录
   */
  private static processTransaction(
    transaction: {
      type: TransactionType;
      unitShares?: number | string;
      unitDividend?: number | string;
      unitIncreaseShares?: number | string;
    },
    shares: number,
    amount: number,
    current: TransactionData,
  ) {
    const result = { ...current };

    switch (transaction.type) {
      case TransactionType.BUY:
        return this.processBuyTransaction(result, shares, amount);
      case TransactionType.SELL:
        return this.processSellTransaction(result, shares, amount);
      case TransactionType.MERGE:
        return this.processMergeTransaction(result, transaction);
      case TransactionType.SPLIT:
        return this.processSplitTransaction(result, transaction);
      case TransactionType.DIVIDEND:
        return this.processDividendTransaction(result, transaction);
      default:
        return result;
    }
  }

  private static processBuyTransaction(result: TransactionData, shares: number, amount: number) {
    result.totalShares += shares;
    result.buyShares += shares;
    result.totalBuyAmount += amount;
    return result;
  }

  private static processSellTransaction(result: TransactionData, shares: number, amount: number) {
    result.totalShares -= shares;
    result.totalSellAmount += amount;
    return result;
  }

  private static processMergeTransaction(result: TransactionData, transaction: { unitShares?: number | string }) {
    const mergeRatio = parseFloat(String(transaction.unitShares)) || 1;
    result.totalShares = result.totalShares / mergeRatio;
    result.buyShares = result.buyShares / mergeRatio;
    return result;
  }

  private static processSplitTransaction(result: TransactionData, transaction: { unitShares?: number | string }) {
    const splitRatio = parseFloat(String(transaction.unitShares)) || 1;
    result.totalShares = result.totalShares * splitRatio;
    result.buyShares = result.buyShares * splitRatio;
    return result;
  }

  private static processDividendTransaction(
    result: TransactionData,
    transaction: { unitDividend?: number | string; unitIncreaseShares?: number | string },
  ) {
    const dividend = parseFloat(String(transaction.unitDividend)) || 0;
    const increaseShares = parseFloat(String(transaction.unitIncreaseShares)) || 0;

    if (dividend > 0) {
      result.totalDividend += dividend * result.totalShares;
    }

    if (increaseShares > 0) {
      result.totalShares += increaseShares * result.totalShares;
      result.buyShares += increaseShares * result.buyShares;
    }
    return result;
  }
}
