import { UseFormReturn } from "react-hook-form";

// 基础交易表单数据
export interface BaseTransactionFormData {
  symbol: string;
  name: string;
  type: string;
  transactionDate: Date;
  comment?: string;
}

// 买入/卖出表单数据
export interface BuySellFormData extends BaseTransactionFormData {
  shares: number;
  price: number;
}

// 合股/拆股表单数据
export interface MergeSplitFormData extends BaseTransactionFormData {
  unitShares: number;
}

// 股息分红表单数据
export interface DividendFormData extends BaseTransactionFormData {
  per10SharesTransfer?: number;
  per10SharesBonus?: number;
  per10SharesDividend?: number;
  tax?: number;
  taxRate?: number;
  taxType: "amount" | "rate";
}

// 联合类型：所有可能的表单数据
export type TransactionFormData = BuySellFormData | MergeSplitFormData | DividendFormData;

// 表单控制器类型 - 使用泛型以支持具体类型
export type BuySellForm = UseFormReturn<BuySellFormData>;
export type MergeSplitForm = UseFormReturn<MergeSplitFormData>;
export type DividendForm = UseFormReturn<DividendFormData>;
export type TransactionForm = UseFormReturn<TransactionFormData>;
