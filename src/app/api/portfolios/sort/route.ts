import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";

interface SortItem {
  id: string;
  sortOrder: number;
}

// 批量更新组合排序
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sortData: SortItem[] = await request.json();

    if (!Array.isArray(sortData)) {
      return NextResponse.json({ error: "请求数据格式错误" }, { status: 400 });
    }

    // 验证所有ID都是有效数字
    for (const item of sortData) {
      const portfolioIdInt = parseInt(item.id);
      if (isNaN(portfolioIdInt) || typeof item.sortOrder !== "number") {
        return NextResponse.json({ error: "无效的数据格式" }, { status: 400 });
      }
    }

    // 使用事务来批量更新排序
    const updatePromises = sortData.map((item) => {
      const portfolioIdInt = parseInt(item.id);
      return db
        .update(portfolios)
        .set({
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
        })
        .where(and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, user.id)));
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "排序更新成功",
    });
  } catch (error) {
    console.error("Error updating portfolio sort order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
