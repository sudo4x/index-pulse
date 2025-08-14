import { NextResponse } from "next/server";

import { eq, and, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { transactions, portfolios } from "@/lib/db/schema";
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

// 创建交易记录
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactionData = await request.json();

    // 验证交易数据
    const validation = TransactionValidator.validateTransaction(transactionData);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 验证组合所有权并获取佣金配置
    const portfolio = await getPortfolioConfig(transactionData.portfolioId, user.id);
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    // 使用策略模式处理交易
    const handler = TransactionHandlerFactory.getHandler(transactionData.type);
    const processedTransaction = await handler.processTransaction(transactionData, {
      commissionRate: portfolio.commissionRate,
      commissionMinAmount: portfolio.commissionMinAmount,
    });

    // 保存交易记录
    const newTransaction = await db.insert(transactions).values(processedTransaction).returning();

    return NextResponse.json({
      success: true,
      data: {
        ...newTransaction[0],
        typeName: TransactionTypeNames[newTransaction[0].type as TransactionType],
        description: formatTransactionDescription(newTransaction[0]),
      },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
