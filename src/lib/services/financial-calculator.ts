import { SharesData, ProfitLossData, StockPrice, EnhancedSharesData } from "./types/calculator-types";

/**
 * 财务计算器
 * 负责计算成本、盈亏等财务指标
 */
export class FinancialCalculator {
  /**
   * 计算成本相关数据
   */
  static calculateCosts(sharesData: SharesData): { holdCost: number; dilutedCost: number } {
    // 持仓成本 = (总买入金额 + 买入佣金) / (总买入股数 + 红股数量 + 拆股所增数量 - 合股所减数量)
    const totalBuyCost = sharesData.totalBuyAmount + sharesData.buyCommission;
    const holdCost = sharesData.buyShares > 0 ? totalBuyCost / sharesData.buyShares : 0;

    // 摊薄成本 = (总买入金额 + 所有佣金 + 所有税费 - 总卖出金额 - 总现金股息) / 总持股数
    const totalCost =
      sharesData.totalBuyAmount +
      sharesData.buyCommission +
      sharesData.sellCommission +
      sharesData.buyTax +
      sharesData.sellTax +
      sharesData.otherTax;
    const dilutedCost =
      sharesData.totalShares > 0
        ? (totalCost - sharesData.totalSellAmount - sharesData.totalDividend) / sharesData.totalShares
        : 0;

    return { holdCost, dilutedCost };
  }

  /**
   * 计算市值
   */
  static calculateMarketValue(shares: number, currentPrice: number): number {
    return shares * currentPrice;
  }

