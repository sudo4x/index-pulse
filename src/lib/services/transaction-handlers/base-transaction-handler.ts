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
  unitIncreaseShares?: number; // 每10股转增股数
  unitDividend?: number; // 每10股现金红利
  tax?: number;
  // 合股拆股送股字段
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
  unitIncreaseShares?: string | null;
  unitDividend?: string | null;
}

export interface PortfolioConfig {
  stockCommissionRate: string;
  stockCommissionMinAmount: string;
  etfCommissionRate: string;
  etfCommissionMinAmount: string;
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
