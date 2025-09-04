import { NextResponse } from "next/server";

import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions, portfolios } from "@/lib/db/schema";
import { HoldingService } from "@/services/holding-service";
import { TransactionHandlerFactory } from "@/services/transaction-handlers/transaction-handler-factory";
import { TransactionType, TransactionTypeNames } from "@/types/investment";
import { TransactionValidator } from "@/validators/transaction-validator";

export interface TransactionValidationResult {
  success: boolean;
  response?: NextResponse;
  portfolio?: any;
}

export interface TransactionProcessResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 交易业务逻辑统一服务
 * 提供新增、更新、删除交易记录的一致性处理
 */
export class TransactionService {
  /**
   * 验证交易请求的所有必要条件
   */
  static async validateTransactionRequest(transactionData: any, user: any): Promise<TransactionValidationResult> {
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
    const portfolio = await this.getPortfolioConfig(transactionData.portfolioId, user.id);
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

  /**
   * 处理交易数据（新增或更新时使用）
   */
  static async processTransactionData(transactionData: any, portfolio: any): Promise<TransactionProcessResult> {
    try {
      // 使用策略模式处理交易
      const handler = TransactionHandlerFactory.getHandler(transactionData.type);
      const processedTransaction = await handler.processTransaction(transactionData, {
        stockCommissionRate: portfolio.stockCommissionRate,
        stockCommissionMinAmount: portfolio.stockCommissionMinAmount,
        etfCommissionRate: portfolio.etfCommissionRate,
        etfCommissionMinAmount: portfolio.etfCommissionMinAmount,
      });

      return {
        success: true,
        data: processedTransaction,
      };
    } catch (error) {
      console.error("Error processing transaction data:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 创建新交易记录
   */
  static async createTransaction(processedTransaction: any): Promise<TransactionProcessResult> {
    try {
      const newTransaction = await db.insert(transactions).values(processedTransaction).returning();

      // 更新相关持仓数据
      await this.updateHoldingAfterTransaction(processedTransaction.portfolioId, processedTransaction.symbol);

      return {
        success: true,
        data: {
          ...newTransaction[0],
          typeName: TransactionTypeNames[newTransaction[0].type as TransactionType],
        },
      };
    } catch (error) {
      console.error("Error creating transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 更新交易记录
   */
  static async updateTransaction(transactionId: number, processedTransaction: any): Promise<TransactionProcessResult> {
    try {
      const updatedTransaction = await db
        .update(transactions)
        .set(processedTransaction)
        .where(eq(transactions.id, transactionId))
        .returning();

      // 更新相关持仓数据
      await this.updateHoldingAfterTransaction(updatedTransaction[0].portfolioId, updatedTransaction[0].symbol);

      return {
        success: true,
        data: {
          ...updatedTransaction[0],
          typeName: TransactionTypeNames[updatedTransaction[0].type as TransactionType],
        },
      };
    } catch (error) {
      console.error("Error updating transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 删除交易记录
   */
  static async deleteTransaction(
    transactionId: number,
    portfolioId: number,
    symbol: string,
  ): Promise<TransactionProcessResult> {
    try {
      await db.delete(transactions).where(eq(transactions.id, transactionId));

      // 更新相关持仓数据
      await this.updateHoldingAfterTransaction(portfolioId, symbol);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 验证交易记录所有权
   */
  static async validateTransactionOwnership(
    transactionId: number,
    userId: number,
  ): Promise<{ success: boolean; transaction?: any; response?: NextResponse }> {
    try {
      const existingTransaction = await db
        .select()
        .from(transactions)
        .innerJoin(portfolios, eq(transactions.portfolioId, portfolios.id))
        .where(and(eq(transactions.id, transactionId), eq(portfolios.userId, userId)))
        .limit(1);

      if (existingTransaction.length === 0) {
        return {
          success: false,
          response: NextResponse.json({ error: "Transaction not found" }, { status: 404 }),
        };
      }

      return {
        success: true,
        transaction: existingTransaction[0].transactions,
      };
    } catch (error) {
      console.error("Error validating transaction ownership:", error);
      return {
        success: false,
        response: NextResponse.json({ error: "Internal server error" }, { status: 500 }),
      };
    }
  }

  /**
   * 更新持仓数据（非阻断式）
   */
  private static async updateHoldingAfterTransaction(portfolioId: number, symbol: string) {
    try {
      await HoldingService.updateHoldingBySymbol(portfolioId, symbol);
    } catch (holdingError) {
      console.error("Error updating holding after transaction operation:", {
        error: holdingError instanceof Error ? holdingError.message : String(holdingError),
        portfolioId,
        symbol,
        timestamp: new Date().toISOString(),
      });
      // 不阻断交易记录的成功返回，但记录错误
    }
  }

  /**
   * 获取组合配置的辅助函数
   */
  private static async getPortfolioConfig(portfolioId: string, userId: number) {
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

  /**
   * 统一错误处理
   */
  static handleTransactionError(error: unknown): NextResponse {
    console.error("Transaction operation error:", {
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
}
