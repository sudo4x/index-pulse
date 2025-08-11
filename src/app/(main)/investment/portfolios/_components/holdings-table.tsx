"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { MoreVertical, History, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const fetchHoldings = useCallback(async () => {
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
        setHoldings(result.data ?? []);
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
  }, [portfolioId, showHistorical, toast]);

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
  }, [portfolioId, showHistorical, fetchHoldings]);

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

  const renderStockNameCell = (holding: HoldingDetail) => (
    <TableCell>
      <div className="flex flex-col space-y-1">
        <div className="font-medium">{holding.name}</div>
        <div className="text-muted-foreground text-sm">{holding.symbol}</div>
        {!holding.isActive && (
          <Badge variant="secondary" className="w-fit text-xs">
            已清仓
          </Badge>
        )}
      </div>
    </TableCell>
  );

  const renderPriceChangeCell = (holding: HoldingDetail) => (
    <TableCell className="text-right">
      <div className="flex flex-col items-end space-y-1">
        <div className={cn("font-mono", holding.change >= 0 ? "text-green-600" : "text-red-600")}>
          {holding.change >= 0 ? "+" : ""}
          {holding.change.toFixed(2)}
        </div>
        <div className={cn("font-mono text-sm", holding.changePercent >= 0 ? "text-green-600" : "text-red-600")}>
          {holding.changePercent >= 0 ? "+" : ""}
          {formatPercent(holding.changePercent)}
        </div>
      </div>
    </TableCell>
  );

  const renderCostCell = (holding: HoldingDetail) => (
    <TableCell className="text-right">
      <div className="flex flex-col items-end space-y-1">
        <div className="font-mono text-sm">{formatCurrency(holding.dilutedCost)}</div>
        <div className="text-muted-foreground font-mono text-sm">{formatCurrency(holding.holdCost)}</div>
      </div>
    </TableCell>
  );

  const renderProfitLossCell = (amount: number, rate: number) => (
    <TableCell className="text-right">
      <div className="flex flex-col items-end space-y-1">
        <div className={cn("font-mono", amount >= 0 ? "text-green-600" : "text-red-600")}>
          {amount >= 0 ? "+" : ""}
          {formatCurrency(amount)}
        </div>
        <div className={cn("font-mono text-sm", rate >= 0 ? "text-green-600" : "text-red-600")}>
          {rate >= 0 ? "+" : ""}
          {formatPercent(rate)}
        </div>
      </div>
    </TableCell>
  );

  const renderActionsCell = (holding: HoldingDetail) => (
    <TableCell className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => console.log("交易记录", holding.symbol)}>
            <History className="mr-2 h-4 w-4" />
            交易记录
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log("删除持仓", holding.symbol)} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            删除持仓
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  );

  const renderHoldingRow = (holding: HoldingDetail) => (
    <TableRow key={holding.id}>
      {renderStockNameCell(holding)}
      <TableCell className="text-right">
        <div className="font-mono">{formatCurrency(holding.currentPrice)}</div>
      </TableCell>
      {renderPriceChangeCell(holding)}
      <TableCell className="text-right">
        <div className="font-mono">{formatCurrency(holding.marketValue)}</div>
      </TableCell>
      <TableCell className="text-right">
        <div className="font-mono">{formatShares(holding.shares)}</div>
      </TableCell>
      {renderCostCell(holding)}
      {renderProfitLossCell(holding.floatAmount, holding.floatRate)}
      {renderProfitLossCell(holding.accumAmount, holding.accumRate)}
      {renderActionsCell(holding)}
    </TableRow>
  );

  if (isLoading) {
    return (
      <Card>
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
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center space-y-2">
            <div className="text-muted-foreground">还没有持仓记录</div>
            <div className="text-muted-foreground text-sm">
              {showHistorical ? "没有找到历史持仓记录" : "开始您的第一笔交易"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
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
          <TableBody>{holdings.map(renderHoldingRow)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
