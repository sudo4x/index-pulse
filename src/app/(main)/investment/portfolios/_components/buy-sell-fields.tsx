"use client";

import { RefObject } from "react";

import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionType } from "@/types/investment";

import { FeePreview } from "./fee-preview";
import { BuySellForm } from "./transaction-form-types";

interface BuySellFieldsProps {
  transactionType: TransactionType;
  form: BuySellForm;
  sharesInputRef?: RefObject<HTMLInputElement>;
  stockCommissionRate?: number;
  stockCommissionMinAmount?: number;
  etfCommissionRate?: number;
  etfCommissionMinAmount?: number;
}

export function BuySellFields({
  transactionType,
  form,
  sharesInputRef,
  stockCommissionRate = 0.0003,
  stockCommissionMinAmount = 5.0,
  etfCommissionRate = 0.0003,
  etfCommissionMinAmount = 5.0,
}: BuySellFieldsProps) {
  return (
    <>
      {/* 买入价/卖出价 */}
      <div className="grid grid-cols-[80px_1fr] items-center gap-4">
        <Label className="text-sm font-medium">{transactionType === TransactionType.BUY ? "买入价" : "卖出价"}</Label>
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="122.123"
                  {...field}
                  value={field.value ? Number(field.value).toFixed(3) : ""}
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
        <Label className="text-sm font-medium">{transactionType === TransactionType.BUY ? "买入量" : "卖出量"}</Label>
        <FormField
          control={form.control}
          name="shares"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  step="1"
                  placeholder="数量"
                  {...field}
                  ref={(e) => {
                    field.ref(e);
                    if (sharesInputRef && e) {
                      (sharesInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                    }
                  }}
                  value={field.value ? Math.floor(Number(field.value)).toString() : ""}
                  onChange={(e) => field.onChange(Math.floor(Number(e.target.value)) || 0)}
                  className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 费用预览 */}
      <div className="col-span-full">
        <FeePreview
          symbol={form.watch("symbol")}
          transactionType={transactionType}
          shares={form.watch("shares")}
          price={form.watch("price")}
          stockCommissionRate={stockCommissionRate}
          stockCommissionMinAmount={stockCommissionMinAmount}
          etfCommissionRate={etfCommissionRate}
          etfCommissionMinAmount={etfCommissionMinAmount}
        />
      </div>
    </>
  );
}
