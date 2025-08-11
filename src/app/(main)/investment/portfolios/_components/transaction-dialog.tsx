"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TransactionType, TransactionTypeNames } from "@/types/investment";

import { StockSearch, StockSearchResult } from "./stock-search";
import { TransactionForm, TransactionFormData } from "./transaction-form-types";
import { getTransactionSchema, getTransactionDefaultValues } from "./transaction-schemas";
import { TransactionTypeFields } from "./transaction-type-fields";

interface TransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  defaultType?: "buy" | "sell";
  editingTransaction?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function TransactionDialog({ isOpen, onClose, portfolioId, defaultType }: TransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>(
    defaultType === "buy" ? TransactionType.BUY : defaultType === "sell" ? TransactionType.SELL : TransactionType.BUY,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(getTransactionSchema(transactionType)),
    defaultValues: getTransactionDefaultValues(transactionType),
  }) as TransactionForm;

  // Reset form when transaction type changes
  useEffect(() => {
    const currentValues = form.getValues();
    form.reset({
      ...getTransactionDefaultValues(transactionType),
      symbol: currentValues.symbol,
      name: currentValues.name,
      transactionDate: currentValues.transactionDate,
      comment: currentValues.comment,
    });
  }, [transactionType, form]);

  const handleStockSelect = (stock: StockSearchResult) => {
    form.setValue("symbol", stock.symbol);
    form.setValue("name", stock.name);
    form.setValue("price", parseFloat(stock.currentPrice) || 0);
  };

  const handleSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        portfolioId,
        ...data,
        type: transactionType,
        symbol: data.symbol.toUpperCase(),
      };

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("提交交易记录失败");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "成功",
          description: "交易记录已保存",
        });
        onClose();
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast({
        title: "错误",
        description: "提交交易记录失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[428px] overflow-y-auto p-0">
        <DialogTitle className="sr-only">添加持仓品种</DialogTitle>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">添加持仓品种</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* 股票搜索 */}
                <StockSearch onStockSelect={handleStockSelect} />

                {/* 交易类型 */}
                <div className="grid grid-cols-[80px_1fr] items-center gap-4">
                  <Label className="text-sm font-medium">交易类型</Label>
                  <div className="w-full">
                    <Select
                      value={transactionType.toString()}
                      onValueChange={(value) => setTransactionType(Number(value) as TransactionType)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TransactionTypeNames).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 委托日期 */}
                <div className="grid grid-cols-[80px_1fr] items-center gap-4">
                  <Label className="text-sm font-medium">委托日期</Label>
                  <FormField
                    control={form.control}
                    name="transactionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "yyyy年MM月dd日", { locale: zhCN })
                                ) : (
                                  <span>请选择日期</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={zhCN} />
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 交易详情 */}
                <TransactionTypeFields transactionType={transactionType} form={form} />

                {/* 备注 - 上下布局 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">备注</Label>
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea placeholder="输入备注（可选）" {...field} className="w-full" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    取消
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "保存中..." : "保存"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
