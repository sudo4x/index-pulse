import { NextResponse } from "next/server";

import { eq, and, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { transactions, portfolios } from "@/lib/db/schema";
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
        unitShares: transactions.unitShares,
        unitDividend: transactions.unitDividend,
        unitIncreaseShares: transactions.unitIncreaseShares,
        recordDate: transactions.recordDate,
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

    // 验证组合所有权
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(and(eq(portfolios.id, parseInt(transactionData.portfolioId)), eq(portfolios.userId, user.id)))
      .limit(1);

    if (portfolio.length === 0) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    // 计算交易金额
    const calculatedAmount = calculateTransactionAmount(transactionData);

    const newTransaction = await db
      .insert(transactions)
      .values({
        ...transactionData,
        amount: calculatedAmount,
        symbol: transactionData.symbol.toUpperCase(),
        transactionDate: new Date(transactionData.transactionDate),
        recordDate: transactionData.recordDate ? new Date(transactionData.recordDate) : null,
      })
      .returning();

    // TODO: 在这里触发持仓和组合数据的重新计算

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

// 计算买入卖出交易金额
function calculateTradeAmount(
  shares: number,
  price: number,
  commission: number,
  tax: number,
  type: TransactionType,
): string {
  const baseAmount = shares * price;
  const fees = commission + tax;

  const amount =
    type === TransactionType.BUY
      ? baseAmount + fees // 买入时加上费用
      : baseAmount - fees; // 卖出时扣除费用

  return amount.toFixed(2);
}

// 计算股息金额
function calculateDividendAmount(unitDividend: number, holdingShares: number): string {
  return (unitDividend * holdingShares).toFixed(2);
}

// 提取交易数值参数
function extractTransactionParams(transactionData: {
  shares?: string | number;
  price?: string | number;
  commission?: string | number;
  tax?: string | number;
  unitDividend?: string | number;
}) {
  return {
    shares: Number(transactionData.shares ?? 0),
    price: Number(transactionData.price ?? 0),
    commission: Number(transactionData.commission ?? 0),
    tax: Number(transactionData.tax ?? 0),
    unitDividend: Number(transactionData.unitDividend ?? 0),
  };
}

// 检查是否为买入或卖出交易
function isTradeTransaction(type: TransactionType): boolean {
  return type === TransactionType.BUY || type === TransactionType.SELL;
}

// 计算交易金额
function calculateTransactionAmount(transactionData: {
  type: TransactionType;
  shares?: string | number;
  price?: string | number;
  commission?: string | number;
  tax?: string | number;
  unitDividend?: string | number;
}): string {
  const type = transactionData.type;
  const params = extractTransactionParams(transactionData);

  if (isTradeTransaction(type)) {
    return calculateTradeAmount(params.shares, params.price, params.commission, params.tax, type);
  }

  if (type === TransactionType.DIVIDEND) {
    return calculateDividendAmount(params.unitDividend, params.shares);
  }

  // MERGE, SPLIT, 或其他类型默认为 0
  return "0.00";
}

// 格式化交易描述
function formatTransactionDescription(transaction: {
  type: TransactionType;
  shares: string | number | null;
  price: string | number | null;
  unitShares?: string | number | null;
  unitDividend?: string | number | null;
  unitIncreaseShares?: string | number | null;
}): string {
  const type = transaction.type;

  switch (type) {
    case TransactionType.BUY:
      return `买入 ${transaction.shares} 股，价格 ¥${transaction.price}`;
    case TransactionType.SELL:
      return `卖出 ${transaction.shares} 股，价格 ¥${transaction.price}`;
    case TransactionType.MERGE:
      return `${transaction.unitShares} 股合为 1 股`;
    case TransactionType.SPLIT:
      return `1 股拆为 ${transaction.unitShares} 股`;
    case TransactionType.DIVIDEND: {
      let desc = "";
      if (transaction.unitDividend && Number(transaction.unitDividend) > 0) {
        desc += `每股股息 ¥${transaction.unitDividend}`;
      }
      if (transaction.unitIncreaseShares && Number(transaction.unitIncreaseShares) > 0) {
        if (desc) desc += "，";
        desc += `每股转增 ${transaction.unitIncreaseShares} 股`;
      }
      return desc || "除权除息";
    }
    default:
      return "未知交易类型";
  }
}
