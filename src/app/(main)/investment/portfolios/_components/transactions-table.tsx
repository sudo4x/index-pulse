"use client";

import { useState, useEffect } from "react";
import { MoreVertical, Edit, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, Scissors, Gift } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { TransactionDetail, TransactionType } from "@/types/investment";

interface TransactionsTableProps {
  portfolioId: string;
  symbol?: string; // 可选，用于查看特定股票的交易记录
}

export function TransactionsTable({ portfolioId, symbol }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransactions = async () => {
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
        setTransactions(result.data || []);
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
  };

  useEffect(() => {
    fetchTransactions();
  }, [portfolioId, symbol]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatShares = (shares: number) => {
    return shares.toLocaleString("zh-CN");
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.BUY:
        return <ArrowUpRight className="size-4 text-green-600" />;
      case TransactionType.SELL:
        return <ArrowDownRight className="size-4 text-red-600" />;
      case TransactionType.MERGE:
        return <RefreshCw className="size-4 text-blue-600" />;
      case TransactionType.SPLIT:
        return <Scissors className="size-4 text-blue-600" />;
      case TransactionType.DIVIDEND:
        return <Gift className="size-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const getTypeBadgeVariant = (type: TransactionType) => {
    switch (type) {
      case TransactionType.BUY:
        return "default";
      case TransactionType.SELL:
        return "destructive";
      case TransactionType.MERGE:
      case TransactionType.SPLIT:
        return "secondary";
      case TransactionType.DIVIDEND:
        return "outline";
      default:
        return "secondary";
    }
  };

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
            <div className="text-sm text-muted-foreground">
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
          {symbol && <span className="text-sm font-normal text-muted-foreground ml-2">- {symbol}</span>}
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
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="font-medium">{transaction.name}</div>
                    <div className="text-sm text-muted-foreground">{transaction.symbol}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(transaction.type)}
                    <Badge variant={getTypeBadgeVariant(transaction.type)}>
                      {transaction.typeName}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {transaction.price !== undefined && transaction.price > 0 ? (
                    <div className="font-mono">
                      {formatCurrency(transaction.price)}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">-</div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {transaction.shares !== undefined && transaction.shares > 0 ? (
                    <div className="font-mono">
                      {formatShares(transaction.shares)}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">-</div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className={cn(
                    "font-mono",
                    transaction.type === TransactionType.BUY ? "text-red-600" : 
                    transaction.type === TransactionType.SELL ? "text-green-600" : 
                    transaction.type === TransactionType.DIVIDEND ? "text-green-600" : ""
                  )}>
                    {transaction.type === TransactionType.BUY ? "-" : 
                     transaction.type === TransactionType.SELL || transaction.type === TransactionType.DIVIDEND ? "+" : ""}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-40">
                    {transaction.description}
                  </div>
                </TableCell>
                <TableCell>
                  {transaction.comment && (
                    <div className="text-sm text-muted-foreground max-w-32 truncate">
                      {transaction.comment}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(transaction.transactionDate), "yyyy-MM-dd", { locale: zhCN })}
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
                        <Edit className="size-4 mr-2" />
                        修改
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="size-4 mr-2" />
                        删除
                      </DropdownMenuItem>
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