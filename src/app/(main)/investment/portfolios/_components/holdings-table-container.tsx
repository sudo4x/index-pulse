import { useState, useEffect, useRef, useCallback } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useHoldingsTableLogic } from "@/hooks/use-holdings-table-logic";
import { usePriceUpdates } from "@/hooks/use-price-updates";
import { useToast } from "@/hooks/use-toast";
import { HoldingDetail } from "@/types/investment";

import { HoldingDialogsManager } from "./holding-dialogs-manager";
import { HoldingsDataTable } from "./holdings-data-table";
import { PriceStatusIndicator } from "./price-status-indicator";

interface HoldingsTableContainerProps {
  portfolioId: string;
  showHistorical: boolean;
}

export function HoldingsTableContainer({ portfolioId, showHistorical }: HoldingsTableContainerProps) {
  const [holdings, setHoldings] = useState<HoldingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // 使用新的价格更新Hook
  const { isConnected, isConnecting, error: priceError, prices, subscribe, unsubscribe, stats } = usePriceUpdates();

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

  // 使用业务逻辑Hook
  const [tableState, tableActions] = useHoldingsTableLogic(portfolioId, fetchHoldings);

  // 使用防抖获取数据
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (portfolioId && portfolioId !== "undefined") {
      timeoutRef.current = setTimeout(() => {
        fetchHoldings();
      }, 50);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [portfolioId, showHistorical, fetchHoldings]);

  // 管理价格订阅 - 简化逻辑，只需要在连接成功时订阅一次
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    // 只在连接成功且有持仓时才订阅
    if (isConnected && holdings.length > 0 && !hasSubscribedRef.current) {
      console.log("连接成功，订阅所有价格数据");
      subscribe();
      hasSubscribedRef.current = true;
    } else if (!isConnected) {
      // 连接断开时重置订阅状态
      hasSubscribedRef.current = false;
    }
  }, [isConnected, holdings.length, subscribe]);

  // 组件卸载时清理订阅
  useEffect(() => {
    return () => {
      if (hasSubscribedRef.current) {
        console.log("组件卸载，取消订阅");
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  // 价格更新处理
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      setHoldings((prevHoldings) =>
        prevHoldings.map((holding) => {
          const priceUpdate = prices[holding.symbol];
          if (priceUpdate) {
            // 计算新的市值和盈亏
            const newMarketValue = holding.shares * priceUpdate.currentPrice;
            const floatAmount = newMarketValue - holding.holdCost * holding.shares;
            const floatRate = holding.holdCost > 0 ? floatAmount / (holding.holdCost * holding.shares) : 0;

            return {
              ...holding,
              currentPrice: priceUpdate.currentPrice,
              change: priceUpdate.change,
              changePercent: priceUpdate.changePercent,
              marketValue: newMarketValue,
              floatAmount,
              floatRate,
            };
          }
          return holding;
        }),
      );
    }
  }, [prices]);

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
    <>
      <Card className="shadow-xs">
        <CardContent className="flex size-full flex-col gap-4">
          {/* 价格状态指示器 */}
          <PriceStatusIndicator
            isConnected={isConnected}
            isConnecting={isConnecting}
            error={priceError}
            totalUpdates={stats.totalUpdates}
          />

          {/* 数据表格 */}
          <HoldingsDataTable
            holdings={holdings}
            onAddClick={tableActions.handleAddClick}
            onShowTransactions={tableActions.handleShowTransactions}
            onDeleteClick={tableActions.handleDeleteClick}
          />
        </CardContent>
      </Card>

      {/* 对话框管理器 */}
      <HoldingDialogsManager
        portfolioId={portfolioId}
        isTransactionDialogOpen={tableState.isTransactionDialogOpen}
        selectedHolding={tableState.selectedHolding}
        onTransactionDialogClose={tableActions.closeTransactionDialog}
        isTransactionListOpen={tableState.isTransactionListOpen}
        selectedSymbol={tableState.selectedSymbol}
        selectedStockName={tableState.selectedStockName}
        onTransactionListClose={tableActions.closeTransactionList}
        isDeleteDialogOpen={tableState.isDeleteDialogOpen}
        deletingHolding={tableState.deletingHolding}
        isDeleting={tableState.isDeleting}
        onDeleteDialogClose={tableActions.closeDeleteDialog}
        onDeleteConfirm={tableActions.handleDeleteHolding}
        onDataRefresh={fetchHoldings}
      />
    </>
  );
}
