"use client";

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { TransferType, TransferTypeNames } from "@/types/investment";

interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  editingTransfer?: any; // For editing existing transfers
}

const transferSchema = z.object({
  type: z.string().refine((val) => val === "1" || val === "2", {
    message: "请选择转账类型",
  }),
  amount: z.number().positive("请输入正确的金额"),
  transferDate: z.date({ required_error: "请选择转账日期" }),
  comment: z.string().optional(),
});

export function TransferDialog({ isOpen, onClose, portfolioId, editingTransfer }: TransferDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      type: TransferType.DEPOSIT.toString(),
      amount: 0,
      transferDate: new Date(),
      comment: "",
    },
  });

  const handleSubmit = async (data: z.infer<typeof transferSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        portfolioId,
        ...data,
        type: Number(data.type),
      };

      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("提交转账记录失败");
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "成功",
          description: "转账记录已保存",
        });
        onClose();
        form.reset();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>银证转账</DialogTitle>
          <DialogDescription>记录资金转入或转出信息。</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 转账类型 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>转账类型</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择转账类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TransferType.DEPOSIT.toString()}>
                        {TransferTypeNames[TransferType.DEPOSIT]}
                      </SelectItem>
                      <SelectItem value={TransferType.WITHDRAW.toString()}>
                        {TransferTypeNames[TransferType.WITHDRAW]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 金额 */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>金额</FormLabel>
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

            {/* 转账日期 */}
            <FormField
              control={form.control}
              name="transferDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>转账日期</FormLabel>
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
                            <span>请选择转账日期</span>
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