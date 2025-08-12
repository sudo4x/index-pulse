"use client";

import { useState, useEffect, useCallback } from "react";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Edit, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TransferDetail, TransferType } from "@/types/investment";

interface TransfersTableProps {
  portfolioId: string;
}

export function TransfersTable({ portfolioId }: TransfersTableProps) {
  const [transfers, setTransfers] = useState<TransferDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransfers = async () => {
    if (!portfolioId || portfolioId === "undefined") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/transfers?portfolioId=${portfolioId}`);
      if (!response.ok) {
        throw new Error("获取转账记录失败");
      }
      const result = await response.json();

      if (result.success) {
        setTransfers(result.data ?? []);
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      toast({
        title: "错误",
        description: "获取转账记录失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const memoizedFetchTransfers = useCallback(fetchTransfers, [portfolioId, toast]);

  useEffect(() => {
    if (portfolioId && portfolioId !== "undefined") {
      memoizedFetchTransfers();
    }
  }, [portfolioId, memoizedFetchTransfers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getTypeIcon = (type: TransferType) => {
    return type === TransferType.DEPOSIT ? (
      <ArrowDownLeft className="size-4 text-green-600" />
    ) : (
      <ArrowUpRight className="size-4 text-red-600" />
    );
  };

  const getTypeBadgeVariant = (type: TransferType) => {
    return type === TransferType.DEPOSIT ? "default" : "destructive";
  };

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

  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center space-y-2">
            <div className="text-muted-foreground">还没有转账记录</div>
            <div className="text-muted-foreground text-sm">添加转入或转出记录来管理资金</div>
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
                <TableHead>操作</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(transfer.type)}
                      <Badge variant={getTypeBadgeVariant(transfer.type)}>{transfer.typeName}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={cn(
                        "font-mono",
                        transfer.type === TransferType.DEPOSIT ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {transfer.type === TransferType.DEPOSIT ? "+" : "-"}
                      {formatCurrency(transfer.amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(transfer.transferDate), "yyyy-MM-dd", { locale: zhCN })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transfer.comment && (
                      <div className="text-muted-foreground max-w-48 truncate text-sm">{transfer.comment}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => console.log("编辑转账", transfer.id)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                        onClick={() => console.log("删除转账", transfer.id)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
