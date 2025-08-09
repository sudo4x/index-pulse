import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockPrices } from "@/lib/db/schema";
import { inArray, gte } from "drizzle-orm";

// 获取股票实时行情
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols");

    if (!symbols) {
      return NextResponse.json(
        { error: "股票代码参数不能为空" },
        { status: 400 }
      );
    }

    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase());

    if (symbolList.length === 0) {
      return NextResponse.json(
        { error: "股票代码格式错误" },
        { status: 400 }
      );
    }

    // 首先尝试从缓存中获取数据（5分钟内的数据认为是新鲜的）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const cachedPrices = await db
      .select()
      .from(stockPrices)
      .where(
        inArray(stockPrices.symbol, symbolList) &&
        gte(stockPrices.lastUpdated, fiveMinutesAgo)
      );

    const cachedSymbols = cachedPrices.map((p) => p.symbol);
    const needUpdateSymbols = symbolList.filter(
      (symbol) => !cachedSymbols.includes(symbol)
    );

    let allPrices = [...cachedPrices];

    // 如果有需要更新的股票，从外部接口获取
    if (needUpdateSymbols.length > 0) {
      try {
        const freshPrices = await fetchStockPricesFromExternal(needUpdateSymbols);
        
        // 更新数据库缓存
        if (freshPrices.length > 0) {
          for (const price of freshPrices) {
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
          allPrices.push(...freshPrices);
        }
      } catch (error) {
        console.error("Error fetching fresh stock prices:", error);
        // 如果获取外部数据失败，返回缓存的数据（如果有的话）
      }
    }

    return NextResponse.json({
      success: true,
      data: allPrices,
    });
  } catch (error) {
    console.error("Error in stock prices API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 从外部接口获取股票价格
async function fetchStockPricesFromExternal(symbols: string[]) {
  // 构建腾讯财经接口请求
  const formattedSymbols = symbols.map(formatSymbolForTencent).join(",");
  const url = `http://qt.gtimg.cn/q=${formattedSymbols}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const text = await response.text();
  return parseStockDataFromTencent(text);
}

// 将股票代码格式化为腾讯财经接口需要的格式
function formatSymbolForTencent(symbol: string): string {
  // 假设输入格式为 SZ000858 或 SH600036
  const upperSymbol = symbol.toUpperCase();
  
  if (upperSymbol.startsWith("SZ")) {
    return `s_sz${upperSymbol.substring(2)}`;
  } else if (upperSymbol.startsWith("SH")) {
    return `s_sh${upperSymbol.substring(2)}`;
  } else if (upperSymbol.startsWith("HK")) {
    return `s_hk${upperSymbol.substring(2)}`;
  } else if (upperSymbol.startsWith("US")) {
    return `s_us${upperSymbol.substring(2)}`;
  }
  
  // 如果没有前缀，默认当作深圳股票
  return `s_sz${upperSymbol}`;
}

// 解析腾讯财经接口返回的数据
function parseStockDataFromTencent(text: string) {
  const results = [];
  const lines = text.split("\n");
  
  for (const line of lines) {
    if (!line.trim() || !line.includes("=")) continue;
    
    try {
      // 提取变量名和值
      const match = line.match(/v_([^=]+)="([^"]+)"/);
      if (!match) continue;
      
      const [, varName, dataStr] = match;
      const parts = dataStr.split("~");
      
      if (parts.length < 6) continue;
      
      // 从变量名提取原始股票代码
      const symbol = extractOriginalSymbol(varName);
      
      const stockData = {
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
      
      results.push(stockData);
    } catch (error) {
      console.error("Error parsing stock data line:", line, error);
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