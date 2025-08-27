import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

// 根据股票名称查找对应的股票代码
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "股票名称参数不能为空" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    );

    // 获取用户信息
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "用户未登录" }, { status: 401 });
    }

    const trimmedName = name.trim();

    // 查询交易记录表中是否有相同名称的记录
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("symbol")
      .eq("user_id", user.id)
      .eq("name", trimmedName)
      .limit(1);

    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json({ error: "查询数据库时发生错误" }, { status: 500 });
    }

    if (transactions && transactions.length > 0) {
      return NextResponse.json({
        success: true,
        symbol: transactions[0].symbol,
        name: trimmedName,
      });
    }

    // 未找到匹配记录
    return NextResponse.json({
      success: false,
      message: `未找到股票"${trimmedName}"的历史交易记录`,
    });
  } catch (error) {
    console.error("Error in symbol lookup API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
