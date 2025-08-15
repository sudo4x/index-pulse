"use client";

import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { DividendForm } from "./transaction-form-types";

interface DividendFieldsProps {
  form: DividendForm;
}

export function DividendFields({ form }: DividendFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-[80px_1fr] items-center gap-4">
        <Label className="text-sm font-medium">每10股转增</Label>
        <FormField
          control={form.control}
          name="per10SharesTransfer"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  step="1"
                  placeholder="输入股数"
                  {...field}
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

      <div className="grid grid-cols-[80px_1fr] items-center gap-4">
        <Label className="text-sm font-medium">每10股送股</Label>
        <FormField
          control={form.control}
          name="per10SharesBonus"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  step="1"
                  placeholder="输入股数"
                  {...field}
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

      <div className="grid grid-cols-[80px_1fr] items-center gap-4">
        <Label className="text-sm font-medium">每10股红利</Label>
        <FormField
          control={form.control}
          name="per10SharesDividend"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="输入金额"
                    {...field}
                    value={field.value ? field.value.toString() : ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value) || 0)
                    }
                    className="w-full [appearance:textfield] pr-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">元</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 税费 */}
      <div className="grid grid-cols-[80px_1fr] items-center gap-4">
        <Label className="text-sm font-medium">税费</Label>
        <FormField
          control={form.control}
          name="tax"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="输入金额"
                    {...field}
                    value={field.value ? field.value.toString() : ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value) || 0)
                    }
                    className="w-full [appearance:textfield] pr-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 text-sm">元</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
