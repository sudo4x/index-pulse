"use client";

import { useState, useEffect, useRef } from "react";
import { MoreVertical, Plus, History, Trash2, TrendingUp, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { HoldingDetail } from "@/types/investment";

interface HoldingsTableProps {
  portfolioId: string;
  showHistorical: boolean;
}

export function HoldingsTable({ portfolioId, showHistorical }: HoldingsTableProps) {
  const [holdings, setHoldings] = useState<HoldingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHoldings = async () => {
    if (!portfolioId || portfolioId === "undefined") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/holdings?portfolioId=${portfolioId}&includeHistorical=${showHistorical}`);
      
      if (!response.ok) {
        throw new Error("获取持仓数据失败");
      }
      const result = await response.json();
      
      if (result.success) {
        setHoldings(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching holdings:", error);
      toast({
        title: "错误",
        description: "获取持仓数据失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (portfolioId && portfolioId !== "undefined") {
      timeoutRef.current = setTimeout(() => {
        fetchHoldings();
      }, 50); // 50ms 防抖
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [portfolioId, showHistorical]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatShares = (shares: number) => {
    return shares.toLocaleString("zh-CN");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>持仓</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>持仓</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center space-y-2">
            <div className="text-muted-foreground">还没有持仓记录</div>
            <div className="text-sm text-muted-foreground">
              {showHistorical ? "没有找到历史持仓记录" : "开始您的第一笔交易"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>持仓 ({holdings.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称/代码</TableHead>
              <TableHead className="text-right">现价</TableHead>
              <TableHead className="text-right">涨跌</TableHead>
              <TableHead className="text-right">市值</TableHead>
              <TableHead className="text-right">持仓</TableHead>
              <TableHead className="text-right">摊薄/成本</TableHead>
              <TableHead className="text-right">浮动盈亏</TableHead>
              <TableHead className="text-right">累计盈亏</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.id}>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="font-medium">{holding.name}</div>
                    <div className="text-sm text-muted-foreground">{holding.symbol}</div>
                    {!holding.isActive && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        已清仓
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono">
                    {formatCurrency(holding.currentPrice)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end space-y-1">
                    <div className={cn(
                      "font-mono",
                      holding.change >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {holding.change >= 0 ? "+" : ""}{holding.change.toFixed(2)}
                    </div>
                    <div className={cn(
                      "text-sm font-mono",
                      holding.changePercent >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {holding.changePercent >= 0 ? "+" : ""}{formatPercent(holding.changePercent)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono">
                    {formatCurrency(holding.marketValue)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono">
                    {formatShares(holding.shares)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end space-y-1">
                    <div className="font-mono text-sm">
                      {formatCurrency(holding.dilutedCost)}
                    </div>
                    <div className="font-mono text-sm text-muted-foreground">
                      {formatCurrency(holding.holdCost)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end space-y-1">
                    <div className={cn(
                      "font-mono",
                      holding.floatAmount >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {holding.floatAmount >= 0 ? "+" : ""}{formatCurrency(holding.floatAmount)}
                    </div>
                    <div className={cn(
                      "text-sm font-mono",
                      holding.floatRate >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {holding.floatRate >= 0 ? "+" : ""}{formatPercent(holding.floatRate)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end space-y-1">
                    <div className={cn(
                      "font-mono",
                      holding.accumAmount >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {holding.accumAmount >= 0 ? "+" : ""}{formatCurrency(holding.accumAmount)}
                    </div>
                    <div className={cn(
                      "text-sm font-mono",
                      holding.accumRate >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {holding.accumRate >= 0 ? "+" : ""}{formatPercent(holding.accumRate)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 p-0">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <History className="size-4 mr-2" />
                        交易记录
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Plus className="size-4 mr-2" />
                        添加交易
                      </DropdownMenuItem>
                      {!holding.isActive && (
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="size-4 mr-2" />
                          删除持仓
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}