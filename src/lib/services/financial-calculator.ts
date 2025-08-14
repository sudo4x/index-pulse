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
    // 持仓成本 = (总买入金额 + 佣金 + 税费) / (总买入股数 + 红股数量 + 拆股所增数量 - 合股所减数量)
    const totalCost = sharesData.totalBuyAmount + sharesData.totalCommission + sharesData.totalTax;
    const holdCost = sharesData.buyShares > 0 ? totalCost / sharesData.buyShares : 0;

    // 摊薄成本 = (总买入金额 + 佣金 + 税费 - 总卖出金额 - 总现金股息) / 总持股数
    const dilutedCost =
      sharesData.totalShares > 0
        ? (totalCost - sharesData.totalSellAmount - sharesData.totalDividend) / sharesData.totalShares
        : 0;

    const marketValue = sharesData.totalShares * parseFloat(String(currentPrice.currentPrice)) || 0;

    return { holdCost, dilutedCost, marketValue };
  }

  /**
   * 计算盈亏数据
   */
  static calculateProfitLoss(sharesData: SharesData, currentPrice: StockPrice, costs: CostsData): ProfitLossData {
    const currentPriceValue = parseFloat(String(currentPrice.currentPrice)) || 0;

    // 浮动盈亏 = (当前价 - 持仓成本) × 持股数
    const floatAmount = (currentPriceValue - costs.holdCost) * sharesData.totalShares;
    const floatRate = costs.holdCost > 0 ? floatAmount / (costs.holdCost * sharesData.totalShares) : 0;

    // 累计盈亏 = 多仓市值 - 总买入金额 - 总佣金 - 总税费 + 总卖出金额 + 总现金股息
    const totalCost = sharesData.totalBuyAmount + sharesData.totalCommission + sharesData.totalTax;
    const accumAmount = costs.marketValue - totalCost + sharesData.totalSellAmount + sharesData.totalDividend;
    const accumRate = totalCost > 0 ? accumAmount / totalCost : 0;

    // 当日盈亏 = 涨跌额 × 持股数
    const dayFloatAmount = currentPrice.change * sharesData.totalShares;
    const dayFloatRate =
      currentPrice.currentPrice > 0
        ? dayFloatAmount / ((currentPrice.currentPrice - currentPrice.change) * sharesData.totalShares)
        : 0;

    return { floatAmount, floatRate, accumAmount, accumRate, dayFloatAmount, dayFloatRate };
  }
}
