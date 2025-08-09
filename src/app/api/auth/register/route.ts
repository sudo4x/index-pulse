import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncAuthUser } from "@/lib/auth/sync-user";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "邮箱和密码不能为空" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "密码至少需要 6 个字符" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        return NextResponse.json(
          { success: false, error: "该邮箱已被注册" },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // 如果用户创建成功，同步到我们的数据库
    if (data.user && data.user.email) {
      try {
        await syncAuthUser({
          id: data.user.id,
          email: data.user.email,
        });
      } catch (syncError) {
        console.error("Failed to sync user:", syncError);
        // 不影响注册流程，只记录错误
      }
    }

    return NextResponse.json({
      success: true,
      message: data.user?.email_confirmed_at 
        ? "注册成功，可以直接登录" 
        : "注册成功，请检查邮箱中的验证链接",
      user: data.user,
      needsVerification: !data.user?.email_confirmed_at,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}