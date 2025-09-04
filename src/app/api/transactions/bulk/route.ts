import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";
import { BulkTransactionService } from "@/services/bulk-transaction-service";
import type { BulkTransactionRequest } from "@/types/quick-entry";
import { QuickEntryValidator } from "@/validators/quick-entry-validator";

// 批量保存交易记录
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "用户未登录" }, { status: 401 });
    }

    // 解析请求数据
    const body: BulkTransactionRequest = await request.json();

    // 验证请求数据格式
    const validation = QuickEntryValidator.validateBulkTransactionRequest(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error ?? "请求数据格式错误",
        },
        { status: 400 },
      );
    }

    const { portfolioId, transactions: transactionData } = validation.data!;

    // 验证投资组合是否存在且属于当前用户
    const portfolio = await db.query.portfolios.findFirst({
      where: eq(portfolios.id, parseInt(portfolioId)),
    });

    if (!portfolio) {
      return NextResponse.json({ error: "投资组合不存在" }, { status: 404 });
    }

    if (portfolio.userId !== user.id) {
      return NextResponse.json({ error: "无权限访问此投资组合" }, { status: 403 });
    }

    // 处理批量交易
    const response = await db.transaction(async () => {
      return await BulkTransactionService.processBulkTransactions(
        { portfolioId, transactions: transactionData },
        portfolio,
        user.id,
      );
    });

    // 根据结果返回适当的HTTP状态码
    if (response.successCount === 0) {
      return NextResponse.json(response, { status: 400 });
    } else if (response.failureCount > 0) {
      return NextResponse.json(response, { status: 207 }); // 207 Multi-Status
    } else {
      return NextResponse.json(response, { status: 201 });
    }
  } catch (error) {
    console.error("Error in bulk transactions API:", error);
    return NextResponse.json(
      {
        error: "批量保存交易记录时发生内部错误",
        success: false,
        successCount: 0,
        failureCount: 0,
      },
      { status: 500 },
    );
  }
}
