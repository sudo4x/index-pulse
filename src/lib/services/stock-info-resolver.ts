import type { ResolvedStockInfo } from "@/types/quick-entry";

import { StockPriceService } from "./stock-price-service";

/**
 * 股票信息解析服务
 * 处理股票名称和代码的各种组合情况
 */
export class StockInfoResolver {
  private static cache = new Map<string, ResolvedStockInfo>();
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 主要解析方法：根据提供的名称和代码解析股票信息
   */
  static async resolveStockInfo(name?: string, symbol?: string): Promise<ResolvedStockInfo> {
    // 生成缓存键
    const cacheKey = `${name ?? ""}|${symbol ?? ""}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid()) {
      return cached;
    }

    let result: ResolvedStockInfo;

    try {
      // 根据提供的参数选择解析策略
      if (name && symbol) {
        result = await this.resolveByBoth(name, symbol);
      } else if (name && !symbol) {
        result = await this.resolveByNameOnly(name);
      } else if (!name && symbol) {
        result = await this.resolveBySymbolOnly(symbol);
      } else {
        result = {
          success: false,
          symbol: "",
          name: "",
          error: "股票名称和代码不能同时为空",
        };
      }

      // 缓存结果（包括失败的结果，避免重复查询）
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error("Stock info resolution error:", error);

      result = {
        success: false,
        symbol: symbol ?? "",
        name: name ?? "",
        error: "股票信息解析过程中发生错误",
      };

      return result;
    }
  }

  /**
   * 同时提供名称和代码的情况
   */
  private static async resolveByBoth(name: string, symbol: string): Promise<ResolvedStockInfo> {
    // 可选择验证名称与代码的匹配性
    // 目前选择信任用户输入，直接返回
    return {
      success: true,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
    };
  }

  /**
   * 仅提供股票名称的情况 - 从数据库查找历史交易记录
   */
  private static async resolveByNameOnly(name: string): Promise<ResolvedStockInfo> {
    try {
      const trimmedName = name.trim();

      // 查询数据库中是否有相同名称的交易记录
      const existingSymbol = await this.findSymbolByName(trimmedName);

      if (existingSymbol) {
        return {
          success: true,
          symbol: existingSymbol,
          name: trimmedName,
        };
      }

      // 未找到匹配记录
      return {
        success: false,
        symbol: "",
        name: trimmedName,
        error: `未找到股票"${trimmedName}"的历史交易记录，请补充股票代码或检查股票名称是否正确`,
      };
    } catch (error) {
      console.error("Error resolving by name only:", error);
      return {
        success: false,
        symbol: "",
        name: name.trim(),
        error: "查询股票名称时发生错误",
      };
    }
  }

  /**
   * 仅提供股票代码的情况 - 使用在线API查询
   */
  private static async resolveBySymbolOnly(symbol: string): Promise<ResolvedStockInfo> {
    try {
      const trimmedSymbol = symbol.trim().toUpperCase();

      // 使用现有的股票价格服务查询股票信息
      const stockInfo = await StockPriceService.getStockPrice(trimmedSymbol);

      if (stockInfo?.name?.trim()) {
        return {
          success: true,
          symbol: trimmedSymbol,
          name: stockInfo.name.trim(),
        };
      }

      // 在线查询失败或未找到股票
      return {
        success: false,
        symbol: trimmedSymbol,
        name: "",
        error: `股票代码"${trimmedSymbol}"无效或查询失败，请检查代码是否正确`,
      };
    } catch (error) {
      console.error("Error resolving by symbol only:", error);
      return {
        success: false,
        symbol: symbol.trim().toUpperCase(),
        name: "",
        error: "在线查询股票信息时发生网络错误",
      };
    }
  }

  /**
   * 根据股票名称从数据库查找对应的代码
   */
  private static async findSymbolByName(name: string): Promise<string | null> {
    try {
      // 这里需要查询数据库中的交易记录表
      // 由于我们在浏览器环境中无法直接访问数据库，需要通过API调用
      const response = await fetch(`/api/transactions/symbol-lookup?name=${encodeURIComponent(name)}`);

      if (response.ok) {
        const result = await response.json();
        return result.success ? result.symbol : null;
      }

      return null;
    } catch (error) {
      console.error("Error finding symbol by name:", error);
      return null;
    }
  }

  /**
   * 批量解析股票信息
   */
  static async resolveBatchStockInfo(
    stockInfos: Array<{ name?: string; symbol?: string }>,
  ): Promise<ResolvedStockInfo[]> {
    const promises = stockInfos.map((info) => this.resolveStockInfo(info.name, info.symbol));

    return Promise.all(promises);
  }

  /**
   * 检查缓存是否有效
   */
  private static isCacheValid(): boolean {
    // 简单的时间戳检查，实际实现中可能需要更复杂的缓存策略
    return true; // 暂时总是有效，后续可以添加时间戳字段
  }

  /**
   * 清理缓存
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
