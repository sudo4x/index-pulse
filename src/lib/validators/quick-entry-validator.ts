import { z } from "zod";

import type { QuickEntryParseResult, BulkTransactionRequest } from "@/types/quick-entry";

// 单个快速录入解析结果的验证schema
export const quickEntryParseResultSchema = z.object({
  line: z.number().min(1),
  success: z.boolean(),
  data: z.any().optional(), // TransactionFormData 的具体验证在别处处理
  error: z
    .object({
      type: z.string(),
      message: z.string(),
      suggestions: z.array(z.string()).optional(),
    })
    .optional(),
  rawText: z.string(),
});

// 批量解析结果的验证schema
export const quickEntryParseResultsSchema = z.array(quickEntryParseResultSchema);

// 批量交易请求的验证schema
export const bulkTransactionRequestSchema = z.object({
  portfolioId: z.string().min(1, "投资组合ID不能为空"),
  transactions: z
    .array(
      z.object({
        symbol: z.string().min(1, "股票代码不能为空"),
        name: z.string().min(1, "股票名称不能为空"),
        type: z.enum(["buy", "sell", "dividend", "split", "merge"], {
          errorMap: () => ({ message: "无效的交易类型" }),
        }),
        transactionDate: z.string().transform((str) => new Date(str)),
        comment: z.string().optional(),
        // 买入/卖出字段
        shares: z.number().positive("数量必须大于0").optional(),
        price: z.number().positive("价格必须大于0").optional(),
        // 合股/拆股字段
        unitShares: z.number().positive("合股/拆股比例必须大于0").optional(),
        // 除权除息字段
        per10SharesTransfer: z.number().min(0, "每10股转增不能为负数").optional(),
        per10SharesBonus: z.number().min(0, "每10股送股不能为负数").optional(),
        per10SharesDividend: z.number().min(0, "每10股红利不能为负数").optional(),
        tax: z.number().min(0, "税费不能为负数").optional(),
      }),
    )
    .min(1, "至少需要一条交易记录"),
});

/**
 * 快速录入验证器类
 */
