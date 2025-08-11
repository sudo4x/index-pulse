import { NextResponse } from "next/server";

import { inArray, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { stockPrices } from "@/lib/db/schema";

type StockPriceData = {
  symbol: string;
  name: string;
  currentPrice: string;
  change: string;
  changePercent: string;
  volume: string | null;
  turnover: string | null;
  marketValue: string | null;
  lastUpdated: Date;
};

// 获取股票实时行情
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols");

    if (!symbols) {
      return NextResponse.json({ error: "股票代码参数不能为空" }, { status: 400 });
    }

    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase());

    if (symbolList.length === 0) {
      return NextResponse.json({ error: "股票代码格式错误" }, { status: 400 });
    }

    // 首先尝试从缓存中获取数据（5分钟内的数据认为是新鲜的）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const cachedPrices = await db
      .select()
      .from(stockPrices)
      .where(inArray(stockPrices.symbol, symbolList) && gte(stockPrices.lastUpdated, fiveMinutesAgo));

    const cachedSymbols = cachedPrices.map((p) => p.symbol);
    const needUpdateSymbols = symbolList.filter((symbol) => !cachedSymbols.includes(symbol));

    const allPrices = [...cachedPrices];

    // 如果有需要更新的股票，从外部接口获取
    if (needUpdateSymbols.length > 0) {
      await updateStockPricesFromExternal(needUpdateSymbols, allPrices);
    }

    return NextResponse.json({
      success: true,
      data: allPrices,
    });
  } catch (error) {
    console.error("Error in stock prices API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 更新股票价格数据
async function updateStockPricesFromExternal(symbols: string[], allPrices: StockPriceData[]) {
  try {
    const freshPrices = await fetchStockPricesFromExternal(symbols);

    if (freshPrices.length > 0) {
      await updateStockPricesInDatabase(freshPrices);
      allPrices.push(...freshPrices);
    }
  } catch (error) {
    console.error("Error fetching fresh stock prices:", error);
    // 如果获取外部数据失败，返回缓存的数据（如果有的话）
  }
}

// 更新数据库中的股票价格
async function updateStockPricesInDatabase(prices: StockPriceData[]) {
  for (const price of prices) {
    await db
      .insert(stockPrices)
      .values(price)
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

// 从外部接口获取股票价格
async function fetchStockPricesFromExternal(symbols: string[]) {
  // 构建腾讯财经接口请求
  const formattedSymbols = symbols.map(formatSymbolForTencent).join(",");
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
  return parseStockDataFromTencent(text);
}

// 将股票代码格式化为腾讯财经接口需要的格式
function formatSymbolForTencent(symbol: string): string {
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
  return autoDetectMarket(upperSymbol);
}

// 根据代码规则自动识别市场
function autoDetectMarket(code: string): string {
  if (isShangHaiCode(code)) {
    return `s_sh${code}`;
  }

  if (isShenZhenCode(code)) {
    return `s_sz${code}`;
  }

  if (isIndexCode(code)) {
    return `s_${code}`;
  }

  // 默认当作深圳股票
  return `s_sz${code}`;
}

// 检查是否为沪市股票或ETF代码
function isShangHaiCode(code: string): boolean {
  return code.startsWith("60") || code.startsWith("688") || code.startsWith("51") || code.startsWith("588");
}

// 检查是否为深市股票或ETF代码
function isShenZhenCode(code: string): boolean {
  return (
    code.startsWith("00") ||
    code.startsWith("002") ||
    code.startsWith("30") ||
    code.startsWith("15") ||
    code.startsWith("16")
  );
}

// 检查是否为指数代码
function isIndexCode(code: string): boolean {
  return code.startsWith("000") || code.startsWith("399");
}

// 检查数据行是否有效
function isValidDataLine(line: string): boolean {
  return Boolean(line.trim()) && line.includes("=");
}

// 提取数据行中的变量名和值
function extractLineData(line: string): { varName: string; dataStr: string } | null {
  const match = line.match(/v_([^=]+)="([^"]+)"/);
  if (!match) return null;

  const [, varName, dataStr] = match;
  return { varName, dataStr };
}

// 检查数据部分是否足够
function hasEnoughDataParts(parts: string[]): boolean {
  return parts.length >= 6;
}

// 构建股票数据对象
function buildStockDataObject(varName: string, parts: string[]) {
  const symbol = extractOriginalSymbol(varName);

  return {
    symbol,
    name: parts[1] || "",
    currentPrice: parts[3] || "0",
    change: parts[4] || "0",
    changePercent: parts[5] || "0",
    volume: parts[6] || "0",
    turnover: parts[7] || "0",
    marketValue: parts[9] || "0",
    lastUpdated: new Date(),
  };
}

// 解析单行数据
function parseStockDataLine(line: string) {
  if (!isValidDataLine(line)) return null;

  try {
    const lineData = extractLineData(line);
    if (!lineData) return null;

    const { varName, dataStr } = lineData;
    const parts = dataStr.split("~");

    if (!hasEnoughDataParts(parts)) return null;

    return buildStockDataObject(varName, parts);
  } catch (error) {
    console.error("Error parsing stock data line:", line, error);
    return null;
  }
}

// 解析腾讯财经接口返回的数据
function parseStockDataFromTencent(text: string) {
  const results = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const stockData = parseStockDataLine(line);
    if (stockData) {
      results.push(stockData);
    }
  }

  return results;
}

// 从腾讯财经变量名提取原始股票代码
function extractOriginalSymbol(varName: string): string {
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
