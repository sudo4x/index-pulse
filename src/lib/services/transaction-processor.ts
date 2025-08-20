import { TransactionType } from "@/types/investment";

import { SharesData, TransactionData, TransactionRecord, TransactionFees, TransactionTimestamps } from "./types/calculator-types";

/**
 * 交易处理器
 * 负责处理各种类型的交易记录并计算持仓变化
 */
export class TransactionProcessor {
  /**
   * 计算股份和金额统计
   */
  static calculateSharesAndAmounts(transactions: TransactionRecord[]): SharesData {
    const initialState = this.createInitialState();

    return transactions.reduce((accumulator, transaction) => {
      return this.processTransactionWithFees(accumulator, transaction);
    }, initialState);
  }

  /**
   * 创建初始状态
   */
  private static createInitialState(): SharesData {
    return {
      totalShares: 0,
      totalBuyAmount: 0,
      totalSellAmount: 0,
      totalDividend: 0,
      buyCommission: 0,
      sellCommission: 0,
      buyTax: 0,
      sellTax: 0,
      otherTax: 0,
      buyShares: 0,
      openTime: null,
      liquidationTime: null,
    };
  }

  /**
   * 更新费用统计
   */
  private static updateFees(current: SharesData, transaction: TransactionRecord): SharesData {
    const commission = parseFloat(String(transaction.commission)) || 0;
    const tax = parseFloat(String(transaction.tax)) || 0;

    const result = { ...current };

    switch (transaction.type) {
      case TransactionType.BUY:
        result.buyCommission += commission;
        result.buyTax += tax;
        break;
      case TransactionType.SELL:
        result.sellCommission += commission;
        result.sellTax += tax;
        break;
      default:
        // 除权除息等其他交易类型的费用计入otherTax
        result.otherTax += tax + commission;
        break;
    }

    return result;
  }

  /**
   * 更新时间戳
   */
  private static updateTimestamps(current: SharesData, transaction: TransactionRecord): SharesData {
    const result = { ...current };

    if (transaction.type === TransactionType.BUY && !result.openTime) {
      result.openTime = transaction.transactionDate;
    } else if (transaction.type === TransactionType.SELL && result.totalShares <= 0) {
      result.liquidationTime = transaction.transactionDate;
    }

    return result;
  }

  /**
   * 统一处理交易记录（包括费用和时间戳）
   */
  private static processTransactionWithFees(current: SharesData, transaction: TransactionRecord): SharesData {
    const shares = parseFloat(String(transaction.shares)) || 0;
    const amount = parseFloat(String(transaction.amount)) || 0;

    // 1. 处理核心交易逻辑
    const updatedTransactionData = this.processTransaction(transaction, shares, amount, current);

    // 2. 合并交易数据到当前状态
    const mergedData: SharesData = {
      ...current,
      ...updatedTransactionData,
    };

    // 3. 处理费用分类
    const withFees = this.updateFees(mergedData, transaction);

    // 4. 处理时间戳
    const final = this.updateTimestamps(withFees, transaction);

    return final;
  }

  /**
   * 处理单个交易记录（核心逻辑）
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
