#!/usr/bin/env node

/**
 * 测试新的 holdings 计算逻辑
 */

import { FinancialCalculator } from "../src/lib/services/financial-calculator.ts";

// 模拟持仓数据
const mockHoldingData = {
  shares: 1000, // 1000股
  totalBuyAmount: 10000, // 买入金额 10000元
  totalSellAmount: 2000, // 卖出金额 2000元
  totalDividend: 100, // 红利 100元
  buyCommission: 10, // 买入佣金 10元
  sellCommission: 5, // 卖出佣金 5元
  buyTax: 0, // 买入税费 0元（买入通常无税费）
  sellTax: 3, // 卖出税费 3元（印花税等）
  otherTax: 2, // 其他税费 2元（除权除息等）
};

// 模拟股价数据
const mockCurrentPrice = {
  currentPrice: 12.5, // 当前价 12.5元
  change: 0.5, // 涨跌 +0.5元
  changePercent: 4.17, // 涨跌幅 +4.17%
};

console.log("=== 测试基于 Holdings 数据的计算逻辑 ===");
console.log("持仓数据:", mockHoldingData);
console.log("当前价格:", mockCurrentPrice);
console.log("");

try {
  // 1. 测试成本计算
  const costs = FinancialCalculator.calculateCostsFromHoldings(mockHoldingData);
  console.log("1. 成本计算结果:");
  console.log("   持仓成本:", costs.holdCost.toFixed(4), "元/股");
  console.log("   摊薄成本:", costs.dilutedCost.toFixed(4), "元/股");
  console.log("");

  // 2. 测试市值计算
  const marketValue = FinancialCalculator.calculateMarketValue(mockHoldingData.shares, mockCurrentPrice.currentPrice);
  console.log("2. 市值计算结果:");
  console.log("   市值:", marketValue.toFixed(2), "元");
  console.log("");

  // 3. 测试盈亏计算
  const profitLoss = FinancialCalculator.calculateProfitLossFromHoldings(
    mockHoldingData,
    mockCurrentPrice,
    costs.holdCost,
    costs.dilutedCost,
    marketValue,
  );

  console.log("3. 盈亏计算结果:");
  console.log("   浮动盈亏额:", profitLoss.floatAmount.toFixed(2), "元");
  console.log("   浮动盈亏率:", (profitLoss.floatRate * 100).toFixed(2), "%");
  console.log("   累计盈亏额:", profitLoss.accumAmount.toFixed(2), "元");
  console.log("   累计盈亏率:", (profitLoss.accumRate * 100).toFixed(2), "%");
  console.log("   当日盈亏额:", profitLoss.dayFloatAmount.toFixed(2), "元");
  console.log("   当日盈亏率:", (profitLoss.dayFloatRate * 100).toFixed(2), "%");
  console.log("");

  // 4. 手动验证计算
  console.log("=== 手动验证 ===");

  // 验证持仓成本：(总买入金额 + 买入佣金) / 持股数
  const expectedHoldCost = (mockHoldingData.totalBuyAmount + mockHoldingData.buyCommission) / mockHoldingData.shares;
  console.log(
    "期望持仓成本:",
    expectedHoldCost.toFixed(4),
    "实际:",
    costs.holdCost.toFixed(4),
    Math.abs(expectedHoldCost - costs.holdCost) < 0.0001 ? "✅" : "❌",
  );

  // 验证摊薄成本：(总买入金额 + 所有佣金 + 所有税费 - 总卖出金额 - 总现金股息) / 持股数
  const expectedDilutedCost =
    (mockHoldingData.totalBuyAmount +
      mockHoldingData.buyCommission +
      mockHoldingData.sellCommission +
      mockHoldingData.buyTax +
      mockHoldingData.sellTax +
      mockHoldingData.otherTax -
      mockHoldingData.totalSellAmount -
      mockHoldingData.totalDividend) /
    mockHoldingData.shares;
  console.log(
    "期望摊薄成本:",
    expectedDilutedCost.toFixed(4),
    "实际:",
    costs.dilutedCost.toFixed(4),
    Math.abs(expectedDilutedCost - costs.dilutedCost) < 0.0001 ? "✅" : "❌",
  );

  // 验证累计盈亏：多仓市值 - 总成本 + 总卖出金额 + 总现金股息
  const totalCost =
    mockHoldingData.totalBuyAmount +
    mockHoldingData.buyCommission +
    mockHoldingData.sellCommission +
    mockHoldingData.buyTax +
    mockHoldingData.sellTax +
    mockHoldingData.otherTax;
  const expectedAccumAmount = marketValue - totalCost + mockHoldingData.totalSellAmount + mockHoldingData.totalDividend;
  console.log(
    "期望累计盈亏:",
    expectedAccumAmount.toFixed(2),
    "实际:",
    profitLoss.accumAmount.toFixed(2),
    Math.abs(expectedAccumAmount - profitLoss.accumAmount) < 0.01 ? "✅" : "❌",
  );

  console.log("");
  console.log("🎉 Holdings 计算逻辑测试完成！");
} catch (error) {
  console.error("❌ 测试失败:", error);
  process.exit(1);
}
