import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { Holding, portfolios } from "@/lib/db/schema";
import { FinancialCalculator } from "@/lib/services/financial-calculator";
import { HoldingService } from "@/lib/services/holding-service";
import { StockPriceService } from "@/lib/services/stock-price-service";
import { StockPrice } from "@/lib/services/types/calculator-types";

// 验证请求参数
function validateRequestParams(portfolioId: string | null) {
  if (!portfolioId) {
    return { valid: false, error: "portfolioId 参数不能为空", status: 400 };
  }

  const portfolioIdInt = parseInt(portfolioId);
  if (isNaN(portfolioIdInt)) {
    return { valid: false, error: "portfolioId 必须是有效的数字", status: 400 };
  }

  return { valid: true, portfolioIdInt };
}

// 验证用户权限
async function validateUserAccess(user: { id: number; authId: string; email: string } | null) {
  if (!user) {
    return { valid: false, error: "Unauthorized", status: 401 };
  }
  return { valid: true };
}

// 验证组合所有权
async function validatePortfolioOwnership(portfolioIdInt: number, userId: number) {
  const portfolio = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, userId)))
    .limit(1);

  if (portfolio.length === 0) {
    return { valid: false, error: "Portfolio not found", status: 404 };
  }

  return { valid: true };
}

// 获取持仓数据并计算实时信息
async function getHoldingsWithRealTimeData(portfolioIdInt: number, includeHistorical: boolean) {
  try {
    // 1. 直接从 holdings 表查询持仓数据
    const holdingsFromDB = await HoldingService.getHoldingsByPortfolio(portfolioIdInt, includeHistorical);

    if (holdingsFromDB.length === 0) {
      return [];
    }

    // 2. 批量获取股价
    const symbols = holdingsFromDB.map((h) => h.symbol);
    const priceMap = await StockPriceService.getStockPriceMap(symbols);

    // 3. 为每个持仓计算实时数据
    const results = await Promise.all(
      holdingsFromDB.map(async (holding) => {
        const currentPrice = priceMap.get(holding.symbol);
        if (!currentPrice) {
          console.warn(`No price data for symbol: ${holding.symbol}`);
          // 使用默认价格数据
          const defaultPrice = {
            symbol: holding.symbol,
            name: holding.name,
            currentPrice: 0,
            change: 0,
            changePercent: 0,
            previousClose: 0,
            limitUp: "0.000",
            limitDown: "0.000",
          };
          return transformHoldingData(holding, defaultPrice);
        }

        return transformHoldingData(holding, currentPrice);
      }),
    );

    return results;
  } catch (error) {
    console.error("Error getting holdings with real-time data:", error);
    throw error;
  }
}

// 转换持仓数据
function transformHoldingData(holding: Holding, currentPrice: StockPrice) {
  // 转换数据库 decimal 字段为 number
  const holdingData = {
    shares: parseFloat(String(holding.shares)),
    totalBuyAmount: parseFloat(String(holding.totalBuyAmount)),
    totalSellAmount: parseFloat(String(holding.totalSellAmount)),
    totalDividend: parseFloat(String(holding.totalDividend)),
    totalCommission: parseFloat(String(holding.totalCommission)),
    totalTax: parseFloat(String(holding.totalTax)),
  };

  // 计算成本
  const { holdCost, dilutedCost } = FinancialCalculator.calculateCostsFromHoldings(holdingData);

  // 计算市值
  const marketValue = FinancialCalculator.calculateMarketValue(holdingData.shares, currentPrice.currentPrice);

  // 计算盈亏
  const profitLoss = FinancialCalculator.calculateProfitLossFromHoldings(
    holdingData,
    currentPrice,
    holdCost,
    dilutedCost,
    marketValue,
  );

  return {
    id: `${holding.portfolioId}-${holding.symbol}`,
    symbol: holding.symbol,
    name: holding.name,
    shares: holdingData.shares,
    currentPrice: currentPrice.currentPrice,
    change: currentPrice.change,
    changePercent: currentPrice.changePercent,
    marketValue,
    dilutedCost,
    holdCost,
    floatAmount: profitLoss.floatAmount,
    floatRate: profitLoss.floatRate,
    accumAmount: profitLoss.accumAmount,
    accumRate: profitLoss.accumRate,
    dayFloatAmount: profitLoss.dayFloatAmount,
    dayFloatRate: profitLoss.dayFloatRate,
    isActive: holding.isActive,
    openTime: holding.openTime.toISOString(),
    liquidationTime: holding.liquidationTime?.toISOString(),
  };
}

// 获取投资组合持仓信息
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");
    const includeHistorical = searchParams.get("includeHistorical") === "true";

    const paramsValidation = validateRequestParams(portfolioId);
    if (!paramsValidation.valid) {
      return NextResponse.json({ error: paramsValidation.error }, { status: paramsValidation.status });
    }

    const user = await getCurrentUser();
    const userValidation = await validateUserAccess(user);
    if (!userValidation.valid) {
      return NextResponse.json({ error: userValidation.error }, { status: userValidation.status });
    }

    const ownershipValidation = await validatePortfolioOwnership(paramsValidation.portfolioIdInt!, user!.id);
    if (!ownershipValidation.valid) {
      return NextResponse.json({ error: ownershipValidation.error }, { status: ownershipValidation.status });
    }

    const holdings = await getHoldingsWithRealTimeData(paramsValidation.portfolioIdInt!, includeHistorical);

    return NextResponse.json({
      success: true,
      data: holdings,
    });
  } catch (error) {
    console.error("Error fetching holdings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