export class QuickEntryValidator {
  /**
   * 验证单个解析结果
   */
  static validateParseResult(result: unknown): { success: boolean; error?: string; data?: QuickEntryParseResult } {
    try {
      const validated = quickEntryParseResultSchema.parse(result);
      return { success: true, data: validated as QuickEntryParseResult };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        return { success: false, error: `解析结果格式错误: ${errorMessage}` };
      }
      return { success: false, error: "未知的验证错误" };
    }
  }

  /**
   * 验证批量解析结果
   */
  static validateParseResults(results: unknown): { success: boolean; error?: string; data?: QuickEntryParseResult[] } {
    try {
      const validated = quickEntryParseResultsSchema.parse(results);
      return { success: true, data: validated as QuickEntryParseResult[] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        return { success: false, error: `批量解析结果格式错误: ${errorMessage}` };
      }
      return { success: false, error: "未知的验证错误" };
    }
  }

  /**
   * 验证批量交易请求
   */
  static validateBulkTransactionRequest(request: unknown): {
    success: boolean;
    error?: string;
    data?: BulkTransactionRequest;
  } {
    try {
      const validated = bulkTransactionRequestSchema.parse(request);

      // 额外的业务逻辑验证
      const businessValidationError = this.validateBusinessLogic(validated);
      if (businessValidationError) {
        return { success: false, error: businessValidationError };
      }

      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        return { success: false, error: `批量交易请求格式错误: ${errorMessage}` };
      }
      return { success: false, error: "未知的验证错误" };
    }
  }

  /**
   * 业务逻辑验证
   */
  private static validateBusinessLogic(request: BulkTransactionRequest): string | null {
    for (let i = 0; i < request.transactions.length; i++) {
      const transaction = request.transactions[i];
      const index = i + 1;

      const validationError = this.validateSingleTransaction(transaction, index);
      if (validationError) {
        return validationError;
      }
    }

    return null;
  }

  /**
   * 验证单个交易记录
   */
  private static validateSingleTransaction(
    transaction: BulkTransactionRequest["transactions"][0],
    index: number,
  ): string | null {
    // 验证不同交易类型的必需字段
    const typeValidationError = this.validateTransactionTypeFields(transaction, index);
    if (typeValidationError) {
      return typeValidationError;
    }

    // 验证日期不能是未来时间
    if (transaction.transactionDate > new Date()) {
      return `第${index}条记录：交易日期不能是未来时间`;
    }

    return null;
  }

  /**
   * 验证交易类型特定字段
   */
  private static validateTransactionTypeFields(
    transaction: BulkTransactionRequest["transactions"][0],
    index: number,
  ): string | null {
    switch (transaction.type) {
      case "buy":
      case "sell":
        return this.validateBuySellFields(transaction, index);

      case "merge":
      case "split":
        return this.validateMergeSplitFields(transaction, index);

      case "dividend":
        return this.validateDividendFields(transaction, index);

      default:
        return null;
    }
  }

  /**
   * 验证买入/卖出字段
   */
  private static validateBuySellFields(
    transaction: BulkTransactionRequest["transactions"][0],
    index: number,
  ): string | null {
    // 类型守卫：检查是否具有买入/卖出相关属性
    const buySellTransaction = transaction as any;
    if (
      !buySellTransaction.shares ||
      buySellTransaction.shares <= 0 ||
      !buySellTransaction.price ||
      buySellTransaction.price <= 0
    ) {
      return `第${index}条记录：${transaction.type === "buy" ? "买入" : "卖出"}操作必须提供有效的价格和数量`;
    }
    return null;
  }

  /**
   * 验证合股/拆股字段
   */
  private static validateMergeSplitFields(
    transaction: BulkTransactionRequest["transactions"][0],
    index: number,
  ): string | null {
    // 类型守卫：检查是否具有合股/拆股相关属性
    const mergeSplitTransaction = transaction as any;
    if (!mergeSplitTransaction.unitShares || mergeSplitTransaction.unitShares <= 0) {
      return `第${index}条记录：${transaction.type === "merge" ? "合股" : "拆股"}操作必须提供有效的比例`;
    }
    return null;
  }

  /**
   * 验证除权除息字段
   */
  private static validateDividendFields(
    transaction: BulkTransactionRequest["transactions"][0],
    index: number,
  ): string | null {
    // 类型守卫：检查是否具有除权除息相关属性
    const dividendTransaction = transaction as any;
    const hasValidDividend =
      dividendTransaction.per10SharesDividend != null && dividendTransaction.per10SharesDividend > 0;
    const hasValidBonus = dividendTransaction.per10SharesBonus != null && dividendTransaction.per10SharesBonus > 0;
    const hasValidTransfer =
      dividendTransaction.per10SharesTransfer != null && dividendTransaction.per10SharesTransfer > 0;

    if (!hasValidDividend && !hasValidBonus && !hasValidTransfer) {
      return `第${index}条记录：除权除息操作必须提供有效的红利、送股或转增信息`;
    }
    return null;
  }

  /**
   * 验证解析结果中的成功条目
   */
  static validateSuccessfulResults(results: QuickEntryParseResult[]): {
    validResults: QuickEntryParseResult[];
    errors: Array<{ line: number; error: string }>;
  } {
    const validResults: QuickEntryParseResult[] = [];
    const errors: Array<{ line: number; error: string }> = [];

    results.forEach((result) => {
      if (result.success && result.data) {
        const validation = this.validateParseResult(result);
        if (validation.success) {
          validResults.push(result);
        } else {
          errors.push({
            line: result.line,
            error: validation.error ?? "验证失败",
          });
        }
      } else {
        errors.push({
          line: result.line,
          error: result.error?.message ?? "解析失败",
        });
      }
    });

    return { validResults, errors };
  }
}
