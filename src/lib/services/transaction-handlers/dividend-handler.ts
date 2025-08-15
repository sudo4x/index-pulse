import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";
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
    const per10SharesDividend = Number(input.per10SharesDividend ?? 0);
    const dividendAmount = (per10SharesDividend / 10) * holdingShares;
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
      per10SharesTransfer: input.per10SharesTransfer?.toString() ?? null,
      per10SharesBonus: input.per10SharesBonus?.toString() ?? null,
      per10SharesDividend: input.per10SharesDividend?.toString() ?? null,
      description: `除权除息 - 税费: ${taxAmount.toFixed(2)}元`,
    };
  }

  private async getHoldingShares(portfolioId: string, symbol: string): Promise<number> {
    const portfolioIdInt = this.parsePortfolioId(portfolioId);
    const cleanSymbol = this.cleanSymbol(symbol);

    const holding = await db
      .select({ shares: holdings.shares })
      .from(holdings)
      .where(and(eq(holdings.portfolioId, portfolioIdInt), eq(holdings.symbol, cleanSymbol)))
      .limit(1);

    if (holding.length === 0) {
      throw new Error(`未找到股票 ${cleanSymbol} 的持仓记录`);
    }

    return Number(holding[0].shares);
  }
}
