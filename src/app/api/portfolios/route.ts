import { NextResponse } from "next/server";

import { eq, desc, asc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";

// 获取用户的所有投资组合
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPortfolios = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, user.id))
      .orderBy(asc(portfolios.sortOrder), desc(portfolios.createdAt));

    return NextResponse.json({
      success: true,
      data: userPortfolios,
    });
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 创建新的投资组合
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestData = await request.json();

    const validationError = validatePortfolioData(requestData);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const portfolioData = await buildPortfolioData(requestData, user.id);
    const newPortfolio = await db.insert(portfolios).values(portfolioData).returning();

    return NextResponse.json({
      success: true,
      data: newPortfolio[0],
    });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function validatePortfolioData(data: any): string | null {
  const { name, stockCommissionMinAmount, stockCommissionRate, etfCommissionMinAmount, etfCommissionRate } = data;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return "组合名称不能为空";
  }

  const finalStockCommissionMinAmount = stockCommissionMinAmount ?? 5.0;
  const finalStockCommissionRate = stockCommissionRate ?? 0.0003;
  const finalEtfCommissionMinAmount = etfCommissionMinAmount ?? 5.0;
  const finalEtfCommissionRate = etfCommissionRate ?? 0.0003;

  if (finalStockCommissionMinAmount < 0 || finalEtfCommissionMinAmount < 0) {
    return "佣金最低金额不能为负数";
  }

  if (
    finalStockCommissionRate < 0 ||
    finalStockCommissionRate > 0.01 ||
    finalEtfCommissionRate < 0 ||
    finalEtfCommissionRate > 0.01
  ) {
    return "佣金费率必须在0-1%之间";
  }

  return null;
}

async function buildPortfolioData(data: any, userId: number) {
  const { name, stockCommissionMinAmount, stockCommissionRate, etfCommissionMinAmount, etfCommissionRate } = data;

  const finalStockCommissionMinAmount = stockCommissionMinAmount ?? 5.0;
  const finalStockCommissionRate = stockCommissionRate ?? 0.0003;
  const finalEtfCommissionMinAmount = etfCommissionMinAmount ?? 5.0;
  const finalEtfCommissionRate = etfCommissionRate ?? 0.0003;

  const newSortOrder = await getNextSortOrder(userId);

  return {
    userId,
    name: name.trim(),
    sortOrder: newSortOrder,
    stockCommissionMinAmount: finalStockCommissionMinAmount.toString(),
    stockCommissionRate: finalStockCommissionRate.toString(),
    etfCommissionMinAmount: finalEtfCommissionMinAmount.toString(),
    etfCommissionRate: finalEtfCommissionRate.toString(),
  };
}

async function getNextSortOrder(userId: number): Promise<number> {
  const maxSortOrder = await db
    .select({ maxSort: portfolios.sortOrder })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .orderBy(desc(portfolios.sortOrder))
    .limit(1);

  return (maxSortOrder[0]?.maxSort ?? 0) + 1;
}
