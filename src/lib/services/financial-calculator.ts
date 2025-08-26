import { SharesData, ProfitLossData, StockPrice, EnhancedSharesData } from "./types/calculator-types";

/**
 * 财务计算器
 * 负责计算成本、盈亏等财务指标
 */
export class FinancialCalculator {
  /**
   * 计算统一成本价
   * 新算法：成本 = (总买入金额 - 总卖出金额 + 总佣金 + 总税费 + 总其他费用 - 总分红) / 持股数
   */
  static calculateCost(allHistoryData: SharesData, currentShares: number): number {
    const totalCost =
      allHistoryData.totalBuyAmount -
      allHistoryData.totalSellAmount +
      allHistoryData.buyCommission +
      allHistoryData.sellCommission +
      allHistoryData.buyTax +
      allHistoryData.sellTax +
      allHistoryData.otherFee -
      allHistoryData.totalDividend;

    return currentShares > 0 ? totalCost / currentShares : 0;
  }

  /**
   * 计算市值
   */
  static calculateMarketValue(shares: number, currentPrice: number): number {
    return shares * currentPrice;
  }

  /**
   * 基于 holdings 表数据计算统一成本价（直接使用数据库中的汇总数据）
   */
  static calculateCostFromHoldings(holdingData: {
    shares: number;
    totalBuyAmount: number;
    totalSellAmount: number;
    totalDividend: number;
    buyCommission: number;
    sellCommission: number;
    buyTax: number;
    sellTax: number;
    otherFee: number;
  }): number {
    // 新算法：成本 = (总买入金额 - 总卖出金额 + 总佣金 + 总税费 + 总其他费用 - 总分红) / 持股数
    const totalCost =
      holdingData.totalBuyAmount -
      holdingData.totalSellAmount +
      holdingData.buyCommission +
      holdingData.sellCommission +
      holdingData.buyTax +
      holdingData.sellTax +
      holdingData.otherFee -
      holdingData.totalDividend;

    return holdingData.shares > 0 ? totalCost / holdingData.shares : 0;
  }

  /**
   * 基于 holdings 数据计算盈亏（使用数据库汇总数据，性能更高）
   */
  static calculateProfitLossFromHoldings(
    holdingData: {
      shares: number;
      totalBuyAmount: number;
      totalSellAmount: number;
      totalDividend: number;
      buyCommission: number;
      sellCommission: number;
      buyTax: number;
      sellTax: number;
      otherFee: number;
    },
    currentPrice: StockPrice,
    cost: number,
    marketValue: number,
  ): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;

    // 新算法：盈亏额 = (现价-成本) * 持仓数量
    const profitAmount = (currentPriceValue - cost) * holdingData.shares;
    // 新算法：盈亏率 = (现价-成本) / 成本
    const profitRate = cost > 0 ? (currentPriceValue - cost) / cost : 0;

    // 当日盈亏计算（简化版本，不支持精确的昨日市值算法）
    const dayFloatAmount = currentPrice.change * holdingData.shares;
    const dayFloatRate =
      currentPrice.currentPrice > 0
        ? dayFloatAmount / ((currentPrice.currentPrice - currentPrice.change) * holdingData.shares)
        : 0;

    return { profitAmount, profitRate, dayFloatAmount, dayFloatRate };
  }

  /**
   * 计算盈亏数据（基础版本）
   */
  static calculateProfitLoss(
    sharesData: SharesData,
    currentPrice: StockPrice,
    cost: number,
    marketValue: number,
  ): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;

    // 新算法：盈亏额 = (现价-成本) * 持仓数量
    const profitAmount = (currentPriceValue - cost) * sharesData.totalShares;
    // 新算法：盈亏率 = (现价-成本) / 成本
    const profitRate = cost > 0 ? (currentPriceValue - cost) / cost : 0;

    // 当日盈亏计算
    const { dayFloatAmount, dayFloatRate } = this.calculateDayProfitLoss(
      sharesData as EnhancedSharesData,
      currentPrice,
      cost,
      marketValue,
    );

    return { profitAmount, profitRate, dayFloatAmount, dayFloatRate };
  }

  /**
   * 计算盈亏数据（增强版本，支持精确当日盈亏）
   */
  static calculateEnhancedProfitLoss(
    sharesData: EnhancedSharesData,
    currentPrice: StockPrice,
    cost: number,
    marketValue: number,
  ): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;

    // 新算法：盈亏额 = (现价-成本) * 持仓数量
    const profitAmount = (currentPriceValue - cost) * sharesData.totalShares;
    // 新算法：盈亏率 = (现价-成本) / 成本
    const profitRate = cost > 0 ? (currentPriceValue - cost) / cost : 0;

    // 精确当日盈亏计算
    const { dayFloatAmount, dayFloatRate } = this.calculateDayProfitLoss(sharesData, currentPrice, cost, marketValue);

    return { profitAmount, profitRate, dayFloatAmount, dayFloatRate };
  }

  /**
   * 计算当日盈亏（根据是否有昨日市值采用不同算法）
   */
  private static calculateDayProfitLoss(
    sharesData: EnhancedSharesData,
    currentPrice: StockPrice,
    cost: number,
    marketValue: number,
  ): { dayFloatAmount: number; dayFloatRate: number } {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;
    const dayTradingData = sharesData.dayTradingData;

    // 如果没有当日交易数据，使用简单算法
    if (!dayTradingData) {
      const dayFloatAmount = currentPrice.change * sharesData.totalShares;
      const dayFloatRate =
        currentPrice.currentPrice > 0
          ? dayFloatAmount / ((currentPrice.currentPrice - currentPrice.change) * sharesData.totalShares)
          : 0;
      return { dayFloatAmount, dayFloatRate };
    }

    const { yesterdayMarketValue, yesterdayShares, todayBuyAmount, todaySellAmount } = dayTradingData;

    if (yesterdayMarketValue > 0) {
      // 昨日市值 > 0 的情况
      // 当日盈亏额 = (现市值 - 昨收市值 + 当日∑卖出 - 当日∑买入)
      const yesterdayClosePrice = currentPriceValue - currentPrice.change;
      const yesterdayCloseMarketValue = yesterdayShares * yesterdayClosePrice;

      const dayFloatAmount = marketValue - yesterdayCloseMarketValue + todaySellAmount - todayBuyAmount;

      // 当日盈亏率 = 当日盈亏额 / (昨市值 + 当日∑买入)
      const denominator = yesterdayMarketValue + todayBuyAmount;
      const dayFloatRate = denominator > 0 ? dayFloatAmount / denominator : 0;

      return { dayFloatAmount, dayFloatRate };
    } else {
      // 昨日市值 = 0 的情况（当日新开仓）
      // 当日盈亏额 = (现价 - 成本) * 股数 + 当日∑卖出 - 当日∑买入
      const dayFloatAmount = (currentPriceValue - cost) * sharesData.totalShares + todaySellAmount - todayBuyAmount;

      // 当日盈亏率 = 当日盈亏额 / 当日∑买入
      const dayFloatRate = todayBuyAmount > 0 ? dayFloatAmount / todayBuyAmount : 0;

      return { dayFloatAmount, dayFloatRate };
    }
  }
}
