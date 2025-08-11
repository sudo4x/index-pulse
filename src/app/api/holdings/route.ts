import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios, transactions } from "@/lib/db/schema";
import { PortfolioCalculator } from "@/lib/services/portfolio-calculator";

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

// 获取组合中的股票代码列表
async function getPortfolioSymbols(portfolioIdInt: number) {
  return await db
    .selectDistinct({ symbol: transactions.symbol })
    .from(transactions)
    .where(eq(transactions.portfolioId, portfolioIdInt));
}

// 计算单个股票持仓
async function calculateSingleHolding(portfolioId: string, symbol: string) {
  try {
    return await PortfolioCalculator.calculateHoldingStats(portfolioId, symbol);
  } catch (error) {
    console.error(`Error calculating holding for ${symbol}:`, error);
    return null;
  }
}

// 计算所有持仓
async function calculateAllHoldings(portfolioIdInt: number, symbols: { symbol: string }[], includeHistorical: boolean) {
  const holdings = [];

  for (const { symbol } of symbols) {
    const holding = await calculateSingleHolding(portfolioIdInt.toString(), symbol);
    if (holding && (includeHistorical || holding.isActive)) {
      holdings.push(holding);
    }
  }

  return holdings;
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

    const symbols = await getPortfolioSymbols(paramsValidation.portfolioIdInt!);
    const holdings = await calculateAllHoldings(paramsValidation.portfolioIdInt!, symbols, includeHistorical);

    return NextResponse.json({
      success: true,
      data: holdings,
    });
  } catch (error) {
    console.error("Error fetching holdings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
