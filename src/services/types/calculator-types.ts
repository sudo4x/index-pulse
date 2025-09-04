import { TransactionType } from "@/types/investment";

export interface SharesData {
  totalShares: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalDividend: number;
  buyCommission: number; // 买入佣金
  sellCommission: number; // 卖出佣金
  buyTax: number; // 买入税费（通常为0）
  sellTax: number; // 卖出税费（印花税等）
  otherFee: number; // 其他费用（如过户费等）
  buyShares: number;
  openTime: Date | null;
  liquidationTime: Date | null;
}

export interface ProfitLossData {
  profitAmount: number;
  profitRate: number;
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
  buyCommission: number;
  sellCommission: number;
  buyTax: number;
  sellTax: number;
  otherFee: number;
}

export interface TransactionRecord {
  type: TransactionType;
  shares: number | string | null;
  amount: number | string;
  commission?: number | string | null;
  tax?: number | string | null;
  transactionDate: Date;
  unitShares?: number | string | null;
  unitIncreaseShares?: number | string | null;
  unitDividend?: number | string | null;
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

export interface TransactionFees {
  buyCommission: number;
  sellCommission: number;
  buyTax: number;
  sellTax: number;
  otherFee: number;
}

export interface TransactionTimestamps {
  openTime: Date | null;
  liquidationTime: Date | null;
}
