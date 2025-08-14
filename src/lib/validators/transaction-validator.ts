import { TransactionHandlerFactory } from "@/lib/services/transaction-handlers/transaction-handler-factory";
import { TransactionType } from "@/types/investment";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class TransactionValidator {
  static validateBasicFields(transactionData: any): ValidationResult {
    const portfolioValidation = this.validatePortfolioId(transactionData.portfolioId);
    if (!portfolioValidation.isValid) {
      return portfolioValidation;
    }

    const fieldsValidation = this.validateRequiredStringFields(transactionData);
    if (!fieldsValidation.isValid) {
      return fieldsValidation;
    }

    const typeValidation = this.validateTransactionType(transactionData.type);
    if (!typeValidation.isValid) {
      return typeValidation;
    }

    const dateValidation = this.validateTransactionDate(transactionData.transactionDate);
    if (!dateValidation.isValid) {
      return dateValidation;
    }

    return { isValid: true };
  }

  private static validatePortfolioId(portfolioId: any): ValidationResult {
    if (!portfolioId) {
      return { isValid: false, error: "portfolioId is required" };
    }

    const portfolioIdInt = parseInt(portfolioId);
    if (isNaN(portfolioIdInt)) {
      return { isValid: false, error: "portfolioId must be a valid number" };
    }

    return { isValid: true };
  }

  private static validateRequiredStringFields(transactionData: any): ValidationResult {
    if (!transactionData.symbol || typeof transactionData.symbol !== "string") {
      return { isValid: false, error: "symbol is required and must be a string" };
    }

    if (!transactionData.name || typeof transactionData.name !== "string") {
      return { isValid: false, error: "name is required and must be a string" };
    }

    return { isValid: true };
  }

  private static validateTransactionType(type: any): ValidationResult {
    if (!type || !TransactionHandlerFactory.isValidTransactionType(type)) {
      return { isValid: false, error: "Invalid transaction type" };
    }
    return { isValid: true };
  }

  private static validateTransactionDate(transactionDate: any): ValidationResult {
    if (!transactionDate) {
      return { isValid: false, error: "transactionDate is required" };
    }

    const date = new Date(transactionDate);
    if (isNaN(date.getTime())) {
      return { isValid: false, error: "Invalid transactionDate format" };
    }

    return { isValid: true };
  }

  static validateBuySellFields(transactionData: any): ValidationResult {
    const type = transactionData.type as TransactionType;

    if (type !== TransactionType.BUY && type !== TransactionType.SELL) {
      return { isValid: true }; // Skip validation for other types
    }

    if (!transactionData.shares || Number(transactionData.shares) <= 0) {
      return { isValid: false, error: "shares must be a positive number for buy/sell transactions" };
    }

    if (!transactionData.price || Number(transactionData.price) <= 0) {
      return { isValid: false, error: "price must be a positive number for buy/sell transactions" };
    }

    return { isValid: true };
  }

  static validateDividendFields(transactionData: any): ValidationResult {
    const type = transactionData.type as TransactionType;

    if (type !== TransactionType.DIVIDEND) {
      return { isValid: true }; // Skip validation for other types
    }

    if (!transactionData.shares || Number(transactionData.shares) <= 0) {
      return { isValid: false, error: "shares (holding shares) is required for dividend transactions" };
    }

    if (!transactionData.per10SharesDividend || Number(transactionData.per10SharesDividend) <= 0) {
      return { isValid: false, error: "per10SharesDividend must be a positive number for dividend transactions" };
    }

    const tax = Number(transactionData.tax ?? 0);
    if (tax < 0) {
      return { isValid: false, error: "tax cannot be negative" };
    }

    return { isValid: true };
  }

  static validateMergeSplitFields(transactionData: any): ValidationResult {
    const type = transactionData.type as TransactionType;

    if (type !== TransactionType.MERGE && type !== TransactionType.SPLIT) {
      return { isValid: true }; // Skip validation for other types
    }

    if (!transactionData.unitShares || Number(transactionData.unitShares) <= 0) {
      return { isValid: false, error: "unitShares must be a positive number for merge/split transactions" };
    }

    return { isValid: true };
  }

  static validateTransaction(transactionData: any): ValidationResult {
    // Basic field validation
    const basicValidation = this.validateBasicFields(transactionData);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Type-specific validation
    const buySellValidation = this.validateBuySellFields(transactionData);
    if (!buySellValidation.isValid) {
      return buySellValidation;
    }

    const dividendValidation = this.validateDividendFields(transactionData);
    if (!dividendValidation.isValid) {
      return dividendValidation;
    }

    const mergeSplitValidation = this.validateMergeSplitFields(transactionData);
    if (!mergeSplitValidation.isValid) {
      return mergeSplitValidation;
    }

    return { isValid: true };
  }
}
