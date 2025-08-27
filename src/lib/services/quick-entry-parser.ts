import type { TransactionFormData } from "@/app/(main)/investment/portfolios/_components/transaction-form-types";
import type {
  QuickEntryParseResult,
  QuickEntryRawData,
  QuickEntryTransactionType,
  StockResolveError,
} from "@/types/quick-entry";

import { StockInfoResolver } from "./stock-info-resolver";

/**
 * 快速录入文本解析器
 * 支持格式：类型 股票名称 股票代码 价格/红利 数量/合股比例 备注 日期
 */
export class QuickEntryParser {
  /**
   * 解析多行文本输入
   */
  static async parseLines(input: string): Promise<QuickEntryParseResult[]> {
    const lines = input.split("\n").filter((line) => line.trim());
    const results: QuickEntryParseResult[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const result = await this.parseLine(line, i + 1);
      results.push(result);
    }

    return results;
  }

  /**
   * 解析单行文本
   */
  static async parseLine(line: string, lineNumber: number): Promise<QuickEntryParseResult> {
    try {
      // 预处理：处理引号包围的备注内容
      const processedLine = this.preprocessLine(line);
      const parts = this.splitLine(processedLine);

      if (parts.length < 2) {
        return {
          line: lineNumber,
          success: false,
          error: {
            type: "INVALID_FORMAT" as any,
            message: "格式错误：至少需要包含交易类型和股票信息",
          },
          rawText: line,
        };
      }

      // 解析基础字段
      const rawData = this.parseBasicFields(parts);

      // 验证交易类型
      if (!this.isValidTransactionType(rawData.type)) {
        return {
          line: lineNumber,
          success: false,
          error: {
            type: "INVALID_TRANSACTION_TYPE" as any,
            message: `不支持的交易类型："${rawData.type}"，支持的类型：买入、卖出、除权除息、拆股、合股`,
          },
          rawText: line,
        };
      }

      // 解析股票信息
      const stockInfo = await StockInfoResolver.resolveStockInfo(rawData.name, rawData.symbol);

      if (!stockInfo.success) {
        return {
          line: lineNumber,
          success: false,
          error: {
            type: "STOCK_RESOLVE_FAILED" as any,
            message: stockInfo.error || "股票信息解析失败",
          },
          rawText: line,
        };
      }

      // 构建交易表单数据
      const transactionData = this.buildTransactionFormData(rawData, stockInfo);

      // 验证数据完整性
      const validationError = this.validateTransactionData(rawData, transactionData);
      if (validationError) {
        return {
          line: lineNumber,
          success: false,
          error: validationError,
          rawText: line,
        };
      }

      return {
        line: lineNumber,
        success: true,
        data: transactionData,
        rawText: line,
      };
    } catch (error) {
      console.error("Error parsing line:", line, error);
      return {
        line: lineNumber,
        success: false,
        error: {
          type: "PARSE_ERROR" as any,
          message: "解析过程中发生错误",
        },
        rawText: line,
      };
    }
  }

