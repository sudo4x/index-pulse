import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transfers, portfolios } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { eq, and, desc } from "drizzle-orm";
import { TransferType, TransferTypeNames } from "@/types/investment";

// 获取转账记录
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");

    let query = db
      .select()
      .from(transfers)
      .innerJoin(portfolios, eq(transfers.portfolioId, portfolios.id))
      .where(eq(portfolios.userId, user.id));

    if (portfolioId) {
      const portfolioIdInt = parseInt(portfolioId);
      if (isNaN(portfolioIdInt)) {
        return NextResponse.json(
          { error: "portfolioId 必须是有效的数字" },
          { status: 400 }
        );
      }
      query = query.where(
        and(eq(portfolios.userId, user.id), eq(transfers.portfolioId, portfolioIdInt))
      );
    }

    const results = await query.orderBy(
      desc(transfers.transferDate),
      desc(transfers.createdAt)
    );

    // 格式化返回数据
    const formattedResults = results.map((result) => ({
      ...result.transfers,
      typeName: TransferTypeNames[result.transfers.type as TransferType] || "未知",
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults,
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 创建转账记录
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transferData = await request.json();

    // 验证组合所有权
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.id, parseInt(transferData.portfolioId)),
          eq(portfolios.userId, user.id)
        )
      )
      .limit(1);

    if (portfolio.length === 0) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    // 验证必填字段
    if (!transferData.type || !transferData.amount || !transferData.transferDate) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    const newTransfer = await db
      .insert(transfers)
      .values({
        ...transferData,
        transferDate: new Date(transferData.transferDate),
        amount: Number(transferData.amount).toFixed(2),
      })
      .returning();

    // TODO: 在这里触发组合现金和总资产的重新计算

    return NextResponse.json({
      success: true,
      data: {
        ...newTransfer[0],
        typeName: TransferTypeNames[newTransfer[0].type as TransferType],
      },
    });
  } catch (error) {
    console.error("Error creating transfer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}