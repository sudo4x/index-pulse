"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TransactionDetail } from "@/types/investment";
import { formatShares } from "@/utils/format-utils";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { TransactionDialog } from "./transaction-dialog";

interface TransactionsTableProps {
  portfolioId: string;
  symbol?: string; // 可选，用于查看特定股票的交易记录
}

export function TransactionsTable({ portfolioId, symbol }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionDetail | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<TransactionDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!portfolioId || portfolioId === "undefined") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let url = `/api/transactions?portfolioId=${portfolioId}`;
      if (symbol) {
        url += `&symbol=${symbol}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("获取交易记录失败");
      }
      const result = await response.json();

      if (result.success) {
        setTransactions(result.data ?? []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "错误",
        description: "获取交易记录失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, symbol, toast]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (portfolioId && portfolioId !== "undefined") {
      timeoutRef.current = setTimeout(() => {
        fetchTransactions();
      }, 50); // 50ms 防抖
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [portfolioId, symbol, fetchTransactions]);

  const handleEditTransaction = (transaction: TransactionDetail) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${deletingTransaction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除交易记录失败");
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: "成功",
          description: "交易记录删除成功",
        });
        fetchTransactions(); // 重新获取数据
        setIsDeleteDialogOpen(false);
        setDeletingTransaction(null);
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "错误",
        description: "删除交易记录失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (transaction: TransactionDetail) => {
    setDeletingTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const renderTransactionRow = (transaction: TransactionDetail) => (
    <TableRow key={transaction.id}>
      <TableCell>
        <div>
          <div className="font-medium">{transaction.name}</div>
          <div className="text-muted-foreground text-sm">{transaction.symbol}</div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{transaction.typeName}</div>
          <div className="text-muted-foreground text-sm">
            {new Date(transaction.transactionDate).toLocaleDateString("zh-CN")}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {transaction.price ? `¥${Number(transaction.price).toFixed(3)}` : "-"}
      </TableCell>
      <TableCell className="text-right">
        {transaction.shares ? formatShares(Number(transaction.shares)) : "-"}
      </TableCell>
      <TableCell className="text-right">¥{Number(transaction.amount).toFixed(2)}</TableCell>
      <TableCell>{transaction.description}</TableCell>
      <TableCell>{transaction.comment ?? "-"}</TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => handleEditTransaction(transaction)}
          >
            <Edit className="mr-1 h-3 w-3" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
            onClick={() => handleDeleteClick(transaction)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            删除
          </Button>
        </div>
      </TableCell>
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

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center space-y-2">
            <div className="text-muted-foreground">还没有交易记录</div>
            <div className="text-muted-foreground text-sm">
              {symbol ? `没有找到 ${symbol} 的交易记录` : "开始您的第一笔交易"}
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
            <div className="w-full overflow-x-auto">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">名称/代码</TableHead>
                      <TableHead className="w-[160px]">类型/日期</TableHead>
                      <TableHead className="w-[100px] text-right">成交价</TableHead>
                      <TableHead className="w-[90px] text-right">数量</TableHead>
                      <TableHead className="w-[110px] text-right">金额</TableHead>
                      <TableHead className="w-[160px]">说明</TableHead>
                      <TableHead className="w-[140px]">备注</TableHead>
                      <TableHead className="w-[140px] text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{transactions.map(renderTransactionRow)}</TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 编辑交易对话框 */}
      <TransactionDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingTransaction(null);
        }}
        portfolioId={portfolioId}
        editingTransaction={editingTransaction}
        onSuccess={fetchTransactions}
      />

      {/* 确认删除对话框 */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingTransaction(null);
        }}
        onConfirm={handleDeleteTransaction}
        title="删除交易记录"
        description={`确定要删除这条交易记录吗？此操作无法撤销。`}
        isLoading={isDeleting}
      />
    </>
  );
}
