import { TransactionType } from "@/types/investment";

export interface SharesData {
  totalShares: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalDividend: number;
  totalCommission: number; // 总佣金
  totalTax: number; // 总税费
  buyShares: number;
  openTime: Date | null;
  liquidationTime: Date | null;
}

export interface CostsData {
  holdCost: number;
  dilutedCost: number;
  marketValue: number;
}

export interface ProfitLossData {
  floatAmount: number;
  floatRate: number;
  accumAmount: number;
  accumRate: number;
  dayFloatAmount: number;
  dayFloatRate: number;
}

export interface StockPrice {
  currentPrice: number;
  change: number;
  changePercent: number;
}

export interface CashData {
  cash: number;
  principal: number;
}

export interface TransactionData {
  totalShares: number;
  buyShares: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalDividend: number;
  totalCommission: number;
  totalTax: number;
}

export interface TransactionRecord {
  type: TransactionType;
  shares: number | string | null;
  amount: number | string;
  commission?: number | string | null;
  tax?: number | string | null;
  transactionDate: Date;
  unitShares?: number | string | null;
  per10SharesTransfer?: number | string | null;
  per10SharesBonus?: number | string | null;
  per10SharesDividend?: number | string | null;
}
