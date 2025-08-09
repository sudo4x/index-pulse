"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function TransactionDialog({ isOpen, onClose, portfolioId, defaultType, editingTransaction }: TransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>(
    defaultType === "buy" ? TransactionType.BUY :
    defaultType === "sell" ? TransactionType.SELL :
    TransactionType.BUY
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      ...(transactionType === TransactionType.BUY || transactionType === TransactionType.SELL ? {
        shares: 0,
        price: 0,
        commission: 0,
        tax: 0,
        commissionType: "amount" as const,
        taxType: "amount" as const,
      } : {}),
      ...(transactionType === TransactionType.MERGE || transactionType === TransactionType.SPLIT ? {
        unitShares: 0,
      } : {}),
      ...(transactionType === TransactionType.DIVIDEND ? {
        unitDividend: 0,
        unitIncreaseShares: 0,
        tax: 0,
        taxType: "amount" as const,
      } : {}),
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
      ...(transactionType === TransactionType.BUY || transactionType === TransactionType.SELL ? {
        shares: 0,
        price: 0,
        commission: 0,
        tax: 0,
        commissionType: "amount" as const,
        taxType: "amount" as const,
      } : {}),
      ...(transactionType === TransactionType.MERGE || transactionType === TransactionType.SPLIT ? {
        unitShares: 0,
      } : {}),
      ...(transactionType === TransactionType.DIVIDEND ? {
        unitDividend: 0,
        unitIncreaseShares: 0,
        tax: 0,
        taxType: "amount" as const,
      } : {}),
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{transactionType === TransactionType.BUY ? "买入量" : "卖出量"}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{transactionType === TransactionType.BUY ? "买入价" : "卖出价"}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 佣金设置 */}
            <div className="space-y-2">
              <Label>佣金</Label>
              <FormField
                control={form.control}
                name="commissionType"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="amount" id="commission-amount" />
                      <Label htmlFor="commission-amount">金额</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rate" id="commission-rate" />
                      <Label htmlFor="commission-rate">费率</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {form.watch("commissionType") === "amount" ? (
                <FormField
                  control={form.control}
                  name="commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0.0000"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* 税费设置 */}
            <div className="space-y-2">
              <Label>税费</Label>
              <FormField
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="amount" id="tax-amount" />
                      <Label htmlFor="tax-amount">金额</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rate" id="tax-rate" />
                      <Label htmlFor="tax-rate">费率</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {form.watch("taxType") === "amount" ? (
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0.0000"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </>
        );

      case TransactionType.MERGE:
        return (
          <FormField
            control={form.control}
            name="unitShares"
            render={({ field }) => (
              <FormItem>
                <FormLabel>多股合一（多少股合为1股）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="例如：10（表示10股合为1股）"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case TransactionType.SPLIT:
        return (
          <FormField
            control={form.control}
            name="unitShares"
            render={({ field }) => (
              <FormItem>
                <FormLabel>每股拆为（每1股拆为多少股）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="例如：2（表示1股拆为2股）"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case TransactionType.DIVIDEND:
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitDividend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>每股股息（元）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitIncreaseShares"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>每股转增（股）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="recordDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>股权登记日</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "yyyy年MM月dd日", { locale: zhCN })
                          ) : (
                            <span>请选择日期</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={zhCN}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 税费设置 */}
            <div className="space-y-2">
              <Label>税费</Label>
              <FormField
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="amount" id="dividend-tax-amount" />
                      <Label htmlFor="dividend-tax-amount">金额</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rate" id="dividend-tax-rate" />
                      <Label htmlFor="dividend-tax-rate">费率</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {form.watch("taxType") === "amount" ? (
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0.0000"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加交易记录</DialogTitle>
          <DialogDescription>请填写交易信息，系统将自动计算相关数据。</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 交易类型选择 */}
            <div className="space-y-2">
              <Label>交易类型</Label>
              <Select 
                value={transactionType.toString()} 
                onValueChange={(value) => setTransactionType(Number(value) as TransactionType)}
              >
                <SelectTrigger>
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

            {/* 股票信息 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>股票代码</FormLabel>
                    <FormControl>
                      <Input placeholder="如：SZ000858" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>股票名称</FormLabel>
                    <FormControl>
                      <Input placeholder="如：五粮液" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 交易日期 */}
            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>交易日期</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "yyyy年MM月dd日", { locale: zhCN })
                          ) : (
                            <span>请选择交易日期</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={zhCN}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 类型特定字段 */}
            {renderTypeSpecificFields()}

            {/* 备注 */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea placeholder="可选的备注信息" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}