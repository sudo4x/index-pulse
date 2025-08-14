import { z } from "zod";

import { TransactionType } from "@/types/investment";

const baseTransactionSchema = z.object({
  symbol: z.string().min(1, "请输入股票代码"),
  name: z.string().min(1, "请输入股票名称"),
  type: z.string(),
  transactionDate: z.date({ required_error: "请选择交易日期" }),
  comment: z.string().optional(),
});

const buySchema = baseTransactionSchema.extend({
  shares: z.number().positive("请输入正确的股数"),
  price: z.number().positive("请输入正确的价格"),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sellSchema = buySchema;

const mergeSchema = baseTransactionSchema.extend({
  unitShares: z.number().positive("请输入合股比例"),
});

const splitSchema = baseTransactionSchema.extend({
  unitShares: z.number().positive("请输入拆股比例"),
});

const dividendSchema = baseTransactionSchema.extend({
  per10SharesTransfer: z.number().min(0).optional(),
  per10SharesBonus: z.number().min(0).optional(),
  per10SharesDividend: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  taxType: z.enum(["amount", "rate"]).default("amount"),
});

export function getTransactionSchema(transactionType: TransactionType) {
  switch (transactionType) {
    case TransactionType.BUY:
    case TransactionType.SELL:
      return buySchema;
    case TransactionType.MERGE:
      return mergeSchema;
    case TransactionType.SPLIT:
      return splitSchema;
    case TransactionType.DIVIDEND:
      return dividendSchema;
    default:
      return baseTransactionSchema;
  }
}

export function getTransactionDefaultValues(transactionType: TransactionType) {
  const baseDefaults = {
    symbol: "",
    name: "",
    type: transactionType.toString(),
    transactionDate: new Date(),
    comment: "",
  };

  switch (transactionType) {
    case TransactionType.BUY:
    case TransactionType.SELL:
      return {
        ...baseDefaults,
        shares: 0,
        price: 0,
      };
    case TransactionType.MERGE:
    case TransactionType.SPLIT:
      return {
        ...baseDefaults,
        unitShares: 0,
      };
    case TransactionType.DIVIDEND:
      return {
        ...baseDefaults,
        per10SharesTransfer: 0,
        per10SharesBonus: 0,
        per10SharesDividend: 0,
        tax: 0,
        taxRate: 0,
        taxType: "amount" as const,
      };
    default:
      return baseDefaults;
  }
}
