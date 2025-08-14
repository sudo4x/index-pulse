import { NextResponse } from "next/server";

import { eq, desc, asc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";
import { PortfolioValidator, PortfolioValidationData } from "@/lib/validators/portfolio-validator";

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

    const validation = PortfolioValidator.validateForCreate(requestData);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
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

async function buildPortfolioData(data: PortfolioValidationData, userId: number) {
  const { name, stockCommissionMinAmount, stockCommissionRate, etfCommissionMinAmount, etfCommissionRate } = data;

  const actualValues = PortfolioValidator.getActualValues(data);
  const newSortOrder = await getNextSortOrder(userId);

  return {
    userId,
    name: name.trim(),
    sortOrder: newSortOrder,
    stockCommissionMinAmount: actualValues.stockCommissionMinAmount.toString(),
    stockCommissionRate: actualValues.stockCommissionRate.toString(),
    etfCommissionMinAmount: actualValues.etfCommissionMinAmount.toString(),
    etfCommissionRate: actualValues.etfCommissionRate.toString(),
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
