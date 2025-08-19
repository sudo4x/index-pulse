import { inArray, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { stockPrices } from "@/lib/db/schema";

export interface StockPriceData {
  symbol: string;
  name: string;
  currentPrice: string;
  change: string;
  changePercent: string;
  volume: string | null;
  turnover: string | null;
  marketValue: string | null;
  limitUp: string;
  limitDown: string;
  lastUpdated: Date;
}

export interface SimpleStockPrice {
  currentPrice: number;
  change: number;
  changePercent: number;
  previousClose?: number;
}

/**
 * 统一的股票价格服务
 * 负责股票价格的获取、缓存和更新逻辑
 */
export class StockPriceService {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 批量获取股票价格（带缓存逻辑）
   */
  static async getStockPrices(symbols: string[]): Promise<StockPriceData[]> {
    if (symbols.length === 0) {
      return [];
    }

    // 去重处理
    const uniqueSymbols = [...new Set(symbols.map((s) => s.trim().toUpperCase()))];

    // 首先尝试从缓存中获取数据（5分钟内的数据认为是新鲜的）
    const fiveMinutesAgo = new Date(Date.now() - this.CACHE_DURATION);
    const cachedPrices = await db
      .select()
      .from(stockPrices)
      .where(inArray(stockPrices.symbol, uniqueSymbols) && gte(stockPrices.lastUpdated, fiveMinutesAgo));

    const cachedSymbols = cachedPrices.map((p) => p.symbol);
    const needUpdateSymbols = uniqueSymbols.filter((symbol) => !cachedSymbols.includes(symbol));

    // 为缓存的价格数据添加涨停跌停价格
    const allPrices: StockPriceData[] = cachedPrices.map((price) => {
      const { limitUp, limitDown } = this.calculateLimitPrices(
        price.symbol,
        price.currentPrice.toString(),
        price.changePercent.toString(),
      );
      return {
        ...price,
        currentPrice: price.currentPrice.toString(),
        change: price.change.toString(),
        changePercent: price.changePercent.toString(),
        volume: price.volume?.toString() ?? null,
        turnover: price.turnover?.toString() ?? null,
        marketValue: price.marketValue?.toString() ?? null,
        limitUp,
        limitDown,
      };
    });

    // 如果有需要更新的股票，从外部接口获取
    if (needUpdateSymbols.length > 0) {
      try {
        const freshPrices = await this.fetchStockPricesFromExternal(needUpdateSymbols);
        if (freshPrices.length > 0) {
          await this.updateStockPricesInDatabase(freshPrices);
          allPrices.push(...freshPrices);
        }
      } catch (error) {
        console.error("Error fetching fresh stock prices:", error);
        // 如果获取外部数据失败，返回缓存的数据（如果有的话）
      }
    }

    return allPrices;
  }

  /**
   * 获取单个股票价格
   */
  static async getStockPrice(symbol: string): Promise<SimpleStockPrice> {
    const prices = await this.getStockPrices([symbol]);

    if (prices.length === 0) {
      // 如果没有数据，返回默认值
      return {
        currentPrice: 0,
        change: 0,
        changePercent: 0,
      };
    }

    const price = prices[0];
    return {
      currentPrice: Number(price.currentPrice),
      change: Number(price.change),
      changePercent: Number(price.changePercent),
    };
  }

  /**
   * 从外部接口获取股票价格
   */
  private static async fetchStockPricesFromExternal(symbols: string[]): Promise<StockPriceData[]> {
    // 构建腾讯财经接口请求
    const formattedSymbols = symbols.map(this.formatSymbolForTencent).join(",");
    const url = `http://qt.gtimg.cn/q=${formattedSymbols}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 腾讯财经接口返回GBK编码，需要解码
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder("gbk");
    const text = decoder.decode(buffer);
    return this.parseStockDataFromTencent(text);
  }

  /**
   * 更新数据库中的股票价格
   */
  private static async updateStockPricesInDatabase(prices: StockPriceData[]): Promise<void> {
    for (const price of prices) {
      await db
        .insert(stockPrices)
        .values({
          symbol: price.symbol,
          name: price.name,
          currentPrice: price.currentPrice,
          change: price.change,
          changePercent: price.changePercent,
          volume: price.volume,
          turnover: price.turnover,
          marketValue: price.marketValue,
          lastUpdated: new Date(),
        })
        .onConflictDoUpdate({
          target: stockPrices.symbol,
          set: {
            name: price.name,
            currentPrice: price.currentPrice,
            change: price.change,
            changePercent: price.changePercent,
            volume: price.volume,
            turnover: price.turnover,
            marketValue: price.marketValue,
            lastUpdated: new Date(),
          },
        });
    }
  }

  /**
   * 将股票代码格式化为腾讯财经接口需要的格式
   */
  private static formatSymbolForTencent(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();

    // 如果已经有前缀，直接转换
    if (upperSymbol.startsWith("SZ")) {
      return `s_sz${upperSymbol.substring(2)}`;
    } else if (upperSymbol.startsWith("SH")) {
      return `s_sh${upperSymbol.substring(2)}`;
    } else if (upperSymbol.startsWith("HK")) {
      return `s_hk${upperSymbol.substring(2)}`;
    } else if (upperSymbol.startsWith("US")) {
      return `s_us${upperSymbol.substring(2)}`;
    }

    // 自动识别代码规则
    return this.autoDetectMarket(upperSymbol);
  }

  /**
   * 根据代码规则自动识别市场
   */
  private static autoDetectMarket(code: string): string {
    if (this.isShangHaiCode(code)) {
      return `s_sh${code}`;
    }

    if (this.isShenZhenCode(code)) {
      return `s_sz${code}`;
    }

    if (this.isIndexCode(code)) {
      return `s_${code}`;
    }

    // 默认当作深圳股票
    return `s_sz${code}`;
  }

  /**
   * 检查是否为沪市股票或ETF代码
   */
  private static isShangHaiCode(code: string): boolean {
    return code.startsWith("60") || code.startsWith("688") || code.startsWith("51") || code.startsWith("588");
  }

  /**
   * 检查是否为深市股票或ETF代码
   */
  private static isShenZhenCode(code: string): boolean {
    return (
      code.startsWith("00") ||
      code.startsWith("002") ||
      code.startsWith("30") ||
      code.startsWith("15") ||
      code.startsWith("16")
    );
  }

  /**
   * 检查是否为指数代码
   */
  private static isIndexCode(code: string): boolean {
    return code.startsWith("000") || code.startsWith("399");
  }

  /**
   * 计算涨跌停价格
   */
  private static calculateLimitPrices(symbol: string, currentPrice: string, changePercent: string) {
    const price = parseFloat(currentPrice);
    const changePercentNum = parseFloat(changePercent);

    if (isNaN(price) || price <= 0) {
      return { limitUp: "0.000", limitDown: "0.000" };
    }

    // 获取涨跌幅限制百分比
    const limitPercent = this.getLimitPercent(symbol);

    // 计算昨日收盘价（基于当前价格和涨跌幅反推）
    const yesterdayPrice = price / (1 + changePercentNum / 100);

    // 计算涨停价和跌停价
    const limitUp = yesterdayPrice * (1 + limitPercent / 100);
    const limitDown = yesterdayPrice * (1 - limitPercent / 100);

    return {
      limitUp: limitUp.toFixed(3),
      limitDown: limitDown.toFixed(3),
    };
  }

  /**
   * 获取股票涨跌幅限制百分比
   */
  private static getLimitPercent(symbol: string): number {
    const code = symbol.replace(/^(SH|SZ|HK|US)/, "");

    // 沪市主板（60开头）
    if (code.startsWith("60")) {
      return 10;
    }

    // 深市主板（00开头）
    if (code.startsWith("00")) {
      return 10;
    }

    // 深交所创业板（300开头）
    if (code.startsWith("300")) {
      return 20;
    }

    // 上交所科创板（688开头）
    if (code.startsWith("688")) {
      return 20;
    }

    // 北交所（8开头）
    if (code.startsWith("8")) {
      return 30;
    }

    // 默认10%（其他情况）
    return 10;
  }

  /**
   * 检查数据行是否有效
   */
  private static isValidDataLine(line: string): boolean {
    return Boolean(line.trim()) && line.includes("=");
  }

  /**
   * 提取数据行中的变量名和值
   */
  private static extractLineData(line: string): { varName: string; dataStr: string } | null {
    const match = line.match(/v_([^=]+)="([^"]+)"/);
    if (!match) return null;

    const [, varName, dataStr] = match;
    return { varName, dataStr };
  }

  /**
   * 检查数据部分是否足够
   */
  private static hasEnoughDataParts(parts: string[]): boolean {
    return parts.length >= 6;
  }

  /**
   * 构建股票数据对象
   */
  private static buildStockDataObject(varName: string, parts: string[]): StockPriceData {
    const symbol = this.extractOriginalSymbol(varName);
    const currentPrice = parts[3] || "0";
    const changePercent = parts[5] || "0";

    // 计算涨跌停价格
    const { limitUp, limitDown } = this.calculateLimitPrices(symbol, currentPrice, changePercent);

    return {
      symbol,
      name: (parts[1] || "").replace(/\s+/g, ""), // 处理名称中的空白字符
      currentPrice,
      change: parts[4] || "0",
      changePercent,
      volume: parts[6] || "0",
      turnover: parts[7] || "0",
      marketValue: parts[9] || "0",
      limitUp,
      limitDown,
      lastUpdated: new Date(),
    };
  }

  /**
   * 解析单行数据
   */
  private static parseStockDataLine(line: string): StockPriceData | null {
    if (!this.isValidDataLine(line)) return null;

    try {
      const lineData = this.extractLineData(line);
      if (!lineData) return null;

      const { varName, dataStr } = lineData;
      const parts = dataStr.split("~");

      if (!this.hasEnoughDataParts(parts)) return null;

      return this.buildStockDataObject(varName, parts);
    } catch (error) {
      console.error("Error parsing stock data line:", line, error);
      return null;
    }
  }

  /**
   * 解析腾讯财经接口返回的数据
   */
  private static parseStockDataFromTencent(text: string): StockPriceData[] {
    const results = [];
    const lines = text.split("\n");

    for (const line of lines) {
      const stockData = this.parseStockDataLine(line);
      if (stockData) {
        results.push(stockData);
      }
    }

    return results;
  }

  /**
   * 从腾讯财经变量名提取原始股票代码
   */
  private static extractOriginalSymbol(varName: string): string {
    // varName 格式如 s_sz000858
    if (varName.startsWith("s_sz")) {
      return `SZ${varName.substring(4)}`;
    } else if (varName.startsWith("s_sh")) {
      return `SH${varName.substring(4)}`;
    } else if (varName.startsWith("s_hk")) {
      return `HK${varName.substring(4)}`;
    } else if (varName.startsWith("s_us")) {
      return `US${varName.substring(4)}`;
    }

    return varName.toUpperCase();
  }
}
