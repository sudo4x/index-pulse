import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios, transactions } from "@/lib/db/schema";

// 根据股票名称查找对应的股票代码
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "股票名称参数不能为空" }, { status: 400 });
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "用户未登录" }, { status: 401 });
    }

    const trimmedName = name.trim();

    // 通过用户的投资组合查询交易记录表中是否有相同名称的记录
    const result = await db
      .select({ symbol: transactions.symbol })
      .from(transactions)
      .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
      .where(and(eq(portfolios.userId, user.id), eq(transactions.name, trimmedName)))
      .limit(1);

    if (result.length > 0) {
      return NextResponse.json({
        success: true,
        symbol: result[0].symbol,
        name: trimmedName,
      });
    }

    // 未找到匹配记录
    return NextResponse.json({
      success: false,
      message: `未找到股票"${trimmedName}"的历史交易记录`,
    });
  } catch (error) {
    console.error("Error in symbol lookup API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
