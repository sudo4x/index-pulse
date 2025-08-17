import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { holdings } from "@/lib/db/schema";

/**
 * 获取所有需要监控的股票代码
 * 用于Cloudflare Workers WebSocket服务
 */
export async function GET() {
  try {
    // 验证用户身份（可选，根据需要决定是否需要认证）
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取所有活跃持仓的股票代码（去重）
    const activeSymbols = await db
      .selectDistinct({ 
        symbol: holdings.symbol,
        name: holdings.name 
      })
      .from(holdings)
      .where(eq(holdings.isActive, true));

    // 提取股票代码并去重
    const symbols = [...new Set(activeSymbols.map(h => h.symbol))];
    
    console.log(`返回 ${symbols.length} 个活跃股票代码:`, symbols);

    return NextResponse.json({
      success: true,
      data: {
        symbols,
        count: symbols.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("Error fetching symbols:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch symbols",
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    );
  }
}

/**
 * 获取所有股票代码（无认证版本，供Cloudflare Workers调用）
 * 如果需要公开访问，可以考虑添加API密钥验证
 */
export async function POST(request: Request) {
  try {
    // 可以添加API密钥验证
    // const apiKey = request.headers.get('x-api-key');
    // if (apiKey !== process.env.INTERNAL_API_KEY) {
    //   return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    // }

    // 获取所有活跃持仓的股票代码
    const activeSymbols = await db
      .selectDistinct({ 
        symbol: holdings.symbol,
        name: holdings.name 
      })
      .from(holdings)
      .where(eq(holdings.isActive, true));

    // 提取股票代码并去重
    const symbols = [...new Set(activeSymbols.map(h => h.symbol))];
    
    console.log(`Cloudflare Workers请求: 返回 ${symbols.length} 个股票代码`);

    return NextResponse.json({
      success: true,
      data: {
        symbols,
        count: symbols.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("Error fetching symbols for Cloudflare Workers:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch symbols",
        timestamp: new Date().toISOString(),
      }, 
      { status: 500 }
    );
  }
}