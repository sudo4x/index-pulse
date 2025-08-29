import { parseDecimal } from "@/lib/db/decimal-utils";
import { HoldingDetail, TransactionType } from "@/types/investment";

import { TransactionFormData } from "./transaction-form-types";

// Helper functions to create form data from transaction
export const createBasicFormData = (transaction: any) => ({
  symbol: transaction.symbol ?? "",
  name: transaction.name ?? "",
  type: transaction.type?.toString() ?? "1",
  transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : new Date(),
  comment: transaction.comment ?? "",
});

export const createTransactionAmounts = (transaction: any) => ({
  shares: parseDecimal(transaction.shares),
  price: parseDecimal(transaction.price),
  commission: parseDecimal(transaction.commission),
  tax: parseDecimal(transaction.tax),
});

export const createUnitData = (transaction: any) => ({
  unitShares: parseDecimal(transaction.unitShares),
  unitDividend: parseDecimal(transaction.unitDividend),
  unitIncreaseShares: parseDecimal(transaction.unitIncreaseShares),
  recordDate: transaction.recordDate ? new Date(transaction.recordDate) : null,
});

export const createFormDataFromTransaction = (transaction: any) => {
  const baseData = createBasicFormData(transaction);
  const transactionType = Number(transaction.type);

  // 根据交易类型返回对应的字段
  switch (transactionType) {
    case TransactionType.BUY:
    case TransactionType.SELL:
      return {
        ...baseData,
        ...createTransactionAmounts(transaction),
      };
    case TransactionType.MERGE:
    case TransactionType.SPLIT:
      return {
        ...baseData,
        unitShares: parseDecimal(transaction.unitShares),
      };
    case TransactionType.DIVIDEND:
      return {
        ...baseData,
        per10SharesTransfer: parseDecimal(transaction.per10SharesTransfer),
        per10SharesBonus: parseDecimal(transaction.per10SharesBonus),
        per10SharesDividend: parseDecimal(transaction.per10SharesDividend),
        tax: parseDecimal(transaction.tax),
      };
    default:
      return baseData;
  }
};

// Helper function to get dialog title
export const getDialogTitle = (editingTransaction: any, selectedHolding: HoldingDetail | null | undefined) => {
  if (editingTransaction) return "编辑交易记录";
  if (selectedHolding) return `${selectedHolding.name} - 添加交易`;
  return "添加持仓品种";
};

// Helper function to get initial transaction type
export const getInitialTransactionType = (defaultType?: "buy" | "sell") => {
  if (defaultType === "buy") return TransactionType.BUY;
  if (defaultType === "sell") return TransactionType.SELL;
  return TransactionType.BUY;
};

// Helper function to create submit payload
export const createSubmitPayload = (
  portfolioId: string,
  data: TransactionFormData,
  transactionType: TransactionType,
) => ({
  portfolioId,
  ...data,
  type: transactionType,
  symbol: data.symbol.toUpperCase(),
});
