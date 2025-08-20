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
    let buyCommission = 0;
    let sellCommission = 0;
    let buyTax = 0;
    let sellTax = 0;
    let otherTax = 0;
    let buyShares = 0;
    let openTime: Date | null = null;
    let liquidationTime: Date | null = null;

    for (const transaction of transactions) {
      const shares = parseFloat(String(transaction.shares)) || 0;
      const amount = parseFloat(String(transaction.amount)) || 0;
      const commission = parseFloat(String(transaction.commission)) || 0;
      const tax = parseFloat(String(transaction.tax)) || 0;

      const result = this.processTransaction(transaction, shares, amount, {
        totalShares,
        buyShares,
        totalBuyAmount,
        totalSellAmount,
        totalDividend,
        buyCommission,
        sellCommission,
        buyTax,
        sellTax,
        otherTax,
      });

      totalShares = result.totalShares;
      buyShares = result.buyShares;
      totalBuyAmount = result.totalBuyAmount;
      totalSellAmount = result.totalSellAmount;
      totalDividend = result.totalDividend;
      buyCommission = result.buyCommission;
      sellCommission = result.sellCommission;
      buyTax = result.buyTax;
      sellTax = result.sellTax;
      otherTax = result.otherTax;

      // 根据交易类型分类累加佣金和税费
      if (transaction.type === TransactionType.BUY) {
        buyCommission += commission;
        buyTax += tax;
        openTime ??= transaction.transactionDate;
      } else if (transaction.type === TransactionType.SELL) {
        sellCommission += commission;
        sellTax += tax;
        if (totalShares <= 0) {
          liquidationTime = transaction.transactionDate;
        }
      } else {
        // 除权除息等其他交易类型的税费计入otherTax
        otherTax += tax;
        // 佣金仍按交易类型分类（如果有的话）
        if (commission > 0) {
          otherTax += commission; // 或者单独处理，这里简化为计入otherTax
        }
      }
    }

    return {
      totalShares,
      totalBuyAmount,
      totalSellAmount,
      totalDividend,
      buyCommission,
      sellCommission,
      buyTax,
      sellTax,
      otherTax,
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
      unitShares?: number | string | null;
      per10SharesTransfer?: number | string | null;
      per10SharesBonus?: number | string | null;
      per10SharesDividend?: number | string | null;
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

  private static processMergeTransaction(
    result: TransactionData,
    transaction: { unitShares?: number | string | null },
  ) {
    const mergeRatio = parseFloat(String(transaction.unitShares)) || 1;
    result.totalShares = result.totalShares / mergeRatio;
    result.buyShares = result.buyShares / mergeRatio;
    return result;
  }

  private static processSplitTransaction(
    result: TransactionData,
    transaction: { unitShares?: number | string | null },
  ) {
    const splitRatio = parseFloat(String(transaction.unitShares)) || 1;
    result.totalShares = result.totalShares * splitRatio;
    result.buyShares = result.buyShares * splitRatio;
    return result;
  }

  private static processDividendTransaction(
    result: TransactionData,
    transaction: {
      per10SharesTransfer?: number | string | null;
      per10SharesBonus?: number | string | null;
      per10SharesDividend?: number | string | null;
    },
  ) {
    const transfer = parseFloat(String(transaction.per10SharesTransfer)) || 0;
    const bonus = parseFloat(String(transaction.per10SharesBonus)) || 0;
    const dividend = parseFloat(String(transaction.per10SharesDividend)) || 0;

    // 每10股红利计算
    if (dividend > 0) {
      result.totalDividend += (dividend / 10) * result.totalShares;
    }

    // 每10股转增计算
    if (transfer > 0) {
      const transferShares = (transfer / 10) * result.totalShares;
      result.totalShares += transferShares;
      result.buyShares += transferShares;
    }

    // 每10股送股计算
    if (bonus > 0) {
      const bonusShares = (bonus / 10) * result.totalShares;
      result.totalShares += bonusShares;
      result.buyShares += bonusShares;
    }

    return result;
  }
}
