import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PortfolioCalculator } from "@/lib/services/portfolio-calculator";

interface Params {
  portfolioId: string;
}

// 获取投资组合概览数据
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  try {
    const { portfolioId } = await params;
    const portfolioIdInt = parseInt(portfolioId);

    if (isNaN(portfolioIdInt)) {
      return NextResponse.json({ error: "portfolioId 必须是有效的数字" }, { status: 400 });
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 计算组合概览数据
    const overview = await PortfolioCalculator.calculatePortfolioOverview(portfolioId);

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error("Error fetching portfolio overview:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
