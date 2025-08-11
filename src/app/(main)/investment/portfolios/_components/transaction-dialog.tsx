"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { TransactionType, TransactionTypeNames } from "@/types/investment";

interface StockSearchResult {
  symbol: string;
  name: string;
  currentPrice: string;
  change: string;
  changePercent: string;
}

interface TransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  defaultType?: "buy" | "sell";
  editingTransaction?: any; // For editing existing transactions
}

const baseTransactionSchema = z.object({
  symbol: z.string().min(1, "请输入股票代码"),
  name: z.string().min(1, "请输入股票名称"),
  type: z.string(),
  transactionDate: z.date({ required_error: "请选择交易日期" }),
  comment: z.string().optional(),
});

const buySchema = baseTransactionSchema.extend({
  shares: z.number().positive("请输入正确的股数"),
  price: z.number().positive("请输入正确的价格"),
  commission: z.number().min(0).optional(),
  commissionRate: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  commissionType: z.enum(["amount", "rate"]).default("amount"),
  taxType: z.enum(["amount", "rate"]).default("amount"),
});

const sellSchema = buySchema;

const mergeSchema = baseTransactionSchema.extend({
  unitShares: z.number().positive("请输入合股比例"),
});

const splitSchema = baseTransactionSchema.extend({
  unitShares: z.number().positive("请输入拆股比例"),
});

const dividendSchema = baseTransactionSchema.extend({
  unitDividend: z.number().min(0).optional(),
  unitIncreaseShares: z.number().min(0).optional(),
  recordDate: z.date().optional(),
  tax: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  taxType: z.enum(["amount", "rate"]).default("amount"),
});

