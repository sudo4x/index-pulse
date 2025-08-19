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

export interface ProfitLossData {
  floatAmount: number;
  floatRate: number;
  accumAmount: number;
  accumRate: number;
  dayFloatAmount: number;
  dayFloatRate: number;
}

export interface StockPrice {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  previousClose: number;
  limitUp: string;
  limitDown: string;
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

export interface DayTradingData {
  todayBuyAmount: number; // 当日买入金额
  todaySellAmount: number; // 当日卖出金额
  todayBuyShares: number; // 当日买入股数
  todaySellShares: number; // 当日卖出股数
  yesterdayShares: number; // 昨日持股数
  yesterdayMarketValue: number; // 昨日市值
}

export interface EnhancedSharesData extends SharesData {
  dayTradingData?: DayTradingData;
}
