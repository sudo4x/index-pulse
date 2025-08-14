import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { transactions, portfolios } from "@/lib/db/schema";
import { TransactionType, TransactionTypeNames } from "@/types/investment";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// 更新交易记录
export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: "交易ID必须是有效的数字" }, { status: 400 });
    }

    const transactionData = await request.json();

    // 验证交易记录存在并且属于当前用户
    const existingTransaction = await db
      .select()
      .from(transactions)
      .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
      .where(and(eq(transactions.id, transactionId), eq(portfolios.userId, user.id)))
      .limit(1);

    if (existingTransaction.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // 计算交易金额
    const calculatedAmount = calculateTransactionAmount(transactionData);

    const updatedTransaction = await db
      .update(transactions)
      .set({
        ...transactionData,
        amount: calculatedAmount,
        symbol: transactionData.symbol.toUpperCase(),
        name: transactionData.name.replace(/\s+/g, ""), // 处理名称中的空白字符
        transactionDate: new Date(transactionData.transactionDate),
      })
      .where(eq(transactions.id, transactionId))
      .returning();

    // TODO: 在这里触发持仓和组合数据的重新计算

    return NextResponse.json({
      success: true,
      data: {
        ...updatedTransaction[0],
        typeName: TransactionTypeNames[updatedTransaction[0].type as TransactionType],
        description: formatTransactionDescription(updatedTransaction[0]),
      },
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 删除交易记录
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const transactionId = parseInt(id);

    if (isNaN(transactionId)) {
      return NextResponse.json({ error: "交易ID必须是有效的数字" }, { status: 400 });
    }

    // 验证交易记录存在并且属于当前用户
    const existingTransaction = await db
      .select()
      .from(transactions)
      .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
      .where(and(eq(transactions.id, transactionId), eq(portfolios.userId, user.id)))
      .limit(1);

    if (existingTransaction.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await db.delete(transactions).where(eq(transactions.id, transactionId));

    // TODO: 在这里触发持仓和组合数据的重新计算

    return NextResponse.json({
      success: true,
      message: "交易记录删除成功",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 计算买入卖出交易金额（只记录纯股票交易金额，不包含费用）
function calculateTradeAmount(
  shares: number,
  price: number,
  commission: number,
  tax: number,
  type: TransactionType,
): string {
  const baseAmount = shares * price;
  // amount 字段只记录纯股票交易金额，不包含费用
  return baseAmount.toFixed(2);
}

// 计算股息金额
function calculateDividendAmount(per10SharesDividend: number, holdingShares: number): string {
  return ((per10SharesDividend / 10) * holdingShares).toFixed(2);
}

// 提取交易数值参数
function extractTransactionParams(transactionData: {
  shares?: string | number;
  price?: string | number;
  commission?: string | number;
  tax?: string | number;
  per10SharesDividend?: string | number;
}) {
  return {
    shares: Number(transactionData.shares ?? 0),
    price: Number(transactionData.price ?? 0),
    commission: Number(transactionData.commission ?? 0),
    tax: Number(transactionData.tax ?? 0),
    per10SharesDividend: Number(transactionData.per10SharesDividend ?? 0),
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
  per10SharesDividend?: string | number;
}): string {
  const type = transactionData.type;
  const params = extractTransactionParams(transactionData);

  if (isTradeTransaction(type)) {
    return calculateTradeAmount(params.shares, params.price, params.commission, params.tax, type);
  }

  if (type === TransactionType.DIVIDEND) {
    return calculateDividendAmount(params.per10SharesDividend, params.shares);
  }

  // MERGE, SPLIT, 或其他类型默认为 0
  return "0.00";
}

// 格式化股息描述
function formatDividendDescription(
  unitDividend?: string | number | null,
  unitIncreaseShares?: string | number | null,
): string {
  let desc = "";
  if (unitDividend && Number(unitDividend) > 0) {
    desc += `每股股息 ¥${unitDividend}`;
  }
  if (unitIncreaseShares && Number(unitIncreaseShares) > 0) {
    if (desc) desc += "，";
    desc += `每股转增 ${unitIncreaseShares} 股`;
  }
  return desc || "除权除息";
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
      return formatDividendDescription(transaction.unitDividend, transaction.unitIncreaseShares);
    default:
      return "未知交易类型";
  }
}
