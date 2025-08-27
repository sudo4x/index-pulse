import { NextResponse } from "next/server";

// 重定向到新的 stock-info API，保持向后兼容
export async function GET(request: Request) {
  const url = new URL(request.url);
  const newUrl = url.toString().replace("/api/stock-prices", "/api/stock-info");

  try {
    const response = await fetch(newUrl);
    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "X-Deprecated": "This API is deprecated. Please use /api/stock-info instead.",
      },
    });
  } catch (error) {
    console.error("Error redirecting to stock-info API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
