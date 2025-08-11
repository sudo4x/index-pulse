"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";

interface DividendFieldsProps {
  form: any; // Form control from react-hook-form // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function DividendFields({ form }: DividendFieldsProps) {
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
                      {field.value ? format(field.value, "yyyy年MM月dd日", { locale: zhCN }) : <span>请选择日期</span>}
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
}
