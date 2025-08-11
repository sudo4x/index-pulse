"use client";

import { useState, useEffect, useCallback } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <TableCell>{transaction.symbol}</TableCell>
      <TableCell>{transaction.name}</TableCell>
      <TableCell>{transaction.typeName}</TableCell>
      <TableCell className="text-right">{transaction.shares ?? "-"}</TableCell>
      <TableCell className="text-right">¥{Number(transaction.amount).toFixed(2)}</TableCell>
      <TableCell>{transaction.description}</TableCell>
      <TableCell>{transaction.comment ?? "-"}</TableCell>
      <TableCell>{new Date(transaction.transactionDate).toLocaleDateString("zh-CN")}</TableCell>
      <TableCell className="text-right">
        <div>操作</div>
      </TableCell>
    </TableRow>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
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
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
        </CardHeader>
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
    <Card>
      <CardHeader>
        <CardTitle>
          交易记录 ({transactions.length})
          {symbol && <span className="text-muted-foreground ml-2 text-sm font-normal">- {symbol}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="text-right">成交价</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>说明</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>日期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{transactions.map(renderTransactionRow)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
