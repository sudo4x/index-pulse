import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { eq, and } from "drizzle-orm";

interface Params {
  portfolioId: string;
}

// 获取特定投资组合信息
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { portfolioId } = await params;
    const portfolioIdInt = parseInt(portfolioId);
    
    if (isNaN(portfolioIdInt)) {
      return NextResponse.json(
        { error: "portfolioId 必须是有效的数字" },
        { status: 400 }
      );
    }
    
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await db
      .select()
      .from(portfolios)
      .where(
        and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, user.id))
      )
      .limit(1);

    if (portfolio.length === 0) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: portfolio[0],
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 更新投资组合信息
export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { portfolioId } = await params;
    const portfolioIdInt = parseInt(portfolioId);
    
    if (isNaN(portfolioIdInt)) {
      return NextResponse.json(
        { error: "portfolioId 必须是有效的数字" },
        { status: 400 }
      );
    }
    
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, sortOrder } = await request.json();

    const updateData: any = { updatedAt: new Date() };
    
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "组合名称不能为空" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    
    if (sortOrder !== undefined) {
      updateData.sortOrder = sortOrder;
    }

    const updatedPortfolio = await db
      .update(portfolios)
      .set(updateData)
      .where(
        and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, user.id))
      )
      .returning();

    if (updatedPortfolio.length === 0) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPortfolio[0],
    });
  } catch (error) {
    console.error("Error updating portfolio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 删除投资组合
export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { portfolioId } = await params;
    const portfolioIdInt = parseInt(portfolioId);
    
    if (isNaN(portfolioIdInt)) {
      return NextResponse.json(
        { error: "portfolioId 必须是有效的数字" },
        { status: 400 }
      );
    }
    
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deletedPortfolio = await db
      .delete(portfolios)
      .where(
        and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, user.id))
      )
      .returning();

    if (deletedPortfolio.length === 0) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: portfolioId },
    });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}