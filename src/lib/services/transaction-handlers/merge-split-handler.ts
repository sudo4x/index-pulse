import { PositionCycleManager } from "@/lib/services/position-cycle-manager";
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
    // 分配仓位周期ID（合股拆股使用当前周期）
    const positionCycleId = await PositionCycleManager.assignCycleId(
      this.parsePortfolioId(input.portfolioId),
      this.cleanSymbol(input.symbol),
      input.type,
      0, // 合股拆股不涉及股数变动
    );

    return {
      portfolioId: this.parsePortfolioId(input.portfolioId),
      symbol: this.cleanSymbol(input.symbol),
      name: this.cleanName(input.name),
      type: input.type,
      positionCycleId,
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
