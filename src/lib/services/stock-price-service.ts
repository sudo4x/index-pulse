import { StockPrice } from "./types/calculator-types";

/**
 * 统一的股票价格服务
 * 负责股票价格的获取和涨跌停价格计算
 */
export class StockPriceService {
  /**
   * 批量获取股票价格
   */
  static async getStockPrices(symbols: string[]): Promise<StockPrice[]> {
    if (symbols.length === 0) {
      return [];
    }

    // 去重处理
    const uniqueSymbols = [...new Set(symbols.map((s) => s.trim().toUpperCase()))];

    try {
      return await this.fetchStockPricesFromExternal(uniqueSymbols);
    } catch (error) {
      console.error("Error fetching stock prices:", error);
      // 如果获取失败，返回空数组或默认数据
      return uniqueSymbols.map((symbol) => ({
        symbol,
        name: "",
        currentPrice: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
        limitUp: "0.000",
        limitDown: "0.000",
      }));
    }
  }

  /**
   * 获取单个股票价格
   */
  static async getStockPrice(symbol: string): Promise<StockPrice> {
    const prices = await this.getStockPrices([symbol]);

    if (prices.length === 0) {
      // 如果没有数据，返回默认值
      return {
        symbol,
        name: "",
        currentPrice: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
        limitUp: "0.000",
        limitDown: "0.000",
      };
    }

    return prices[0];
  }

  /**
   * 批量获取股票价格并返回Map形式
   */
  static async getStockPriceMap(symbols: string[]): Promise<Map<string, StockPrice>> {
    const prices = await this.getStockPrices(symbols);
    const priceMap = new Map<string, StockPrice>();

    for (const price of prices) {
      priceMap.set(price.symbol, price);
    }

    return priceMap;
  }

  /**
   * 从外部接口获取股票价格
   */
  private static async fetchStockPricesFromExternal(symbols: string[]): Promise<StockPrice[]> {
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
  private static buildStockDataObject(varName: string, parts: string[]): StockPrice {
    const symbol = this.extractOriginalSymbol(varName);
    const currentPrice = parseFloat(parts[3] || "0");
    const changePercentRaw = parts[5] || "0";

    // 腾讯财经接口返回的是百分号后的数字（如 1.5 表示 1.5%）
    const changePercent = parseFloat(changePercentRaw) / 100;
    const change = parseFloat(parts[4] || "0");

    // 计算昨日收盘价（基于当前价格和涨跌额）
    const previousClose = currentPrice - change;

    // 计算涨跌停价格（使用原始的百分号后数字）
    const { limitUp, limitDown } = this.calculateLimitPrices(symbol, currentPrice.toString(), changePercentRaw);

    return {
      symbol,
      name: (parts[1] || "").replace(/\s+/g, ""), // 处理名称中的空白字符
      currentPrice,
      change,
      changePercent,
      previousClose,
      limitUp,
      limitDown,
    };
  }

  /**
   * 解析单行数据
   */
  private static parseStockDataLine(line: string): StockPrice | null {
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
  private static parseStockDataFromTencent(text: string): StockPrice[] {
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
