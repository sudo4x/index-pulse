import { FeeCalculator, CommissionConfig } from "@/services/fee-calculator";
import { TransactionType } from "@/types/investment";

import {
  BaseTransactionHandler,
  TransactionInput,
  TransactionOutput,
  PortfolioConfig,
} from "./base-transaction-handler";

export class BuySellHandler extends BaseTransactionHandler {
  getSupportedTypes(): TransactionType[] {
    return [TransactionType.BUY, TransactionType.SELL];
  }

  canHandle(type: TransactionType): boolean {
    return this.getSupportedTypes().includes(type);
  }

  async processTransaction(input: TransactionInput, portfolioConfig: PortfolioConfig): Promise<TransactionOutput> {
    const shares = Number(input.shares ?? 0);
    const price = Number(input.price ?? 0);
    const baseAmount = shares * price;

    // 构建佣金配置对象
    const commissionConfig: CommissionConfig = {
      stockCommissionRate: Number(portfolioConfig.stockCommissionRate),
      stockCommissionMinAmount: Number(portfolioConfig.stockCommissionMinAmount),
      etfCommissionRate: Number(portfolioConfig.etfCommissionRate),
      etfCommissionMinAmount: Number(portfolioConfig.etfCommissionMinAmount),
    };

    // 计算所有费用
    const feeResult = FeeCalculator.calculateFees(
      this.cleanSymbol(input.symbol),
      input.type,
      baseAmount,
      commissionConfig,
    );

    return {
      portfolioId: this.parsePortfolioId(input.portfolioId),
      symbol: this.cleanSymbol(input.symbol),
      name: this.cleanName(input.name),
      type: input.type,
      transactionDate: this.parseDate(input.transactionDate),
      shares: shares.toString(),
      price: price.toString(),
      amount: baseAmount.toFixed(4), // 只记录股票交易金额，不包含费用
      commission: feeResult.commission.toFixed(4),
      tax: feeResult.stampTax.toFixed(4),
      transferFee: feeResult.transferFee.toFixed(4),
      description: feeResult.description,
      comment: input.comment ?? null,
    };
  }
}
