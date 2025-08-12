import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { parseDecimalFields } from "@/lib/db/decimal-utils";
import { transfers, portfolios } from "@/lib/db/schema";
import { TransferType, TransferTypeNames } from "@/types/investment";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// 更新转账记录
export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const transferId = parseInt(id);

    if (isNaN(transferId)) {
      return NextResponse.json({ error: "转账ID必须是有效的数字" }, { status: 400 });
    }

    const transferData = await request.json();

    // 验证转账记录存在并且属于当前用户
    const existingTransfer = await db
      .select()
      .from(transfers)
      .innerJoin(portfolios, eq(transfers.portfolioId, portfolios.id))
      .where(and(eq(transfers.id, transferId), eq(portfolios.userId, user.id)))
      .limit(1);

    if (existingTransfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    // 验证必填字段
    if (!transferData.type || !transferData.amount || !transferData.transferDate) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const updatedTransfer = await db
      .update(transfers)
      .set({
        ...transferData,
        transferDate: new Date(transferData.transferDate),
        amount: Number(transferData.amount).toFixed(2),
      })
      .where(eq(transfers.id, transferId))
      .returning();

    // TODO: 在这里触发组合现金和总资产的重新计算

    const formattedTransfer = parseDecimalFields(updatedTransfer[0], ["amount"]);

    return NextResponse.json({
      success: true,
      data: {
        ...formattedTransfer,
        typeName: TransferTypeNames[formattedTransfer.type as TransferType],
      },
    });
  } catch (error) {
    console.error("Error updating transfer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 删除转账记录
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const transferId = parseInt(id);

    if (isNaN(transferId)) {
      return NextResponse.json({ error: "转账ID必须是有效的数字" }, { status: 400 });
    }

    // 验证转账记录存在并且属于当前用户
    const existingTransfer = await db
      .select()
      .from(transfers)
      .innerJoin(portfolios, eq(transfers.portfolioId, portfolios.id))
      .where(and(eq(transfers.id, transferId), eq(portfolios.userId, user.id)))
      .limit(1);

    if (existingTransfer.length === 0) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    await db.delete(transfers).where(eq(transfers.id, transferId));

    // TODO: 在这里触发组合现金和总资产的重新计算

    return NextResponse.json({
      success: true,
      message: "转账记录删除成功",
    });
  } catch (error) {
    console.error("Error deleting transfer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
