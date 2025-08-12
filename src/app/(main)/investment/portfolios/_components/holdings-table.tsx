"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
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
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [selectedHolding, setSelectedHolding] = useState<HoldingDetail | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingHolding, setDeletingHolding] = useState<HoldingDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleShowTransactions = (symbol: string) => {
    setSelectedSymbol(symbol);
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
      <Dialog open={isTransactionListOpen} onOpenChange={setIsTransactionListOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedSymbol} 交易记录</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <TransactionsTable portfolioId={portfolioId} symbol={selectedSymbol} />
          </div>
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
