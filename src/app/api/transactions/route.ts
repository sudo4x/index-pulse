import { NextResponse } from "next/server";

import { eq, and, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { transactions, portfolios } from "@/lib/db/schema";
import { HoldingService } from "@/lib/services/holding-service";
import { TransactionHandlerFactory } from "@/lib/services/transaction-handlers/transaction-handler-factory";
import { TransactionValidator } from "@/lib/validators/transaction-validator";
import { TransactionType, TransactionTypeNames } from "@/types/investment";

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
        transactionDate: transactions.transactionDate,
        shares: transactions.shares,
        price: transactions.price,
        amount: transactions.amount,
        commission: transactions.commission,
        commissionRate: transactions.commissionRate,
        tax: transactions.tax,
        taxRate: transactions.taxRate,
        transferFee: transactions.transferFee,
        description: transactions.description,
        unitShares: transactions.unitShares,
        per10SharesTransfer: transactions.per10SharesTransfer,
        per10SharesBonus: transactions.per10SharesBonus,
        per10SharesDividend: transactions.per10SharesDividend,
        comment: transactions.comment,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
      .where(and(...conditions));

    const results = await query.orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

    // 格式化返回数据
    const formattedResults = results.map((transaction) => ({
      ...transaction,
      typeName: TransactionTypeNames[transaction.type as TransactionType] || "未知",
      description: formatTransactionDescription(transaction),
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 验证交易请求的所有必要条件
async function validateTransactionRequest(transactionData: any, user: any) {
  // 验证用户
  if (!user) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // 验证交易数据
  const validation = TransactionValidator.validateTransaction(transactionData);
  if (!validation.isValid) {
    console.error("Transaction validation failed:", {
      error: validation.error,
      data: transactionData,
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      response: NextResponse.json({ error: validation.error }, { status: 400 }),
    };
  }

  // 验证组合所有权并获取佣金配置
  const portfolio = await getPortfolioConfig(transactionData.portfolioId, user.id);
  if (!portfolio) {
    console.error("Portfolio not found:", {
      portfolioId: transactionData.portfolioId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      response: NextResponse.json({ error: "Portfolio not found" }, { status: 404 }),
    };
  }

  return {
    success: true,
    portfolio,
  };
}

// 处理交易核心逻辑
async function processTransactionCore(transactionData: any, portfolio: any) {
  // 使用策略模式处理交易
  const handler = TransactionHandlerFactory.getHandler(transactionData.type);
  const processedTransaction = await handler.processTransaction(transactionData, {
    stockCommissionRate: portfolio.stockCommissionRate,
    stockCommissionMinAmount: portfolio.stockCommissionMinAmount,
    etfCommissionRate: portfolio.etfCommissionRate,
    etfCommissionMinAmount: portfolio.etfCommissionMinAmount,
  });

  // 保存交易记录
  const newTransaction = await db.insert(transactions).values(processedTransaction).returning();

  // 更新相关持仓数据
  await updateHoldingAfterTransaction(processedTransaction.portfolioId, processedTransaction.symbol);

  return {
    success: true,
    data: {
      ...newTransaction[0],
      typeName: TransactionTypeNames[newTransaction[0].type as TransactionType],
      description: formatTransactionDescription(newTransaction[0]),
    },
  };
}

// 更新持仓数据（非阻断式）
async function updateHoldingAfterTransaction(portfolioId: number, symbol: string) {
  try {
    await HoldingService.updateHoldingBySymbol(portfolioId, symbol);
  } catch (holdingError) {
    console.error("Error updating holding after transaction creation:", {
      error: holdingError instanceof Error ? holdingError.message : String(holdingError),
      portfolioId,
      symbol,
      timestamp: new Date().toISOString(),
    });
    // 不阻断交易记录的成功返回，但记录错误
  }
}

// 统一错误处理
function handleTransactionError(error: unknown): NextResponse {
  console.error("Error creating transaction:", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // 如果是已知的业务错误（如找不到持仓），返回具体错误信息
  if (error instanceof Error && error.message.includes("未找到")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// 创建交易记录
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const transactionData = await request.json();

    // 验证阶段
    const validation = await validateTransactionRequest(transactionData, user);
    if (!validation.success) {
      return validation.response;
    }

    // 处理阶段
    const result = await processTransactionCore(transactionData, validation.portfolio);
    return NextResponse.json(result);
  } catch (error) {
    return handleTransactionError(error);
  }
}

// 获取组合配置的辅助函数
async function getPortfolioConfig(portfolioId: string, userId: number) {
  const portfolioIdInt = parseInt(portfolioId);
  if (isNaN(portfolioIdInt)) {
    return null;
  }

  const portfolio = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, portfolioIdInt), eq(portfolios.userId, userId)))
    .limit(1);

  return portfolio.length > 0 ? portfolio[0] : null;
}

// 格式化股息描述
function formatDividendDescription(
  per10SharesTransfer?: string | number | null,
  per10SharesBonus?: string | number | null,
  per10SharesDividend?: string | number | null,
): string {
  let desc = "";
  if (per10SharesDividend && Number(per10SharesDividend) > 0) {
    desc += `每10股红利 ¥${per10SharesDividend}`;
  }
  if (per10SharesTransfer && Number(per10SharesTransfer) > 0) {
    if (desc) desc += "，";
    desc += `每10股转增 ${per10SharesTransfer} 股`;
  }
  if (per10SharesBonus && Number(per10SharesBonus) > 0) {
    if (desc) desc += "，";
    desc += `每10股送股 ${per10SharesBonus} 股`;
  }
  return desc || "除权除息";
}

// 格式化交易描述
function formatTransactionDescription(transaction: {
  type: TransactionType;
  shares: string | number | null;
  price: string | number | null;
  unitShares?: string | number | null;
  per10SharesTransfer?: string | number | null;
  per10SharesBonus?: string | number | null;
  per10SharesDividend?: string | number | null;
}): string {
  const type = transaction.type;

  const shares = Math.floor(Number(transaction.shares ?? 0));
  const price = Number(transaction.price ?? 0).toFixed(3);
  const unitShares = Math.floor(Number(transaction.unitShares ?? 0));

  switch (type) {
    case TransactionType.BUY:
      return `买入 ${shares} 股，价格 ¥${price}`;
    case TransactionType.SELL:
      return `卖出 ${shares} 股，价格 ¥${price}`;
    case TransactionType.MERGE:
      return `${unitShares} 股合为 1 股`;
    case TransactionType.SPLIT:
      return `1 股拆为 ${unitShares} 股`;
    case TransactionType.DIVIDEND:
      return formatDividendDescription(
        transaction.per10SharesTransfer,
        transaction.per10SharesBonus,
        transaction.per10SharesDividend,
      );
    default:
      return "未知交易类型";
  }
}
