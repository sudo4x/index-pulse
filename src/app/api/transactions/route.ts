import { NextResponse } from "next/server";

import { eq, and, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { transactions, portfolios } from "@/lib/db/schema";
import { TransactionHelpers } from "@/lib/helpers/transaction-helpers";
import { TransactionService } from "@/lib/services/transaction-service";

// 获取交易记录
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");
    const symbol = searchParams.get("symbol");

    // 构建查询条件
    const conditions = [eq(portfolios.userId, user.id)];

    if (portfolioId) {
      const portfolioIdInt = parseInt(portfolioId);
      if (isNaN(portfolioIdInt)) {
        return NextResponse.json({ error: "portfolioId 必须是有效的数字" }, { status: 400 });
      }
      conditions.push(eq(transactions.portfolioId, portfolioIdInt));
    }

    if (symbol) {
      conditions.push(eq(transactions.symbol, symbol.toUpperCase()));
    }

    const query = db
      .select({
        id: transactions.id,
        portfolioId: transactions.portfolioId,
        symbol: transactions.symbol,
        name: transactions.name,
        type: transactions.type,
        positionCycleId: transactions.positionCycleId,
        transactionDate: transactions.transactionDate,
        shares: transactions.shares,
        price: transactions.price,
        amount: transactions.amount,
        commission: transactions.commission,
        tax: transactions.tax,
        transferFee: transactions.transferFee,
        description: transactions.description,
        unitShares: transactions.unitShares,
        unitIncreaseShares: transactions.unitIncreaseShares,
        unitDividend: transactions.unitDividend,
        comment: transactions.comment,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
      .where(and(...conditions));

    const results = await query.orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

    // 格式化返回数据
    const formattedResults = results.map((transaction) => TransactionHelpers.enrichTransactionData(transaction));

    return NextResponse.json({
      success: true,
      data: formattedResults,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 创建交易记录
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const transactionData = await request.json();

    // 验证阶段
    const validation = await TransactionService.validateTransactionRequest(transactionData, user);
    if (!validation.success) {
      return validation.response;
    }

    // 处理交易数据
    const processResult = await TransactionService.processTransactionData(transactionData, validation.portfolio);
    if (!processResult.success) {
      return NextResponse.json({ error: processResult.error }, { status: 400 });
    }

    // 创建交易记录
    const createResult = await TransactionService.createTransaction(processResult.data);
    if (!createResult.success) {
      return NextResponse.json({ error: createResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: TransactionHelpers.enrichTransactionData(createResult.data),
    });
  } catch (error) {
    return TransactionService.handleTransactionError(error);
  }
}
