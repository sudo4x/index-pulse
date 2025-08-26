"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { TransactionType, TransactionTypeNames, HoldingDetail } from "@/types/investment";

import { StockSearch } from "./stock-search";
import { getDialogTitle } from "./transaction-dialog-helpers";
import { TransactionTypeFields } from "./transaction-type-fields";
import { useTransactionDialog } from "./use-transaction-dialog";

interface TransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  defaultType?: "buy" | "sell";
  editingTransaction?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  selectedHolding?: HoldingDetail | null;
  onSuccess?: () => void;
}

export function TransactionDialog(props: TransactionDialogProps) {
  const {
    transactionType,
    setTransactionType,
    isSubmitting,
    isDatePickerOpen,
    setIsDatePickerOpen,
    form,
    sharesInputRef,
    handleStockSelect,
    handleSubmit,
  } = useTransactionDialog(props);

  const { isOpen, onClose, defaultType, editingTransaction, selectedHolding } = props;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="min-w-[400px] overflow-y-auto sm:min-w-[460px]">
        <SheetHeader>
          <SheetTitle className="text-xl">{getDialogTitle(editingTransaction, selectedHolding)}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* 股票搜索 */}
                  <StockSearch
                    onStockSelect={handleStockSelect}
                    defaultSymbol={selectedHolding?.symbol ?? editingTransaction?.symbol}
                    defaultName={selectedHolding?.name ?? editingTransaction?.name}
                  />

                  {/* 交易类型 */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">交易类型</FormLabel>
                    <Select
                      value={transactionType.toString()}
                      onValueChange={(value) => setTransactionType(Number(value) as TransactionType)}
                      disabled={defaultType !== undefined || !!editingTransaction}
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

                  {/* 委托日期 */}
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium">委托日期</FormLabel>
                    <FormField
                      control={form.control}
                      name="transactionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  {format(field.value, "yyyy年MM月dd日", { locale: zhCN })}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    setIsDatePickerOpen(false);
                                  }}
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

                  {/* 交易详情 */}
                  <TransactionTypeFields
                    transactionType={transactionType}
                    form={form}
                    sharesInputRef={sharesInputRef}
                  />

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
