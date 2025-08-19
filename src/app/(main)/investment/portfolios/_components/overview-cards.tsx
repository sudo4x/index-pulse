"use client";

import { TrendingUp, TrendingDown, DollarSign, PieChart, Wallet, Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/utils/format-utils";
import { PortfolioOverview } from "@/types/investment";

interface OverviewCardsProps {
  portfolio: PortfolioOverview;
}

export function OverviewCards({ portfolio }: OverviewCardsProps) {
  const overviewData = [
    {
      title: "总资产",
      value: formatCurrency(portfolio.totalAssets),
      icon: DollarSign,
      description: "持有现金 + 持仓市值",
    },
    {
      title: "总市值",
      value: formatCurrency(portfolio.marketValue),
      icon: PieChart,
      description: "当前所有持仓总市值",
    },
    {
      title: "现金",
      value: formatCurrency(portfolio.cash),
      icon: Wallet,
      description: "可用于投资的现金",
    },
    {
      title: "本金",
      value: formatCurrency(portfolio.principal),
      icon: Target,
      description: "累计投入本金",
    },
  ];

  const performanceData = [
    {
      title: "今日盈亏",
      value: formatCurrency(portfolio.dayFloatAmount),
      rate: formatPercent(portfolio.dayFloatRate),
      icon: portfolio.dayFloatAmount >= 0 ? TrendingUp : TrendingDown,
      isPositive: portfolio.dayFloatAmount >= 0,
      description: "今日盈亏金额",
    },
    {
      title: "浮动盈亏",
      value: formatCurrency(portfolio.floatAmount),
      rate: formatPercent(portfolio.floatRate),
      icon: portfolio.floatAmount >= 0 ? TrendingUp : TrendingDown,
      isPositive: portfolio.floatAmount >= 0,
      description: "持仓浮动盈亏",
    },
    {
      title: "累计盈亏",
      value: formatCurrency(portfolio.accumAmount),
      rate: formatPercent(portfolio.accumRate),
      icon: portfolio.accumAmount >= 0 ? TrendingUp : TrendingDown,
      isPositive: portfolio.accumAmount >= 0,
      description: "历史累计盈亏",
    },
  ];

  return (
    <div className="space-y-4">
      {/* 基础数据 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewData.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-muted-foreground text-xs">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 盈亏数据 */}
      <div className="grid gap-4 md:grid-cols-3">
        {performanceData.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className={cn("size-4", item.isPositive ? "text-green-600" : "text-red-600")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", item.isPositive ? "text-green-600" : "text-red-600")}>
                {item.value}
              </div>
              <div className="flex items-center space-x-2">
                <span className={cn("text-sm font-medium", item.isPositive ? "text-green-600" : "text-red-600")}>
                  {item.rate}
                </span>
                <span className="text-muted-foreground text-xs">{item.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
