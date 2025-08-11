import { NextResponse } from "next/server";

import { syncAuthUser } from "@/lib/auth/sync-user";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "邮箱和密码不能为空" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase auth error:", error);
      return NextResponse.json({ success: false, error: `登录失败: ${error.message}` }, { status: 401 });
    }

    // 登录成功时，确保用户数据已同步
    if (data.user?.email) {
      try {
        await syncAuthUser({
          id: data.user.id,
          email: data.user.email,
        });
      } catch (syncError) {
        console.error("Failed to sync user on login:", syncError);
        // 不影响登录流程，只记录错误
      }
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      message: "登录成功",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}
