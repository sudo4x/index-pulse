// 交易类型枚举
export enum TransactionType {
  BUY = 1,           // 买入
  SELL = 2,          // 卖出
  MERGE = 3,         // 合股
  SPLIT = 4,         // 拆股
  DIVIDEND = 9,      // 除权除息
}

// 转账类型枚举
export enum TransferType {
  DEPOSIT = 1,       // 转入
  WITHDRAW = 2,      // 转出
}

// 交易类型名称映射
export const TransactionTypeNames: Record<TransactionType, string> = {
  [TransactionType.BUY]: "买入",
  [TransactionType.SELL]: "卖出", 
  [TransactionType.MERGE]: "合股",
  [TransactionType.SPLIT]: "拆股",
  [TransactionType.DIVIDEND]: "除权除息",
};

// 转账类型名称映射
export const TransferTypeNames: Record<TransferType, string> = {
  [TransferType.DEPOSIT]: "转入",
  [TransferType.WITHDRAW]: "转出",
};

// 组合概况数据接口
export interface PortfolioOverview {
  portfolioId: string;
  name: string;
  totalAssets: number;        // 总资产
  marketValue: number;        // 总市值
  cash: number;              // 现金
  principal: number;         // 本金
  floatAmount: number;       // 浮动盈亏额
  floatRate: number;         // 浮动盈亏率
  accumAmount: number;       // 累计盈亏额
  accumRate: number;         // 累计盈亏率
  dayFloatAmount: number;    // 当日盈亏额
  dayFloatRate: number;      // 当日盈亏率
}

// 持仓详情接口
export interface HoldingDetail {
  id: string;
  symbol: string;            // 股票代码
  name: string;             // 股票名称
  shares: number;           // 持股数
  currentPrice: number;     // 现价
  change: number;           // 涨跌额
  changePercent: number;    // 涨跌幅
  marketValue: number;      // 市值
  dilutedCost: number;     // 摊薄成本
  holdCost: number;        // 持仓成本
  floatAmount: number;     // 浮动盈亏额
  floatRate: number;       // 浮动盈亏率
  accumAmount: number;     // 累计盈亏额
  accumRate: number;       // 累计盈亏率
  dayFloatAmount: number;  // 当日盈亏额
  dayFloatRate: number;    // 当日盈亏率
  isActive: boolean;       // 是否活跃持仓
  openTime: string;        // 开仓时间
  liquidationTime?: string; // 清仓时间
}

// 交易记录详情接口
export interface TransactionDetail {
  id: string;
  symbol: string;
  name: string;
  type: TransactionType;
  typeName: string;
  transactionDate: string;
  shares?: number;
  price?: number;
  amount: number;
  commission?: number;
  commissionRate?: number;
  tax?: number;
  taxRate?: number;
  unitShares?: number;      // 合股拆股相关
  unitDividend?: number;    // 每股股息
  unitIncreaseShares?: number; // 每股转增股数
  recordDate?: string;      // 股权登记日
  comment?: string;
  description: string;      // 描述信息
}

// 转账记录详情接口
export interface TransferDetail {
  id: string;
  type: TransferType;
  typeName: string;
  amount: number;
  transferDate: string;
  comment?: string;
}

// 股票实时行情接口
export interface StockQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume?: number;
  turnover?: number;
  marketValue?: number;
  lastUpdated: string;
}

// 交易表单数据接口
export interface TransactionFormData {
  portfolioId: string;
  symbol: string;
  name: string;
  type: TransactionType;
  transactionDate: string;
  // 买入/卖出特有字段
  shares?: number;
  price?: number;
  commission?: number;
  commissionRate?: number;
  tax?: number;
  taxRate?: number;
  // 合股/拆股特有字段
  unitShares?: number;
  // 除权除息特有字段
  unitDividend?: number;
  unitIncreaseShares?: number;
  recordDate?: string;
  // 通用字段
  comment?: string;
}

// 转账表单数据接口
export interface TransferFormData {
  portfolioId: string;
  type: TransferType;
  amount: number;
  transferDate: string;
  comment?: string;
}