  /**
   * 基于 holdings 表数据计算成本（直接使用数据库中的汇总数据）
   */
  static calculateCostsFromHoldings(holdingData: {
    shares: number;
    totalBuyAmount: number;
    totalSellAmount: number;
    totalDividend: number;
    buyCommission: number;
    sellCommission: number;
    buyTax: number;
    sellTax: number;
    otherTax: number;
  }): { holdCost: number; dilutedCost: number } {
    // 持仓成本 = (总买入金额 + 买入佣金) / 持股数（这里简化使用当前持股数）
    // ∑买入金额 = 总买入金额 + 总佣金
    const totalBuyCost = holdingData.totalBuyAmount + holdingData.buyCommission;
    const holdCost = holdingData.shares > 0 ? totalBuyCost / holdingData.shares : 0;

    // 摊薄成本 = (总买入金额 + 所有佣金 + 所有税费 - 总卖出金额 - 总现金股息) / 持股数
    const totalCost =
      holdingData.totalBuyAmount +
      holdingData.buyCommission +
      holdingData.sellCommission +
      holdingData.buyTax +
      holdingData.sellTax +
      holdingData.otherTax;
    const dilutedCost =
      holdingData.shares > 0
        ? (totalCost - holdingData.totalSellAmount - holdingData.totalDividend) / holdingData.shares
        : 0;

    return { holdCost, dilutedCost };
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
      otherTax: number;
    },
    currentPrice: StockPrice,
    holdCost: number,
    dilutedCost: number,
    marketValue: number,
  ): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;

    // 浮动盈亏 = (当前价 - 持仓成本) × 持股数
    const floatAmount = (currentPriceValue - holdCost) * holdingData.shares;
    const floatRate = holdCost > 0 ? floatAmount / (holdCost * holdingData.shares) : 0;

    // 累计盈亏率 ＝ 累计盈亏额 / ∑买入金额
    // ∑买入金额 = 总买入金额 + 总佣金
    const totalBuyCost = holdingData.totalBuyAmount + holdingData.buyCommission;

    // 累计盈亏 = 多仓市值 - 总买入金额 - 所有佣金 - 所有税费 + 总卖出金额 + 总现金股息
    const totalCost =
      holdingData.totalBuyAmount +
      holdingData.buyCommission +
      holdingData.sellCommission +
      holdingData.buyTax +
      holdingData.sellTax +
      holdingData.otherTax;

    const accumAmount = marketValue - totalCost + holdingData.totalSellAmount + holdingData.totalDividend;
    const accumRate = totalBuyCost > 0 ? accumAmount / totalBuyCost : 0;

    // 当日盈亏计算（简化版本，不支持精确的昨日市值算法）
    const dayFloatAmount = currentPrice.change * holdingData.shares;
    const dayFloatRate =
      currentPrice.currentPrice > 0
        ? dayFloatAmount / ((currentPrice.currentPrice - currentPrice.change) * holdingData.shares)
        : 0;

    return { floatAmount, floatRate, accumAmount, accumRate, dayFloatAmount, dayFloatRate };
  }

  /**
   * 计算盈亏数据（基础版本）
   */
  static calculateProfitLoss(
    sharesData: SharesData,
    currentPrice: StockPrice,
    holdCost: number,
    dilutedCost: number,
    marketValue: number,
  ): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;

    // 浮动盈亏 = (当前价 - 持仓成本) × 持股数
    const floatAmount = (currentPriceValue - holdCost) * sharesData.totalShares;
    const floatRate = holdCost > 0 ? floatAmount / (holdCost * sharesData.totalShares) : 0;

    // 累计盈亏 = 多仓市值 - 总买入金额 - 所有佣金 - 所有税费 + 总卖出金额 + 总现金股息
    const totalCost =
      sharesData.totalBuyAmount +
      sharesData.buyCommission +
      sharesData.sellCommission +
      sharesData.buyTax +
      sharesData.sellTax +
      sharesData.otherTax;
    const accumAmount = marketValue - totalCost + sharesData.totalSellAmount + sharesData.totalDividend;
    const accumRate = totalCost > 0 ? accumAmount / totalCost : 0;

    // 当日盈亏计算
    const { dayFloatAmount, dayFloatRate } = this.calculateDayProfitLoss(
      sharesData as EnhancedSharesData,
      currentPrice,
      holdCost,
      marketValue,
    );

    return { floatAmount, floatRate, accumAmount, accumRate, dayFloatAmount, dayFloatRate };
  }

  /**
   * 计算盈亏数据（增强版本，支持精确当日盈亏）
   */
  static calculateEnhancedProfitLoss(
    sharesData: EnhancedSharesData,
    currentPrice: StockPrice,
    holdCost: number,
    dilutedCost: number,
    marketValue: number,
  ): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;

    // 浮动盈亏 = (当前价 - 持仓成本) × 持股数
    const floatAmount = (currentPriceValue - holdCost) * sharesData.totalShares;
    const floatRate = holdCost > 0 ? floatAmount / (holdCost * sharesData.totalShares) : 0;

    // 累计盈亏 = 多仓市值 - 总买入金额 - 所有佣金 - 所有税费 + 总卖出金额 + 总现金股息
    const totalCost =
      sharesData.totalBuyAmount +
      sharesData.buyCommission +
      sharesData.sellCommission +
      sharesData.buyTax +
      sharesData.sellTax +
      sharesData.otherTax;
    const accumAmount = marketValue - totalCost + sharesData.totalSellAmount + sharesData.totalDividend;
    const accumRate = totalCost > 0 ? accumAmount / totalCost : 0;

    // 精确当日盈亏计算
    const { dayFloatAmount, dayFloatRate } = this.calculateDayProfitLoss(
      sharesData,
      currentPrice,
      holdCost,
      marketValue,
    );

    return { floatAmount, floatRate, accumAmount, accumRate, dayFloatAmount, dayFloatRate };
  }

  /**
   * 计算当日盈亏（根据是否有昨日市值采用不同算法）
   */
  private static calculateDayProfitLoss(
    sharesData: EnhancedSharesData,
    currentPrice: StockPrice,
    holdCost: number,
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
      // 当日盈亏额 = (现价 - 持仓成本) * 股数 + 当日∑卖出 - 当日∑买入
      const dayFloatAmount = (currentPriceValue - holdCost) * sharesData.totalShares + todaySellAmount - todayBuyAmount;

      // 当日盈亏率 = 当日盈亏额 / 当日∑买入
      const dayFloatRate = todayBuyAmount > 0 ? dayFloatAmount / todayBuyAmount : 0;

      return { dayFloatAmount, dayFloatRate };
    }
  }
}
