import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import type { TransactionFormData } from "@/app/(main)/investment/portfolios/_components/transaction-form-types";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { portfolios } from "@/lib/db/schema";
import { PortfolioCalculator } from "@/lib/services/portfolio-calculator";
import { TransactionService } from "@/lib/services/transaction-service";
import { QuickEntryValidator } from "@/lib/validators/quick-entry-validator";
import type { BulkTransactionRequest, BulkTransactionResponse } from "@/types/quick-entry";

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

    // 按股票品种分组，优化performance
    const groupedBySymbol = groupTransactionsBySymbol(transactionData);

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ index: number; error: string }> = [];

    // 使用数据库事务确保数据一致性
    await db.transaction(async (tx) => {
      // 按品种分组处理，每个品种批量处理后立即更新holdings
      for (const [symbol, symbolTransactions] of Object.entries(groupedBySymbol)) {
        try {
          // 批量保存该品种的所有交易
          const savedTransactions = [];

          for (let i = 0; i < symbolTransactions.length; i++) {
            const transaction = symbolTransactions[i];
            try {
              const savedTransaction = await TransactionService.createTransaction({
                portfolioId: parseInt(portfolioId),
                userId: user.id,
                ...transaction,
              });

              savedTransactions.push(savedTransaction);
              successCount++;
            } catch (error) {
              console.error(`Error saving transaction ${i}:`, error);
              failureCount++;
              errors.push({
                index: transaction.originalIndex || i,
                error: error instanceof Error ? error.message : "保存交易记录时发生错误",
              });
            }
          }

          // 如果该品种有成功保存的交易，更新holdings
          if (savedTransactions.length > 0) {
            try {
              await PortfolioCalculator.updateHoldingsForSymbol(parseInt(portfolioId), symbol, user.id.toString());
            } catch (error) {
              console.error(`Error updating holdings for ${symbol}:`, error);
              // holdings更新失败不影响交易保存成功的状态
              // 但应该记录错误以便后续处理
            }
          }
        } catch (error) {
          console.error(`Error processing symbol ${symbol}:`, error);
          // 如果整个品种处理失败，标记所有相关交易为失败
          symbolTransactions.forEach((_, index) => {
            failureCount++;
            errors.push({
              index: symbolTransactions[index].originalIndex || index,
              error: `处理股票 ${symbol} 时发生错误`,
            });
          });
        }
      }
    });

    const response: BulkTransactionResponse = {
      success: successCount > 0,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    // 根据结果返回适当的HTTP状态码
    if (successCount === 0) {
      return NextResponse.json(response, { status: 400 });
    } else if (failureCount > 0) {
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

/**
 * 按股票代码分组交易数据，便于批量处理和holdings更新优化
 */
function groupTransactionsBySymbol(
  transactions: TransactionFormData[],
): Record<string, (TransactionFormData & { originalIndex: number })[]> {
  const grouped: Record<string, (TransactionFormData & { originalIndex: number })[]> = {};

  transactions.forEach((transaction, index) => {
    const symbol = transaction.symbol.toUpperCase();

    if (!grouped[symbol]) {
      grouped[symbol] = [];
    }

    grouped[symbol].push({
      ...transaction,
      originalIndex: index,
    });
  });

  return grouped;
}
