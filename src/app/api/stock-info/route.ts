import { NextResponse } from "next/server";

import { StockPriceService } from "@/lib/services/stock-price-service";

// 获取股票信息（包含价格、名称等完整信息）
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

    // 使用股票价格服务获取完整股票信息
    const allStockInfo = await StockPriceService.getStockPrices(symbolList);

    return NextResponse.json({
      success: true,
      data: allStockInfo,
    });
  } catch (error) {
    console.error("Error in stock info API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
