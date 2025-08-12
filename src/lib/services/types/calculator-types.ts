import { TransactionType } from "@/types/investment";

export interface SharesData {
  totalShares: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalDividend: number;
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
}

export interface TransactionRecord {
  type: TransactionType;
  shares: number | string | null;
  amount: number | string;
  transactionDate: Date;
  unitShares?: number | string | null;
  unitDividend?: number | string | null;
  unitIncreaseShares?: number | string | null;
}
