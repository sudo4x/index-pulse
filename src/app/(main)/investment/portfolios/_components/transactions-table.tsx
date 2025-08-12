"use client";

import { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TransactionDetail } from "@/types/investment";

interface TransactionsTableProps {
  portfolioId: string;
  symbol?: string; // 可选，用于查看特定股票的交易记录
}

export function TransactionsTable({ portfolioId, symbol }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
    if (portfolioId && portfolioId !== "undefined") {
      fetchTransactions();
    }
  }, [portfolioId, symbol, fetchTransactions]);

  const renderTransactionRow = (transaction: TransactionDetail) => (
    <TableRow key={transaction.id}>
      <TableCell>
        <div>
          <div className="font-medium">{transaction.name}</div>
          <div className="text-muted-foreground text-sm">{transaction.symbol}</div>
        </div>
      </TableCell>
      <TableCell>{transaction.typeName}</TableCell>
      <TableCell className="text-right">{transaction.shares ?? "-"}</TableCell>
      <TableCell className="text-right">¥{Number(transaction.amount).toFixed(2)}</TableCell>
      <TableCell>{transaction.description}</TableCell>
      <TableCell>{transaction.comment ?? "-"}</TableCell>
      <TableCell>{new Date(transaction.transactionDate).toLocaleDateString("zh-CN")}</TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => console.log("编辑交易", transaction.id)}
          >
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
            onClick={() => console.log("删除交易", transaction.id)}
          >
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
    <Card className="shadow-xs">
      <CardContent className="flex size-full flex-col gap-4">
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称/代码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>说明</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>日期</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{transactions.map(renderTransactionRow)}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
