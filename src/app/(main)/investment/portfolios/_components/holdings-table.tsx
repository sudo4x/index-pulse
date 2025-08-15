"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketPrices } from "@/hooks/use-websocket-prices";
import { HoldingDetail } from "@/types/investment";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { createHoldingRowHelpers } from "./holdings-table-helpers";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionsTable } from "./transactions-table";

interface HoldingsTableProps {
  portfolioId: string;
  showHistorical: boolean;
}

export function HoldingsTable({ portfolioId, showHistorical }: HoldingsTableProps) {
  const [holdings, setHoldings] = useState<HoldingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isTransactionListOpen, setIsTransactionListOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<HoldingDetail | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedStockName, setSelectedStockName] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingHolding, setDeletingHolding] = useState<HoldingDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPollingMode, setIsPollingMode] = useState(false);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket实时价格更新
  const {
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    error: wsError,
    prices: wsPrices,
    subscribe: wsSubscribe,
    unsubscribe: wsUnsubscribe,
    stats: wsStats,
  } = useWebSocketPrices();

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

  // WebSocket订阅管理
  useEffect(() => {
    if (holdings.length > 0) {
      const symbols = holdings.map(holding => holding.symbol);
      console.log("订阅股票代码:", symbols);
      wsSubscribe(symbols);

      return () => {
        console.log("取消订阅股票代码:", symbols);
        wsUnsubscribe(symbols);
      };
    }
  }, [holdings, wsSubscribe, wsUnsubscribe]);

  // WebSocket价格更新处理
  useEffect(() => {
    if (Object.keys(wsPrices).length > 0) {
      setHoldings(prevHoldings => 
        prevHoldings.map(holding => {
          const priceUpdate = wsPrices[holding.symbol];
          if (priceUpdate) {
            // 计算新的市值和盈亏
            const newMarketValue = holding.shares * priceUpdate.currentPrice;
            const floatAmount = newMarketValue - (holding.holdCost * holding.shares);
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
        })
      );
    }
  }, [wsPrices]);

  // WebSocket错误处理
  useEffect(() => {
    if (wsError) {
      console.warn("WebSocket错误:", wsError);
      // 可以选择性地显示错误，但不影响主要功能
    }
  }, [wsError]);

  // 轮询获取价格更新（备用方案）
  const fetchPriceUpdates = useCallback(async () => {
    if (holdings.length === 0) return;

    try {
      const symbols = holdings.map(holding => holding.symbol);
      const response = await fetch(`/api/stock-prices?symbols=${symbols.join(',')}`);
      
      if (!response.ok) {
        console.error("获取价格更新失败:", response.status);
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        // 更新holdings中的价格信息
        setHoldings(prevHoldings => 
          prevHoldings.map(holding => {
            const priceUpdate = result.data.find((price: any) => price.symbol === holding.symbol);
            if (priceUpdate) {
              // 计算新的市值和盈亏
              const newMarketValue = holding.shares * Number(priceUpdate.currentPrice);
              const floatAmount = newMarketValue - (holding.holdCost * holding.shares);
              const floatRate = holding.holdCost > 0 ? floatAmount / (holding.holdCost * holding.shares) : 0;

              return {
                ...holding,
                currentPrice: Number(priceUpdate.currentPrice),
                change: Number(priceUpdate.change),
                changePercent: Number(priceUpdate.changePercent),
                marketValue: newMarketValue,
                floatAmount,
                floatRate,
              };
            }
            return holding;
          })
        );
        console.log(`轮询模式：已更新 ${result.data.length} 个股票价格`);
      }
    } catch (error) {
      console.error("轮询获取价格更新失败:", error);
    }
  }, [holdings]);

  // 轮询模式管理
  useEffect(() => {
    const shouldUsePolling = !wsConnected && holdings.length > 0;

    if (shouldUsePolling !== isPollingMode) {
      setIsPollingMode(shouldUsePolling);
    }

    if (shouldUsePolling) {
      console.log("启动轮询模式（每1分钟更新一次）");
      
      // 立即获取一次价格更新
      fetchPriceUpdates();

      // 设置轮询间隔（1分钟）
      pollingIntervalRef.current = setInterval(() => {
        // 只在页面可见时进行轮询
        if (!document.hidden) {
          fetchPriceUpdates();
        }
      }, 60000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else {
      // 清除轮询
      if (pollingIntervalRef.current) {
        console.log("停止轮询模式");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [wsConnected, holdings.length, isPollingMode, fetchPriceUpdates]);

  // 页面可见性变化处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isPollingMode && !document.hidden) {
        // 页面重新可见时，立即获取一次价格更新
        fetchPriceUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPollingMode, fetchPriceUpdates]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleDeleteHolding = async () => {
    if (!deletingHolding) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/holdings/${portfolioId}/${deletingHolding.symbol}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除持仓品种失败");
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: "成功",
          description: result.message,
        });
        fetchHoldings(); // 重新获取数据
        setIsDeleteDialogOpen(false);
        setDeletingHolding(null);
      }
    } catch (error) {
      console.error("Error deleting holding:", error);
      toast({
        title: "错误",
        description: "删除持仓品种失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShowTransactions = (holding: HoldingDetail) => {
    setSelectedSymbol(holding.symbol);
    setSelectedStockName(holding.name);
    setIsTransactionListOpen(true);
  };

  const handleAddClick = (holding: HoldingDetail) => {
    setSelectedHolding(holding);
    setIsTransactionDialogOpen(true);
  };

  const handleDeleteClick = (holding: HoldingDetail) => {
    setDeletingHolding(holding);
    setIsDeleteDialogOpen(true);
  };

  const { renderHoldingRow } = createHoldingRowHelpers({
    handleAddClick,
    handleShowTransactions,
    handleDeleteClick,
  });

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
          {/* WebSocket连接状态指示器 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">持仓列表</span>
              {wsConnecting && (
                <Badge variant="outline" className="text-xs">
                  连接中...
                </Badge>
              )}
              {wsConnected && (
                <Badge variant="default" className="text-xs bg-green-500">
                  实时更新
                </Badge>
              )}
              {isPollingMode && (
                <Badge variant="secondary" className="text-xs bg-blue-500 text-white">
                  轮询模式
                </Badge>
              )}
              {wsError && !wsConnected && !isPollingMode && (
                <Badge variant="destructive" className="text-xs">
                  离线模式
                </Badge>
              )}
            </div>
            {wsStats.totalUpdates > 0 && (
              <div className="text-xs text-muted-foreground">
                已更新 {wsStats.totalUpdates} 次
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-md border">
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
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{holdings.map(renderHoldingRow)}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 添加交易对话框 */}
      <TransactionDialog
        isOpen={isTransactionDialogOpen}
        onClose={() => {
          setIsTransactionDialogOpen(false);
          setSelectedHolding(null);
        }}
        portfolioId={portfolioId}
        selectedHolding={selectedHolding}
        onSuccess={fetchHoldings}
      />

      {/* 交易记录列表对话框 */}
      <Dialog
        open={isTransactionListOpen}
        onOpenChange={(open) => {
          setIsTransactionListOpen(open);
          if (!open) {
            setSelectedStockName("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-full min-w-[70vw] overflow-y-auto p-0">
          <DialogTitle className="sr-only">{selectedStockName} 交易记录</DialogTitle>
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{selectedStockName} 交易记录</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable portfolioId={portfolioId} symbol={selectedSymbol} />
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* 确认删除对话框 */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingHolding(null);
        }}
        onConfirm={handleDeleteHolding}
        title="删除持仓品种"
        description={`确定要删除品种 ${deletingHolding?.name} (${deletingHolding?.symbol}) 吗？此操作将同时删除该品种的所有交易记录，且无法撤销。`}
        isLoading={isDeleting}
      />
    </>
  );
}
