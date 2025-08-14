import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";

interface Params {
  portfolioId: string;
}

// 获取特定投资组合信息
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { portfolioId } = await params;
    const portfolioIdInt = parseInt(portfolioId);

    if (isNaN(portfolioIdInt)) {
      return NextResponse.json({ error: "portfolioId 必须是有效的数字" }, { status: 400 });
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await db
      .select()
      .from(portfolios)
      .where(and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, user.id)))
      .limit(1);

    if (portfolio.length === 0) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: portfolio[0],
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 更新投资组合信息
export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const authResult = await authenticateAndValidateParams(params);
    if (authResult.error) {
      return authResult.error;
    }

    const requestData = await request.json();
    const {
      name,
      sortOrder,
      stockCommissionMinAmount,
      stockCommissionRate,
      etfCommissionMinAmount,
      etfCommissionRate,
    } = requestData;

    const validationError = validateUpdateData({
      name,
      stockCommissionMinAmount,
      stockCommissionRate,
      etfCommissionMinAmount,
      etfCommissionRate,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updateData = buildUpdateData({
      name,
      sortOrder,
      stockCommissionMinAmount,
      stockCommissionRate,
      etfCommissionMinAmount,
      etfCommissionRate,
    });

    return await updatePortfolioInDb(authResult.portfolioIdInt, authResult.user.id, updateData);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 部分更新投资组合信息（重命名等）
export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const authResult = await authenticateAndValidateParams(params);
    if (authResult.error) {
      return authResult.error;
    }

    const requestData = await request.json();
    const { name, stockCommissionMinAmount, stockCommissionRate, etfCommissionMinAmount, etfCommissionRate } =
      requestData;

    const validationError = validateUpdateData({
      name,
      stockCommissionMinAmount,
      stockCommissionRate,
      etfCommissionMinAmount,
      etfCommissionRate,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updateData = buildUpdateData({
      name,
      stockCommissionMinAmount,
      stockCommissionRate,
      etfCommissionMinAmount,
      etfCommissionRate,
    });

    return await updatePortfolioInDb(authResult.portfolioIdInt, authResult.user.id, updateData);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 删除投资组合
export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const authResult = await authenticateAndValidateParams(params);
    if (authResult.error) {
      return authResult.error;
    }

    const deletedPortfolio = await db
      .delete(portfolios)
      .where(and(eq(portfolios.id, authResult.portfolioIdInt), eq(portfolios.userId, authResult.user.id)))
      .returning();

    if (deletedPortfolio.length === 0) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { id: authResult.portfolioIdInt.toString() },
    });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper functions
async function authenticateAndValidateParams(params: Promise<Params>) {
  const { portfolioId } = await params;
  const portfolioIdInt = parseInt(portfolioId);

  if (isNaN(portfolioIdInt)) {
    return {
      error: NextResponse.json({ error: "portfolioId 必须是有效的数字" }, { status: 400 }),
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { portfolioIdInt, user };
}

function validateUpdateData(data: {
  name?: any;
  stockCommissionMinAmount?: any;
  stockCommissionRate?: any;
  etfCommissionMinAmount?: any;
  etfCommissionRate?: any;
}): string | null {
  const { name, stockCommissionMinAmount, stockCommissionRate, etfCommissionMinAmount, etfCommissionRate } = data;

  if (name !== undefined) {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return "组合名称不能为空";
    }
  }

  if (
    (stockCommissionMinAmount !== undefined && stockCommissionMinAmount < 0) ||
    (etfCommissionMinAmount !== undefined && etfCommissionMinAmount < 0)
  ) {
    return "佣金最低金额不能为负数";
  }

  if (
    (stockCommissionRate !== undefined && (stockCommissionRate < 0 || stockCommissionRate > 0.01)) ||
    (etfCommissionRate !== undefined && (etfCommissionRate < 0 || etfCommissionRate > 0.01))
  ) {
    return "佣金费率必须在0-1%之间";
  }

  return null;
}

function buildUpdateData(data: {
  name?: string;
  sortOrder?: number;
  stockCommissionMinAmount?: number;
  stockCommissionRate?: number;
  etfCommissionMinAmount?: number;
  etfCommissionRate?: number;
}) {
  const { name, sortOrder, stockCommissionMinAmount, stockCommissionRate, etfCommissionMinAmount, etfCommissionRate } =
    data;

  const updateData: any = { updatedAt: new Date() };

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (sortOrder !== undefined) {
    updateData.sortOrder = sortOrder;
  }

  if (stockCommissionMinAmount !== undefined) {
    updateData.stockCommissionMinAmount = stockCommissionMinAmount.toString();
  }

  if (stockCommissionRate !== undefined) {
    updateData.stockCommissionRate = stockCommissionRate.toString();
  }

  if (etfCommissionMinAmount !== undefined) {
    updateData.etfCommissionMinAmount = etfCommissionMinAmount.toString();
  }

  if (etfCommissionRate !== undefined) {
    updateData.etfCommissionRate = etfCommissionRate.toString();
  }

  return updateData;
}

async function updatePortfolioInDb(portfolioId: number, userId: number, updateData: any) {
  const updatedPortfolio = await db
    .update(portfolios)
    .set(updateData)
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)))
    .returning();

  if (updatedPortfolio.length === 0) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: updatedPortfolio[0],
  });
}
