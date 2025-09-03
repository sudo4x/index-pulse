import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { HoldingService } from "@/lib/services/holding-service";
import { TransactionProcessor } from "@/lib/services/transaction-processor";
import { TransactionType } from "@/types/investment";

import {
  BaseTransactionHandler,
  TransactionInput,
  TransactionOutput,
  PortfolioConfig,
} from "./base-transaction-handler";

export class DividendHandler extends BaseTransactionHandler {
  getSupportedTypes(): TransactionType[] {
    return [TransactionType.DIVIDEND];
  }

  canHandle(type: TransactionType): boolean {
    return this.getSupportedTypes().includes(type);
  }

  async processTransaction(input: TransactionInput, _portfolioConfig: PortfolioConfig): Promise<TransactionOutput> {
    // 查询当前持股数
    const holdingShares = await this.getHoldingShares(input.portfolioId, input.symbol);

    const calculations = this.calculateDividendAmounts(input, holdingShares);
    const basicInfo = this.buildBasicTransactionInfo(input);
    const dividendInfo = this.buildDividendSpecificInfo(input, calculations.taxAmount);
    return {
      ...basicInfo,
      ...dividendInfo,
      amount: calculations.dividendAmount.toFixed(2),
      tax: calculations.taxAmount.toFixed(2),
    };
  }

  private calculateDividendAmounts(input: TransactionInput, holdingShares: number) {
    const unitDividend = Number(input.unitDividend ?? 0);
    const dividendAmount = (unitDividend / 10) * holdingShares;
    const taxAmount = Number(input.tax ?? 0);
    return { dividendAmount, taxAmount };
  }

  private buildBasicTransactionInfo(input: TransactionInput) {
    return {
      portfolioId: this.parsePortfolioId(input.portfolioId),
      symbol: this.cleanSymbol(input.symbol),
      name: this.cleanName(input.name),
      type: input.type,
      transactionDate: this.parseDate(input.transactionDate),
      shares: "0", // 除权除息不涉及股数变化，这里设为0
      price: "0",
      commission: "0",
      transferFee: "0",
      comment: input.comment ?? null,
    };
  }

  private buildDividendSpecificInfo(input: TransactionInput, taxAmount: number) {
    return {
      unitIncreaseShares: input.unitIncreaseShares?.toString() ?? null,
      unitShares: input.unitShares?.toString() ?? null,
      unitDividend: input.unitDividend?.toString() ?? null,
      description: `除权除息 - 税费: ${taxAmount.toFixed(2)}元`,
    };
  }

  private async getHoldingShares(portfolioId: string, symbol: string): Promise<number> {
    const portfolioIdInt = this.parsePortfolioId(portfolioId);
    const cleanSymbol = this.cleanSymbol(symbol);

    // 首先尝试从holdings表获取（如果已持久化）
    try {
      const holdingShares = await HoldingService.getHoldingShares(portfolioIdInt, cleanSymbol);
      if (holdingShares > 0) {
        return holdingShares;
      }
    } catch (error) {
      console.warn(`从holdings表获取持股数失败，转为动态计算: ${error}`);
    }

    // 后备方案：动态计算持股数
    return await this.calculateHoldingSharesDynamically(portfolioIdInt, cleanSymbol);
  }

  /**
   * 动态计算持股数（后备方案）
   */
  private async calculateHoldingSharesDynamically(portfolioId: number, symbol: string): Promise<number> {
    // 获取该品种除当前除权除息记录外的所有交易记录
    const holdingTransactions = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.portfolioId, portfolioId), eq(transactions.symbol, symbol)))
      .orderBy(transactions.transactionDate);

    if (holdingTransactions.length === 0) {
      throw new Error(`未找到股票 ${symbol} 的任何交易记录`);
    }

    const sharesData = TransactionProcessor.calculateSharesDataFromTransactions(holdingTransactions);
    return sharesData.totalShares;
  }
}