  /**
   * 预处理行内容，处理引号包围的备注
   */
  private static preprocessLine(line: string): string {
    // 找到引号包围的内容，并用特殊标记替换空格
    return line.replace(/"([^"]*)"/g, (match, content) => {
      return `"${content.replace(/\s+/g, "___SPACE___")}"`;
    });
  }

  /**
   * 分割行内容为字段数组
   */
  private static splitLine(line: string): string[] {
    const parts = line.split(/\s+/);
    // 恢复备注中的空格
    return parts.map((part) => part.replace(/___SPACE___/g, " ").replace(/"/g, ""));
  }

  /**
   * 解析基础字段
   */
  private static parseBasicFields(parts: string[]): QuickEntryRawData {
    const data: QuickEntryRawData = {
      type: parts[0],
    };

    let currentIndex = 1;

    // 解析股票名称和代码
    if (parts[currentIndex] && parts[currentIndex] !== "-") {
      data.name = parts[currentIndex];
    }
    currentIndex++;

    if (currentIndex < parts.length && parts[currentIndex] !== "-") {
      data.symbol = parts[currentIndex];
    }
    currentIndex++;

    // 解析价格/红利
    if (currentIndex < parts.length && parts[currentIndex] !== "-") {
      const value = parseFloat(parts[currentIndex]);
      if (!isNaN(value)) {
        if (data.type === "除权除息") {
          data.dividend = value;
        } else {
          data.price = value;
        }
      }
    }
    currentIndex++;

    // 解析数量/合股比例/送转股
    if (currentIndex < parts.length) {
      const value = parts[currentIndex];
      if (data.type === "除权除息") {
        // 除权除息格式：送股|转增股，如 "2|1"
        if (value.includes("|")) {
          const [bonus, transfer] = value.split("|");
          data.bonusShares = parseFloat(bonus) || 0;
          data.transferShares = parseFloat(transfer) || 0;
        }
      } else if (data.type === "合股" || data.type === "拆股") {
        data.unitShares = parseFloat(value);
      } else {
        data.shares = parseFloat(value);
      }
    }
    currentIndex++;

    // 解析备注和日期（备注可能包含空格，需要特殊处理）
    const remainingParts = parts.slice(currentIndex);
    if (remainingParts.length > 0) {
      // 检查最后一个部分是否是日期格式
      const lastPart = remainingParts[remainingParts.length - 1];
      if (this.isDateFormat(lastPart)) {
        data.date = this.parseDate(lastPart);
        // 其余部分作为备注
        if (remainingParts.length > 1) {
          data.comment = remainingParts.slice(0, -1).join(" ");
        }
      } else {
        // 全部作为备注
        data.comment = remainingParts.join(" ");
      }
    }

    return data;
  }

  /**
   * 检查是否为有效的交易类型
   */
  private static isValidTransactionType(type: string): boolean {
    return Object.values(QuickEntryTransactionType).includes(type as QuickEntryTransactionType);
  }

  /**
   * 检查字符串是否为日期格式
   */
  private static isDateFormat(str: string): boolean {
    // 支持 YYYY-MM-DD 格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(str);
  }

  /**
   * 解析日期字符串
   */
  private static parseDate(dateStr: string): Date {
    if (this.isDateFormat(dateStr)) {
      return new Date(dateStr);
    }
    return new Date();
  }

  /**
   * 构建交易表单数据
   */
  private static buildTransactionFormData(
    rawData: QuickEntryRawData,
    stockInfo: { symbol: string; name: string },
  ): TransactionFormData {
    const baseData = {
      symbol: stockInfo.symbol,
      name: stockInfo.name,
      transactionDate: rawData.date || new Date(),
      comment: rawData.comment || "",
    };

    switch (rawData.type) {
      case "买入":
      case "卖出":
        return {
          ...baseData,
          type: rawData.type === "买入" ? "buy" : "sell",
          shares: rawData.shares || 0,
          price: rawData.price || 0,
        } as TransactionFormData;

      case "合股":
      case "拆股":
        return {
          ...baseData,
          type: rawData.type === "合股" ? "merge" : "split",
          unitShares: rawData.unitShares || 0,
        } as TransactionFormData;

      case "除权除息":
        return {
          ...baseData,
          type: "dividend",
          per10SharesTransfer: rawData.transferShares,
          per10SharesBonus: rawData.bonusShares,
          per10SharesDividend: rawData.dividend,
        } as TransactionFormData;

      default:
        throw new Error(`不支持的交易类型: ${rawData.type}`);
    }
  }

  /**
   * 验证交易数据完整性
   */
  private static validateTransactionData(
    rawData: QuickEntryRawData,
    transactionData: TransactionFormData,
  ): StockResolveError | null {
    switch (rawData.type) {
      case "买入":
      case "卖出":
        if (!rawData.price || rawData.price <= 0) {
          return {
            type: "MISSING_REQUIRED_FIELD" as any,
            message: `${rawData.type}操作必须提供有效的价格`,
          };
        }
        if (!rawData.shares || rawData.shares <= 0) {
          return {
            type: "MISSING_REQUIRED_FIELD" as any,
            message: `${rawData.type}操作必须提供有效的数量`,
          };
        }
        break;

      case "合股":
      case "拆股":
        if (!rawData.unitShares || rawData.unitShares <= 0) {
          return {
            type: "MISSING_REQUIRED_FIELD" as any,
            message: `${rawData.type}操作必须提供有效的比例`,
          };
        }
        break;

      case "除权除息":
        if (!rawData.dividend && !rawData.bonusShares && !rawData.transferShares) {
          return {
            type: "MISSING_REQUIRED_FIELD" as any,
            message: "除权除息操作必须提供红利金额或送转股信息",
          };
        }
        break;
    }

    return null;
  }
}
