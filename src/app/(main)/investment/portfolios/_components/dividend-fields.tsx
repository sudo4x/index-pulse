"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { DividendForm } from "./transaction-form-types";

interface DividendFieldsProps {
  form: DividendForm;
}

export function DividendFields({ form }: DividendFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <FormLabel className="text-sm font-medium">每10股转增</FormLabel>
        <FormField
          control={form.control}
          name="unitIncreaseShares"
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

      <div className="space-y-2">
        <FormLabel className="text-sm font-medium">每10股送股</FormLabel>
        <FormField
          control={form.control}
          name="unitShares"
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

      <div className="space-y-2">
        <FormLabel className="text-sm font-medium">每10股红利</FormLabel>
        <FormField
          control={form.control}
          name="unitDividend"
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
      <div className="space-y-2">
        <FormLabel className="text-sm font-medium">税费</FormLabel>
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
