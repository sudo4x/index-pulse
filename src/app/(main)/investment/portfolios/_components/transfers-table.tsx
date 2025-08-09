"use client";

import { useState, useEffect } from "react";
import { MoreVertical, Edit, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
        setTransfers(result.data || []);
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

  useEffect(() => {
    if (portfolioId && portfolioId !== "undefined") {
      fetchTransfers();
    }
  }, [portfolioId]);

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
        <CardHeader>
          <CardTitle>转账记录</CardTitle>
        </CardHeader>
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
        <CardHeader>
          <CardTitle>转账记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 flex-col items-center justify-center space-y-2">
            <div className="text-muted-foreground">还没有转账记录</div>
            <div className="text-sm text-muted-foreground">添加转入或转出记录来管理资金</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>转账记录 ({transfers.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>操作</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>备注</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(transfer.type)}
                    <Badge variant={getTypeBadgeVariant(transfer.type)}>
                      {transfer.typeName}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className={cn(
                    "font-mono",
                    transfer.type === TransferType.DEPOSIT ? "text-green-600" : "text-red-600"
                  )}>
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
                    <div className="text-sm text-muted-foreground max-w-48 truncate">
                      {transfer.comment}
                    </div>
                  )}
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