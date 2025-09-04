import { TransactionType } from "@/types/investment";
import { getStockType, StockType } from "@/utils/stock-type-utils";

/**
 * 股票类型和交易所信息
 */
export interface StockInfo {
  isETF: boolean; // 是否为ETF
  exchange: "SH" | "SZ" | "HK" | "US"; // 交易所
}

/**
 * 费用计算器配置
 */
export interface CommissionConfig {
  stockCommissionRate: number; // 个股佣金费率
  stockCommissionMinAmount: number; // 个股最低佣金
  etfCommissionRate: number; // ETF佣金费率
  etfCommissionMinAmount: number; // ETF最低佣金
}

/**
 * 费用计算结果
 */
export interface FeeCalculationResult {
  commission: number; // 佣金
  stampTax: number; // 印花税
  transferFee: number; // 过户费
  totalFee: number; // 总费用
  description: string; // 费用明细说明
}

/**
 * 费用计算器
 * 根据交易信息自动计算佣金、印花税、过户费等各项费用
 */
export class FeeCalculator {
  /**
   * 计算交易费用（新版本，支持个股和ETF分别配置）
   */
  static calculateFees(
    symbol: string,
    transactionType: TransactionType,
    amount: number,
    commissionConfig: CommissionConfig,
  ): FeeCalculationResult {
    const stockType = getStockType(symbol);
    const stockInfo = this.getStockInfo(symbol);

    // 根据股票类型选择佣金配置
    const commissionRate =
      stockType === StockType.ETF ? commissionConfig.etfCommissionRate : commissionConfig.stockCommissionRate;
    const commissionMinAmount =
      stockType === StockType.ETF ? commissionConfig.etfCommissionMinAmount : commissionConfig.stockCommissionMinAmount;

    // 计算各项费用
    const commission = this.calculateCommission(amount, commissionRate, commissionMinAmount);
    const stampTax = this.calculateStampTax(amount, transactionType, stockInfo);
    const transferFee = this.calculateTransferFee(amount, stockInfo);

    const totalFee = commission + stampTax + transferFee;

    // 生成费用明细说明
    const description = this.generateFeeDescription(commission, stampTax, transferFee, stockInfo);

    return {
      commission,
      stampTax,
      transferFee,
      totalFee,
      description,
    };
  }

  /**
   * 计算佣金
   * 佣金 = max(成交金额 × 佣金率, 最低佣金)
   */
  static calculateCommission(amount: number, rate: number, minAmount: number): number {
    const calculatedCommission = amount * rate;
    return Math.max(calculatedCommission, minAmount);
  }

  /**
   * 计算印花税
   * 卖出时收取0.05%，个股收取，ETF不收取
   */
  static calculateStampTax(amount: number, transactionType: TransactionType, stockInfo: StockInfo): number {
    // 只有卖出时收取印花税
    if (transactionType !== TransactionType.SELL) {
      return 0;
    }

    // ETF不收取印花税
    if (stockInfo.isETF) {
      return 0;
    }

    // 个股卖出收取0.05%
    return amount * 0.0005;
  }

  /**
   * 计算过户费
   * 只有个股收取过户费，ETF不收取
   * 沪市（60/68开头）：成交金额的0.01‰（双向）
   * 深市（00/30开头）：无单独过户费
   */
  static calculateTransferFee(amount: number, stockInfo: StockInfo): number {
    // ETF不收取过户费
    if (stockInfo.isETF) {
      return 0;
    }

    // 只有沪市个股收取过户费
    if (stockInfo.exchange === "SH") {
      return amount * 0.00001; // 0.01‰
    }

    return 0;
  }

  /**
   * 获取股票信息（类型和交易所）
   */
  static getStockInfo(symbol: string): StockInfo {
    const stockType = getStockType(symbol);
    const isETF = stockType === StockType.ETF;

    // 统一处理，去掉可能的市场前缀
    const cleanSymbol = symbol.replace(/^(SH|SZ|HK|US)/, "");

    // 确定交易所
    let exchange: "SH" | "SZ" | "HK" | "US" = "US"; // 默认美股

    if (this.isAShareStock(cleanSymbol) || this.isAShareETF(cleanSymbol)) {
      exchange = this.getAShareExchange(cleanSymbol);
    } else if (this.isHKStock(cleanSymbol) || this.isHKETF(cleanSymbol)) {
      exchange = "HK";
    }

    return { isETF, exchange };
  }

  /**
   * 判断是否为A股ETF
   */
  private static isAShareETF(symbol: string): boolean {
    return /^(51|15|588|159|50|16)/.test(symbol);
  }

  /**
   * 判断是否为港股ETF
   */
  private static isHKETF(symbol: string): boolean {
    return /^(03|08)/.test(symbol) && symbol.length === 5;
  }

  /**
   * 判断是否为美股ETF（简单实现）
   */
  private static isUSETF(symbol: string): boolean {
    // 美股ETF通常以字母开头，这里简单判断
    // 实际应用中可能需要维护ETF列表
    return /^[A-Z]{3,4}$/.test(symbol) && ["SPY", "QQQ", "VTI", "VOO", "IVV"].includes(symbol);
  }

  /**
   * 判断是否为A股个股
   */
  private static isAShareStock(symbol: string): boolean {
    return /^(60|68|00|30|688|8)/.test(symbol);
  }

  /**
   * 判断是否为港股个股
   */
  private static isHKStock(symbol: string): boolean {
    return /^\d{5}$/.test(symbol) && !this.isHKETF(symbol);
  }

  /**
   * 获取A股交易所
   */
  private static getAShareExchange(symbol: string): "SH" | "SZ" {
    // 沪市：60、68、688开头
    if (/^(60|68|688|51|50)/.test(symbol)) {
      return "SH";
    }
    // 深市：00、30、15、159、16开头
    return "SZ";
  }

  /**
   * 生成费用明细说明
   */
  private static generateFeeDescription(
    commission: number,
    stampTax: number,
    transferFee: number,
    stockInfo: StockInfo,
  ): string {
    const parts: string[] = [];

    if (commission > 0) {
      parts.push(`佣金: ${commission.toFixed(2)}元`);
    }

    if (stampTax > 0) {
      parts.push(`印花税: ${stampTax.toFixed(2)}元`);
    }

    if (transferFee > 0) {
      parts.push(`过户费: ${transferFee.toFixed(2)}元`);
    }

    const typeDesc = stockInfo.isETF ? "ETF" : "个股";
    const exchangeDesc = this.getExchangeDescription(stockInfo.exchange);

    return `${exchangeDesc}${typeDesc} - ${parts.join("，")}`;
  }

  /**
   * 获取交易所描述
   */
  private static getExchangeDescription(exchange: "SH" | "SZ" | "HK" | "US"): string {
    switch (exchange) {
      case "SH":
        return "沪市";
      case "SZ":
        return "深市";
      case "HK":
        return "港股";
      case "US":
        return "美股";
      default:
        return "";
    }
  }
}
