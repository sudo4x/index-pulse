import { NextResponse } from "next/server";

import { syncAuthUser } from "@/lib/auth/sync-user";
import { createClient } from "@/lib/supabase/server";

// 验证请求参数
function validateRequestParams(email: string, password: string) {
  if (!email || !password) {
    return { valid: false, error: "邮箱和密码不能为空" };
  }

  if (password.length < 6) {
    return { valid: false, error: "密码至少需要 6 个字符" };
  }

  return { valid: true };
}

// 处理注册错误
function handleSignUpError(error: { message: string }) {
  if (error.message.includes("already registered")) {
    return NextResponse.json({ success: false, error: "该邮箱已被注册" }, { status: 400 });
  }
  return NextResponse.json({ success: false, error: error.message }, { status: 400 });
}

// 同步用户数据
async function syncUserData(user: { id: string; email?: string } | null) {
  if (user && user.email) {
    try {
      await syncAuthUser({
        id: user.id,
        email: user.email,
      });
    } catch (syncError) {
      console.error("Failed to sync user:", syncError);
      // 不影响注册流程，只记录错误
    }
  }
}

// 构建成功响应
function buildSuccessResponse(user: { email_confirmed_at?: string } | null) {
  return NextResponse.json({
    success: true,
    message: user?.email_confirmed_at ? "注册成功，可以直接登录" : "注册成功，请检查邮箱中的验证链接",
    user,
    needsVerification: !user?.email_confirmed_at,
  });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const validation = validateRequestParams(email, password);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
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
      return handleSignUpError(error);
    }

    await syncUserData(data.user);

    return buildSuccessResponse(data.user);
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}
