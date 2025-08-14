import { TransactionType } from "@/types/investment";

import { BaseTransactionHandler } from "./base-transaction-handler";
import { BuySellHandler } from "./buy-sell-handler";
import { DividendHandler } from "./dividend-handler";
import { MergeSplitHandler } from "./merge-split-handler";

export class TransactionHandlerFactory {
  private static handlers: BaseTransactionHandler[] = [
    new BuySellHandler(),
    new DividendHandler(),
    new MergeSplitHandler(),
  ];

  static getHandler(type: TransactionType): BaseTransactionHandler {
    const handler = this.handlers.find((h) => h.canHandle(type));

    if (!handler) {
      throw new Error(`No handler found for transaction type: ${type}`);
    }

    return handler;
  }

  static getAllSupportedTypes(): TransactionType[] {
    return this.handlers.flatMap((handler) => handler.getSupportedTypes());
  }

  static isValidTransactionType(type: number): boolean {
    return this.getAllSupportedTypes().includes(type as TransactionType);
  }
}
