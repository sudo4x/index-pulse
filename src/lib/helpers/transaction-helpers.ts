import { TransactionType, TransactionTypeNames } from "@/types/investment";

/**
 * 交易相关工具函数
 */
export class TransactionHelpers {
  /**
   * 格式化股息描述
   */
  static formatDividendDescription(
    per10SharesTransfer?: string | number | null,
    per10SharesBonus?: string | number | null,
    per10SharesDividend?: string | number | null,
  ): string {
    let desc = "";
    if (per10SharesDividend && Number(per10SharesDividend) > 0) {
      desc += `每10股红利 ¥${per10SharesDividend}`;
    }
    if (per10SharesTransfer && Number(per10SharesTransfer) > 0) {
      if (desc) desc += "，";
      desc += `每10股转增 ${per10SharesTransfer} 股`;
    }
    if (per10SharesBonus && Number(per10SharesBonus) > 0) {
      if (desc) desc += "，";
      desc += `每10股送股 ${per10SharesBonus} 股`;
    }
    return desc || "除权除息";
  }

  /**
   * 格式化交易描述
   */
  static formatTransactionDescription(transaction: {
    type: TransactionType;
    shares: string | number | null;
    price: string | number | null;
    unitShares?: string | number | null;
    per10SharesTransfer?: string | number | null;
    per10SharesBonus?: string | number | null;
    per10SharesDividend?: string | number | null;
  }): string {
    const type = transaction.type;

    const shares = Math.floor(Number(transaction.shares ?? 0));
    const price = Number(transaction.price ?? 0).toFixed(3);
    const unitShares = Math.floor(Number(transaction.unitShares ?? 0));

    switch (type) {
      case TransactionType.BUY:
        return `买入 ${shares} 股，价格 ¥${price}`;
      case TransactionType.SELL:
        return `卖出 ${shares} 股，价格 ¥${price}`;
      case TransactionType.MERGE:
        return `${unitShares} 股合为 1 股`;
      case TransactionType.SPLIT:
        return `1 股拆为 ${unitShares} 股`;
      case TransactionType.DIVIDEND:
        return this.formatDividendDescription(
          transaction.per10SharesTransfer,
          transaction.per10SharesBonus,
          transaction.per10SharesDividend,
        );
      default:
        return "未知交易类型";
    }
  }

  /**
   * 为交易记录添加展示字段
   */
  static enrichTransactionData(transaction: any) {
    return {
      ...transaction,
      typeName: TransactionTypeNames[transaction.type as TransactionType] || "未知",
      description: this.formatTransactionDescription(transaction),
    };
  }

  /**
   * 验证交易ID格式
   */
  static validateTransactionId(id: string): { isValid: boolean; transactionId?: number; error?: string } {
    const transactionId = parseInt(id);
    if (isNaN(transactionId)) {
      return {
        isValid: false,
        error: "交易ID必须是有效的数字",
      };
    }
    return {
      isValid: true,
      transactionId,
    };
  }
}
