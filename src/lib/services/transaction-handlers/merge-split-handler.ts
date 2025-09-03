import { TransactionType } from "@/types/investment";

import {
  BaseTransactionHandler,
  TransactionInput,
  TransactionOutput,
  PortfolioConfig,
} from "./base-transaction-handler";

export class MergeSplitHandler extends BaseTransactionHandler {
  getSupportedTypes(): TransactionType[] {
    return [TransactionType.MERGE, TransactionType.SPLIT];
  }

  canHandle(type: TransactionType): boolean {
    return this.getSupportedTypes().includes(type);
  }

  async processTransaction(input: TransactionInput, _portfolioConfig: PortfolioConfig): Promise<TransactionOutput> {
    return {
      portfolioId: this.parsePortfolioId(input.portfolioId),
      symbol: this.cleanSymbol(input.symbol),
      name: this.cleanName(input.name),
      type: input.type,
      transactionDate: this.parseDate(input.transactionDate),
      shares: "0",
      price: "0",
      amount: "0",
      commission: "0",
      tax: "0",
      transferFee: "0",
      unitShares: input.unitShares?.toString() ?? null,
      description: input.type === TransactionType.MERGE ? "合股操作" : "拆股操作",
      comment: input.comment ?? null,
    };
  }
}
