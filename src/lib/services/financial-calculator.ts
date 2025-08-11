import { SharesData, CostsData, ProfitLossData, StockPrice } from "./types/calculator-types";

/**
 * 财务计算器
 * 负责计算成本、盈亏等财务指标
 */
export class FinancialCalculator {
  /**
   * 计算成本相关数据
   */
  static calculateCosts(sharesData: SharesData, currentPrice: StockPrice): CostsData {
    const holdCost = sharesData.buyShares > 0 ? sharesData.totalBuyAmount / sharesData.buyShares : 0;
    const dilutedCost =
      sharesData.totalShares > 0
        ? (sharesData.totalBuyAmount - sharesData.totalSellAmount - sharesData.totalDividend) / sharesData.totalShares
        : 0;
    const marketValue = sharesData.totalShares * parseFloat(String(currentPrice.currentPrice)) || 0;

    return { holdCost, dilutedCost, marketValue };
  }

  /**
   * 计算盈亏数据
   */
  static calculateProfitLoss(sharesData: SharesData, currentPrice: StockPrice, costs: CostsData): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;
    const floatAmount = (currentPriceValue - costs.holdCost) * sharesData.totalShares;
    const floatRate = costs.holdCost > 0 ? floatAmount / (costs.holdCost * sharesData.totalShares) : 0;

    const accumAmount =
      costs.marketValue - sharesData.totalBuyAmount + sharesData.totalSellAmount + sharesData.totalDividend;
    const accumRate = sharesData.totalBuyAmount > 0 ? accumAmount / sharesData.totalBuyAmount : 0;

    const dayFloatAmount = currentPrice.change * sharesData.totalShares;
    const dayFloatRate =
      currentPrice.currentPrice > 0
        ? dayFloatAmount / ((currentPrice.currentPrice - currentPrice.change) * sharesData.totalShares)
        : 0;

    return { floatAmount, floatRate, accumAmount, accumRate, dayFloatAmount, dayFloatRate };
  }
}