export function TransactionDialog({
  isOpen,
  onClose,
  portfolioId,
  defaultType,
  editingTransaction,
}: TransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>(
    defaultType === "buy" ? TransactionType.BUY : defaultType === "sell" ? TransactionType.SELL : TransactionType.BUY,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockCode, setStockCode] = useState("");
  const [stockSearchResults, setStockSearchResults] = useState<StockSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // 生成标准格式股票代码
  const generateStandardSymbol = (code: string): string => {
    const upperCode = code.toUpperCase();

    if (upperCode.length !== 6) return upperCode;

    // 沪市个股: 60/688开头
    if (upperCode.startsWith("60") || upperCode.startsWith("688")) {
      return `SH${upperCode}`;
    }

    // 深市个股: 00/002/30开头
    if (upperCode.startsWith("00") || upperCode.startsWith("002") || upperCode.startsWith("30")) {
      return `SZ${upperCode}`;
    }

    // 沪市ETF: 51/588开头
    if (upperCode.startsWith("51") || upperCode.startsWith("588")) {
      return `SH${upperCode}`;
    }

    // 深市ETF: 15/16开头
    if (upperCode.startsWith("15") || upperCode.startsWith("16")) {
      return `SZ${upperCode}`;
    }

    // 指数: 000开头(沪深)，399开头(深市) - 无后缀
    if (upperCode.startsWith("000") || upperCode.startsWith("399")) {
      return upperCode;
    }

    // 默认当作深圳股票
    return `SZ${upperCode}`;
  };

  // 搜索股票
  const searchStock = async (code: string) => {
    if (code.length !== 6) {
      setStockSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const standardSymbol = generateStandardSymbol(code);
      const response = await fetch(`/api/stock-prices?symbols=${standardSymbol}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setStockSearchResults(result.data);
          setShowSearchResults(true);
        } else {
          setStockSearchResults([]);
          setShowSearchResults(true);
        }
      }
    } catch (error) {
      console.error("Error searching stock:", error);
      setStockSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理股票代码输入
  const handleStockCodeChange = (value: string) => {
    setStockCode(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length === 6) {
      searchTimeoutRef.current = setTimeout(() => {
        searchStock(value);
      }, 300);
    } else {
      setShowSearchResults(false);
      setStockSearchResults([]);
    }
  };

  // 选择股票
  const selectStock = (stock: StockSearchResult) => {
    const displayValue = `${stock.symbol}(${stock.name})`;
    setStockCode(displayValue);
    setSelectedStock(stock);
    form.setValue("symbol", stock.symbol);
    form.setValue("name", stock.name);
    form.setValue("price", parseFloat(stock.currentPrice) || 0);
    setShowSearchResults(false);
  };

  const getFormSchema = () => {
    switch (transactionType) {
      case TransactionType.BUY:
      case TransactionType.SELL:
        return buySchema;
      case TransactionType.MERGE:
        return mergeSchema;
      case TransactionType.SPLIT:
        return splitSchema;
      case TransactionType.DIVIDEND:
        return dividendSchema;
      default:
        return baseTransactionSchema;
    }
  };

  const form = useForm<z.infer<ReturnType<typeof getFormSchema>>>({
    resolver: zodResolver(getFormSchema()),
    defaultValues: {
      symbol: "",
      name: "",
      type: transactionType.toString(),
      transactionDate: new Date(),
      comment: "",
      ...(transactionType === TransactionType.BUY || transactionType === TransactionType.SELL
        ? {
            shares: 0,
            price: 0,
            commission: 0,
            tax: 0,
            commissionType: "amount" as const,
            taxType: "amount" as const,
          }
        : {}),
      ...(transactionType === TransactionType.MERGE || transactionType === TransactionType.SPLIT
        ? {
            unitShares: 0,
          }
        : {}),
      ...(transactionType === TransactionType.DIVIDEND
        ? {
            unitDividend: 0,
            unitIncreaseShares: 0,
            tax: 0,
            taxType: "amount" as const,
          }
        : {}),
    },
  });

  // Reset form when transaction type changes
  useEffect(() => {
    form.reset({
      symbol: form.getValues("symbol"),
      name: form.getValues("name"),
      type: transactionType.toString(),
      transactionDate: form.getValues("transactionDate"),
      comment: form.getValues("comment"),
      ...(transactionType === TransactionType.BUY || transactionType === TransactionType.SELL
        ? {
            shares: 0,
            price: 0,
            commission: 0,
            tax: 0,
            commissionType: "amount" as const,
            taxType: "amount" as const,
          }
        : {}),
      ...(transactionType === TransactionType.MERGE || transactionType === TransactionType.SPLIT
        ? {
            unitShares: 0,
          }
        : {}),
      ...(transactionType === TransactionType.DIVIDEND
        ? {
            unitDividend: 0,
            unitIncreaseShares: 0,
            tax: 0,
            taxType: "amount" as const,
          }
        : {}),
    });
  }, [transactionType]);

  const handleSubmit = async (data: any) => {
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

  const renderTypeSpecificFields = () => {
    switch (transactionType) {
      case TransactionType.BUY:
      case TransactionType.SELL:
        return (
          <>
            {/* 买入价/卖出价 */}
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <Label className="text-sm font-medium">
                {transactionType === TransactionType.BUY ? "买入价" : "卖出价"}
              </Label>
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="122.22"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 买入量/卖出量 */}
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <Label className="text-sm font-medium">
                {transactionType === TransactionType.BUY ? "买入量" : "卖出量"}
              </Label>
              <FormField
                control={form.control}
                name="shares"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="数量"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 佣金 - 3列布局 */}
            <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4">
              <Label className="text-sm font-medium">佣金</Label>
              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rate">率(‰)</SelectItem>
                          <SelectItem value="amount">元</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 税费 - 3列布局 */}
            <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4">
              <Label className="text-sm font-medium">税费</Label>
              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rate">率(‰)</SelectItem>
                          <SelectItem value="amount">元</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );

      case TransactionType.MERGE:
        return (
          <div className="grid grid-cols-[80px_1fr] items-center gap-4">
            <Label className="text-sm font-medium">合股比例</Label>
            <FormField
              control={form.control}
              name="unitShares"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10（10股合为1股）"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case TransactionType.SPLIT:
        return (
          <div className="grid grid-cols-[80px_1fr] items-center gap-4">
            <Label className="text-sm font-medium">拆股比例</Label>
            <FormField
              control={form.control}
              name="unitShares"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2（1股拆为2股）"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case TransactionType.DIVIDEND:
        return (
          <>
            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <Label className="text-sm font-medium">每股股息</Label>
              <FormField
                control={form.control}
                name="unitDividend"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <Label className="text-sm font-medium">每股转增</Label>
              <FormField
                control={form.control}
                name="unitIncreaseShares"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-[80px_1fr] items-center gap-4">
              <Label className="text-sm font-medium">股权登记日</Label>
              <FormField
                control={form.control}
                name="recordDate"
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

            {/* 税费 - 3列布局 */}
            <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4">
              <Label className="text-sm font-medium">税费</Label>
              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rate">率(‰)</SelectItem>
                          <SelectItem value="amount">元</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[400px] max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">添加持仓品种</DialogTitle>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">添加持仓品种</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* 股票搜索 */}
                <div className="grid grid-cols-[80px_1fr] items-start gap-4">
                  <Label className="pt-2 text-sm font-medium">股票</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        placeholder="输入6位股票代码，如：000858"
                        value={stockCode}
                        onChange={(e) => handleStockCodeChange(e.target.value)}
                        className="w-full"
                      />

                      {/* 搜索结果下拉 */}
                      {showSearchResults && (
                        <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-md border bg-white shadow-lg">
                          {isSearching ? (
                            <div className="text-muted-foreground p-3 text-center">搜索中...</div>
                          ) : stockSearchResults.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto">
                              {stockSearchResults.map((stock) => (
                                <div
                                  key={stock.symbol}
                                  className="cursor-pointer border-b p-3 last:border-b-0 hover:bg-gray-50"
                                  onClick={() => selectStock(stock)}
                                >
                                  <div className="font-medium">
                                    {stock.name}({stock.symbol})
                                  </div>
                                  <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                                    <span>
                                      最新 <span className="text-green-600">{stock.currentPrice}</span>
                                    </span>
                                    <span
                                      className={cn(parseFloat(stock.change) >= 0 ? "text-red-500" : "text-green-500")}
                                    >
                                      {stock.change}({stock.changePercent}%)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground p-3 text-center">未找到匹配的股票</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 已选股票显示 - 显示价格和涨跌信息 */}
                    {selectedStock && form.watch("symbol") && (
                      <div className="flex items-center justify-between rounded-md bg-blue-50 p-2">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="font-medium">{selectedStock.name}</span>
                          <span className="text-green-600">最新 {selectedStock.currentPrice}</span>
                          <span
                            className={cn(
                              parseFloat(selectedStock.change || "0") >= 0 ? "text-red-500" : "text-green-500",
                            )}
                          >
                            {selectedStock.change}({selectedStock.changePercent}%)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStockCode("");
                            setSelectedStock(null);
                            form.setValue("symbol", "");
                            form.setValue("name", "");
                            form.setValue("price", 0);
                            setStockSearchResults([]);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

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
                {renderTypeSpecificFields()}

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
