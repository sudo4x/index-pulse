import { FeeCalculator } from "@/lib/services/fee-calculator";
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

    // 获取佣金配置
    const commissionRate = Number(portfolioConfig.commissionRate);
    const commissionMinAmount = Number(portfolioConfig.commissionMinAmount);

    // 计算所有费用
    const feeResult = FeeCalculator.calculateFees(
      this.cleanSymbol(input.symbol),
      input.type,
      baseAmount,
      commissionRate,
      commissionMinAmount,
    );

    // 计算最终交易金额（包含费用）
    const finalAmount =
      input.type === TransactionType.BUY
        ? baseAmount + feeResult.totalFee // 买入时加上费用
        : baseAmount - feeResult.totalFee; // 卖出时扣除费用

    return {
      portfolioId: this.parsePortfolioId(input.portfolioId),
      symbol: this.cleanSymbol(input.symbol),
      name: this.cleanName(input.name),
      type: input.type,
      transactionDate: this.parseDate(input.transactionDate),
      shares: shares.toString(),
      price: price.toString(),
      amount: finalAmount.toFixed(2),
      commission: feeResult.commission.toFixed(2),
      tax: feeResult.stampTax.toFixed(2),
      transferFee: feeResult.transferFee.toFixed(2),
      description: feeResult.description,
      comment: input.comment ?? null,
    };
  }
}
