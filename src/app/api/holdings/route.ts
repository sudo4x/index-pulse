import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portfolios, transactions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { eq, and, inArray } from "drizzle-orm";
import { PortfolioCalculator } from "@/lib/services/portfolio-calculator";

// 获取投资组合持仓信息
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");
    const includeHistorical = searchParams.get("includeHistorical") === "true";

    if (!portfolioId) {
      return NextResponse.json(
        { error: "portfolioId 参数不能为空" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 验证组合所有权
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(
        and(eq(portfolios.id, portfolioId), eq(portfolios.userId, user.id))
      )
      .limit(1);

    if (portfolio.length === 0) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    // 获取所有有交易记录的股票代码
    const symbols = await db
      .selectDistinct({ symbol: transactions.symbol })
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolioId));

    // 计算每个股票的持仓信息
    const holdings = [];
    for (const { symbol } of symbols) {
      try {
        const holding = await PortfolioCalculator.calculateHoldingStats(portfolioId, symbol);
        if (holding && (includeHistorical || holding.isActive)) {
          holdings.push(holding);
        }
      } catch (error) {
        console.error(`Error calculating holding for ${symbol}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: holdings,
    });
  } catch (error) {
    console.error("Error fetching holdings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}