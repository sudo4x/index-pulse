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

interface HoldingsTableContainerProps {
  portfolioId: string;
}

export function HoldingsTableContainer({ portfolioId }: HoldingsTableContainerProps) {
  const [holdings, setHoldings] = useState<HoldingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistorical, setShowHistorical] = useState(false);
  const [enablePriceUpdates, setEnablePriceUpdates] = useState(() =>
    getLocalStorageItem(LOCAL_STORAGE_KEYS.HOLDINGS_PRICE_UPDATES_ENABLED, false),
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // 使用新的价格更新Hook
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
    // 连接/断开由use-price-updates内部的动态连接控制处理
  };

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

  // 管理价格订阅 - 只在启用价格更新时才进行订阅
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    // 只处理订阅逻辑，连接/断开由use-price-updates内部的动态连接控制处理
    if (enablePriceUpdates && isConnected && holdings.length > 0 && !hasSubscribedRef.current) {
      console.log("连接成功，订阅所有价格数据");
      subscribe();
      hasSubscribedRef.current = true;
    } else if (!isConnected || !enablePriceUpdates) {
      // 连接断开或禁用价格更新时重置订阅状态
      hasSubscribedRef.current = false;
    }
  }, [enablePriceUpdates, isConnected, holdings.length, subscribe]);

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
            const profitAmount = newMarketValue - holding.cost * holding.shares;
            const profitRate = holding.cost > 0 ? (priceUpdate.currentPrice - holding.cost) / holding.cost : 0;

            return {
              ...holding,
              currentPrice: priceUpdate.currentPrice,
              change: priceUpdate.change,
              changePercent: priceUpdate.changePercent,
              marketValue: newMarketValue,
              profitAmount,
              profitRate,
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
          <CardTitle>持仓品种</CardTitle>
          <CardAction>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-price-updates"
                  checked={enablePriceUpdates}
                  onCheckedChange={(checked) => handlePriceUpdatesChange(checked === true)}
                />
                <Label htmlFor="enable-price-updates" className="text-sm font-medium">
                  价格更新
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-historical"
                  checked={showHistorical}
                  onCheckedChange={(checked) => setShowHistorical(checked === true)}
                />
                <Label htmlFor="show-historical" className="text-sm font-medium">
                  显示历史持仓
                </Label>
              </div>
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
          <CardTitle>持仓品种</CardTitle>
          <CardAction>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-price-updates"
                  checked={enablePriceUpdates}
                  onCheckedChange={(checked) => handlePriceUpdatesChange(checked === true)}
                />
                <Label htmlFor="enable-price-updates" className="text-sm font-medium">
                  价格更新
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-historical"
                  checked={showHistorical}
                  onCheckedChange={(checked) => setShowHistorical(checked === true)}
                />
                <Label htmlFor="show-historical" className="text-sm font-medium">
                  显示历史持仓
                </Label>
              </div>
            </div>
          </CardAction>
        </CardHeader>
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
        <CardHeader>
          <CardTitle>持仓品种</CardTitle>
          <CardAction>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-price-updates"
                  checked={enablePriceUpdates}
                  onCheckedChange={(checked) => handlePriceUpdatesChange(checked === true)}
                />
                <Label htmlFor="enable-price-updates" className="text-sm font-medium">
                  价格更新
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-historical"
                  checked={showHistorical}
                  onCheckedChange={(checked) => setShowHistorical(checked === true)}
                />
                <Label htmlFor="show-historical" className="text-sm font-medium">
                  显示历史持仓
                </Label>
              </div>
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
        onDataRefresh={fetchHoldings}
      />
    </>
  );
}
