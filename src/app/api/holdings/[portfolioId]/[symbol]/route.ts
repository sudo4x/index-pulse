import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { transactions, portfolios, holdings } from "@/lib/db/schema";

interface RouteContext {
  params: Promise<{ portfolioId: string; symbol: string }>;
}

// 删除持仓品种及其相关记录
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { portfolioId, symbol } = await context.params;
    const portfolioIdInt = parseInt(portfolioId);

    if (isNaN(portfolioIdInt)) {
      return NextResponse.json({ error: "portfolioId必须是有效的数字" }, { status: 400 });
    }

    if (!symbol) {
      return NextResponse.json({ error: "symbol参数不能为空" }, { status: 400 });
    }

    // 验证组合所有权
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, user.id)))
      .limit(1);

    if (portfolio.length === 0) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    // 删除该品种的所有交易记录
    const deletedTransactions = await db
      .delete(transactions)
      .where(and(eq(transactions.portfolioId, portfolioIdInt), eq(transactions.symbol, symbol.toUpperCase())))
      .returning();

    // 删除该品种的持仓记录
    const deletedHoldings = await db
      .delete(holdings)
      .where(and(eq(holdings.portfolioId, portfolioIdInt), eq(holdings.symbol, symbol.toUpperCase())))
      .returning();

    // TODO: 在这里触发持仓和组合数据的重新计算

    return NextResponse.json({
      success: true,
      message: `成功删除品种 ${symbol.toUpperCase()}：${deletedTransactions.length} 条交易记录，${deletedHoldings.length} 条持仓记录`,
      data: {
        symbol: symbol.toUpperCase(),
        deletedTransactionsCount: deletedTransactions.length,
        deletedHoldingsCount: deletedHoldings.length,
      },
    });
  } catch (error) {
    console.error("Error deleting holding:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
