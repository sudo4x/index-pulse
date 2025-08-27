// 快速录入相关类型定义

export interface ResolvedStockInfo {
  symbol: string;
  name: string;
  success: boolean;
  error?: string;
}

export enum StockResolveErrorType {
  NAME_NOT_FOUND = "name_not_found", // 仅股票名称，但数据库中找不到
  SYMBOL_INVALID = "symbol_invalid", // 仅股票代码，但在线查询失败
  NAME_SYMBOL_MISMATCH = "name_symbol_mismatch", // 名称与代码不匹配
  NETWORK_ERROR = "network_error", // 网络查询失败
  MULTIPLE_MATCHES = "multiple_matches", // 股票名称找到多个匹配项
}

export interface StockResolveError {
  type: StockResolveErrorType;
  message: string;
  suggestions?: string[];
}

// 快速录入解析结果
export interface QuickEntryParseResult {
  line: number;
  success: boolean;
  data?: import("@/app/(main)/investment/portfolios/_components/transaction-form-types").TransactionFormData;
  error?: StockResolveError;
  rawText: string;
}

// 交易类型枚举
export enum QuickEntryTransactionType {
  BUY = "买入",
  SELL = "卖出",
  DIVIDEND = "除权除息",
  SPLIT = "拆股",
  MERGE = "合股",
}

// 快速录入的原始数据结构
export interface QuickEntryRawData {
  type: string;
  name?: string;
  symbol?: string;
  price?: number;
  shares?: number;
  dividend?: number;
  transferShares?: number;
  bonusShares?: number;
  unitShares?: number;
  comment?: string;
  date?: Date;
}

// 批量保存请求数据
export interface BulkTransactionRequest {
  portfolioId: string;
  transactions: import("@/app/(main)/investment/portfolios/_components/transaction-form-types").TransactionFormData[];
}

// 批量保存响应数据
export interface BulkTransactionResponse {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}
