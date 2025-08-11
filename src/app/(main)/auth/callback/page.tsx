"use client";

import { useEffect, useState } from "react";

import { useSearchParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get("code");
        const next = searchParams.get("next") ?? "/dashboard/default";

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Auth callback error:", error);
            setStatus("error");
            setMessage("验证失败：" + error.message);
            return;
          }

          if (data.user) {
            setStatus("success");
            setMessage("邮箱验证成功！正在跳转...");

            // 延迟跳转，让用户看到成功消息
            setTimeout(() => {
              router.push(next);
            }, 2000);
            return;
          }
        }

        // 如果没有code参数，可能是直接访问
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.push("/dashboard/default");
        } else {
          setStatus("error");
          setMessage("未找到有效的验证信息");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage("处理验证时发生错误");
      }
    };

    handleAuthCallback();
  }, [searchParams, router, supabase]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="mx-auto max-w-md space-y-4 text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p className="text-muted-foreground">正在验证...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 p-2">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600">验证成功！</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 p-2">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600">验证失败</h1>
            <p className="text-muted-foreground">{message}</p>
            <button
              onClick={() => router.push("/auth/v1/login")}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              返回登录
            </button>
          </>
        )}
      </div>
    </div>
  );
}
