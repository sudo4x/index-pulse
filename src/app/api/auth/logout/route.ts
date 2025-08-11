import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "退出登录成功",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
  }
}
