"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useHoldingsTableLogic } from "@/hooks/use-holdings-table-logic";
import { usePriceUpdates } from "@/hooks/use-price-updates";
import { useToast } from "@/hooks/use-toast";
import { getLocalStorageItem, setLocalStorageItem, LOCAL_STORAGE_KEYS } from "@/lib/utils/local-storage";
import { HoldingDetail } from "@/types/investment";

import { HoldingDialogsManager } from "./holding-dialogs-manager";
import { HoldingsDataTable } from "./holdings-data-table";
import { PriceStatusIndicator } from "./price-status-indicator";

interface LiquidatedHoldingsTableProps {
  portfolioId: string;
}

export function LiquidatedHoldingsTable({ portfolioId }: LiquidatedHoldingsTableProps) {
  const [holdings, setHoldings] = useState<HoldingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enablePriceUpdates, setEnablePriceUpdates] = useState(() =>
    getLocalStorageItem(LOCAL_STORAGE_KEYS.HOLDINGS_PRICE_UPDATES_ENABLED, false),
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // 使用价格更新Hook
  const {
    isConnected,
    isConnecting,
    error: priceError,
    prices,
    subscribe,
    unsubscribe,
    lastUpdate,
  } = usePriceUpdates({
    autoConnect: enablePriceUpdates,
  });

  // 保存价格更新设置
  const handlePriceUpdatesChange = (checked: boolean) => {
    setEnablePriceUpdates(checked);
    setLocalStorageItem(LOCAL_STORAGE_KEYS.HOLDINGS_PRICE_UPDATES_ENABLED, checked);
  };

  const fetchLiquidatedHoldings = useCallback(async () => {
    if (!portfolioId || portfolioId === "undefined") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 获取已清仓的持仓记录（includeHistorical=true 但只取 isActive=false）
      const response = await fetch(`/api/holdings?portfolioId=${portfolioId}&includeHistorical=true`);

      if (!response.ok) {
        throw new Error("获取已清仓持仓数据失败");
      }
      const result = await response.json();

      if (result.success) {
        // 过滤出已清仓的记录
        const liquidatedHoldings = (result.data ?? []).filter((holding: HoldingDetail) => !holding.isActive);
        setHoldings(liquidatedHoldings);
      }
    } catch (error) {
      console.error("Error fetching liquidated holdings:", error);
      toast({
        title: "错误",
        description: "获取已清仓持仓数据失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, toast]);

  // 使用业务逻辑Hook
  const [tableState, tableActions] = useHoldingsTableLogic(portfolioId, fetchLiquidatedHoldings);

  // 使用防抖获取数据
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (portfolioId && portfolioId !== "undefined") {
      timeoutRef.current = setTimeout(() => {
        fetchLiquidatedHoldings();
      }, 50);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [portfolioId, fetchLiquidatedHoldings]);

  // 管理价格订阅
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    if (enablePriceUpdates && isConnected && holdings.length > 0 && !hasSubscribedRef.current) {
      console.log("连接成功，订阅已清仓品种价格数据");
      subscribe();
      hasSubscribedRef.current = true;
    } else if (!isConnected || !enablePriceUpdates) {
      hasSubscribedRef.current = false;
    }
  }, [enablePriceUpdates, isConnected, holdings.length, subscribe]);

  // 组件卸载时清理订阅
  useEffect(() => {
    return () => {
      if (hasSubscribedRef.current) {
        console.log("已清仓组件卸载，取消订阅");
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
            // 已清仓持仓不需要计算盈亏，但可以显示当前价格变化
            return {
              ...holding,
              currentPrice: priceUpdate.currentPrice,
              change: priceUpdate.change,
              changePercent: priceUpdate.changePercent,
            };
          }
          return holding;
        }),
      );
    }
  }, [prices]);

  if (isLoading) {
    return (
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>已清仓品种</CardTitle>
          <CardAction>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-price-updates-liquidated"
                checked={enablePriceUpdates}
                onCheckedChange={(checked) => handlePriceUpdatesChange(checked === true)}
              />
              <Label htmlFor="enable-price-updates-liquidated" className="text-sm font-medium">
                价格更新
              </Label>
            </div>
          </CardAction>
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
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>已清仓品种</CardTitle>
          <CardAction>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-price-updates-liquidated"
                checked={enablePriceUpdates}
                onCheckedChange={(checked) => handlePriceUpdatesChange(checked === true)}
              />
              <Label htmlFor="enable-price-updates-liquidated" className="text-sm font-medium">
                价格更新
              </Label>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center space-y-2">
            <div className="text-muted-foreground">暂无已清仓记录</div>
            <div className="text-muted-foreground text-sm">您还没有任何已清仓的持仓记录</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>已清仓品种</CardTitle>
          <CardAction>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-price-updates-liquidated"
                checked={enablePriceUpdates}
                onCheckedChange={(checked) => handlePriceUpdatesChange(checked === true)}
              />
              <Label htmlFor="enable-price-updates-liquidated" className="text-sm font-medium">
                价格更新
              </Label>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex size-full flex-col gap-2">
          {/* 价格状态指示器 */}
          <PriceStatusIndicator
            isConnected={isConnected}
            isConnecting={isConnecting}
            error={priceError}
            lastUpdate={lastUpdate}
            enabled={enablePriceUpdates}
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
        onDataRefresh={fetchLiquidatedHoldings}
      />
    </>
  );
}
