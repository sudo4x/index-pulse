import { HoldingDetail, TransactionType } from "@/types/investment";

import { TransactionFormData } from "./transaction-form-types";

// Helper functions to create form data from transaction
export const createBasicFormData = (transaction: any) => ({
  symbol: transaction.symbol ?? "",
  name: transaction.name ?? "",
  transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : new Date(),
  comment: transaction.comment ?? "",
});

export const createTransactionAmounts = (transaction: any) => ({
  shares: transaction.shares ?? 0,
  price: transaction.price ?? 0,
  commission: transaction.commission ?? 0,
  tax: transaction.tax ?? 0,
});

export const createUnitData = (transaction: any) => ({
  unitShares: transaction.unitShares ?? 0,
  unitDividend: transaction.unitDividend ?? 0,
  unitIncreaseShares: transaction.unitIncreaseShares ?? 0,
  recordDate: transaction.recordDate ? new Date(transaction.recordDate) : null,
});

export const createFormDataFromTransaction = (transaction: any) => ({
  ...createBasicFormData(transaction),
  ...createTransactionAmounts(transaction),
  ...createUnitData(transaction),
});

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
