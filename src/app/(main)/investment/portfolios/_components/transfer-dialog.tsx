"use client";

import { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TransferType, TransferTypeNames } from "@/types/investment";

interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  editingTransfer?: {
    id: string;
    type: TransferType;
    amount: number;
    transferDate: string;
    comment?: string;
  }; // For editing existing transfers
  onSuccess?: () => void;
}

const transferSchema = z.object({
  type: z.string().refine((val) => val === "1" || val === "2", {
    message: "请选择转账类型",
  }),
  amount: z.number().positive("请输入正确的金额"),
  transferDate: z.date({ required_error: "请选择转账日期" }),
  comment: z.string().optional(),
});

export function TransferDialog({ isOpen, onClose, portfolioId, editingTransfer, onSuccess }: TransferDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      type: TransferType.DEPOSIT.toString() as "1" | "2",
      amount: 0,
      transferDate: new Date(),
      comment: "",
    },
  });

  // Reset form when dialog opens with editingTransfer
  useEffect(() => {
    if (isOpen && editingTransfer) {
      form.reset({
        type: editingTransfer.type.toString() as "1" | "2",
        amount: editingTransfer.amount,
        transferDate: new Date(editingTransfer.transferDate),
        comment: editingTransfer.comment ?? "",
      });
    } else if (isOpen && !editingTransfer) {
      form.reset({
        type: TransferType.DEPOSIT.toString() as "1" | "2",
        amount: 0,
        transferDate: new Date(),
        comment: "",
      });
    }
  }, [isOpen, editingTransfer, form]);

  const handleSubmit = async (data: z.infer<typeof transferSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        portfolioId,
        ...data,
        type: Number(data.type),
      };

      const isEditing = !!editingTransfer;
      const url = isEditing ? `/api/transfers/${editingTransfer.id}` : "/api/transfers";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(isEditing ? "更新转账记录失败" : "提交转账记录失败");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "成功",
          description: isEditing ? "转账记录已更新" : "转账记录已保存",
        });
        onClose();
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error submitting transfer:", error);
      toast({
        title: "错误",
        description: "提交转账记录失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="min-w-[400px] overflow-y-auto sm:min-w-[460px]">
        <SheetHeader>
          <SheetTitle className="text-xl">{editingTransfer ? "编辑转账记录" : "银证转账"}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* 转账类型 */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">转账类型</FormLabel>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="请选择转账类型" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={TransferType.DEPOSIT.toString()}>
                                  {TransferTypeNames[TransferType.DEPOSIT]}
                                </SelectItem>
                                <SelectItem value={TransferType.WITHDRAW.toString()}>
                                  {TransferTypeNames[TransferType.WITHDRAW]}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 金额 */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">金额</FormLabel>
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 转账日期 */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">转账日期</FormLabel>
                    <FormField
                      control={form.control}
                      name="transferDate"
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
                                    <span>请选择转账日期</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 备注 */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">备注</FormLabel>
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

                  <div className="flex flex-col space-y-3 pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "保存中..." : "保存"}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                      取消
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
