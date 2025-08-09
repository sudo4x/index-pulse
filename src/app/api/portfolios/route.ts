import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { eq, desc } from "drizzle-orm";

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
      .orderBy(desc(portfolios.sortOrder), desc(portfolios.createdAt));

    return NextResponse.json({
      success: true,
      data: userPortfolios,
    });
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 创建新的投资组合
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "组合名称不能为空" },
        { status: 400 }
      );
    }

    // 获取当前最大排序值
    const maxSortOrder = await db
      .select({ maxSort: portfolios.sortOrder })
      .from(portfolios)
      .where(eq(portfolios.userId, user.id))
      .orderBy(desc(portfolios.sortOrder))
      .limit(1);

    const newSortOrder = (maxSortOrder[0]?.maxSort ?? 0) + 1;

    const newPortfolio = await db
      .insert(portfolios)
      .values({
        userId: user.id,
        name: name.trim(),
        sortOrder: newSortOrder,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newPortfolio[0],
    });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}