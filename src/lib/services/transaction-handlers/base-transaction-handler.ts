import { TransactionType } from "@/types/investment";

export interface TransactionInput {
  portfolioId: string;
  symbol: string;
  name: string;
  type: TransactionType;
  transactionDate: string;
  shares?: number;
  price?: number;
  comment?: string;
  // 除权除息字段
  per10SharesTransfer?: number;
  per10SharesBonus?: number;
  per10SharesDividend?: number;
  tax?: number;
  // 合股拆股字段
  unitShares?: number;
}

export interface TransactionOutput {
  portfolioId: number;
  symbol: string;
  name: string;
  type: TransactionType;
  transactionDate: Date;
  shares: string;
  price: string;
  amount: string;
  commission: string;
  tax: string;
  transferFee: string;
  description: string;
  comment: string | null;
  // 可选字段
  unitShares?: string | null;
  per10SharesTransfer?: string | null;
  per10SharesBonus?: string | null;
  per10SharesDividend?: string | null;
}

export interface PortfolioConfig {
  commissionRate: string;
  commissionMinAmount: string;
}

export abstract class BaseTransactionHandler {
  abstract getSupportedTypes(): TransactionType[];
  abstract canHandle(type: TransactionType): boolean;
  abstract processTransaction(input: TransactionInput, portfolioConfig: PortfolioConfig): Promise<TransactionOutput>;

  protected cleanSymbol(symbol: string): string {
    return symbol.toUpperCase();
  }

  protected cleanName(name: string): string {
    return name.replace(/\s+/g, "");
  }

  protected parsePortfolioId(portfolioId: string): number {
    return parseInt(portfolioId);
  }

  protected parseDate(dateString: string): Date {
    return new Date(dateString);
  }
}
