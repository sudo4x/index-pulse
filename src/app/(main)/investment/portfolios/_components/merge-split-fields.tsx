"use client";

import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionType } from "@/types/investment";

interface MergeSplitFieldsProps {
  transactionType: TransactionType;
  form: any; // Form control from react-hook-form // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function MergeSplitFields({ transactionType, form }: MergeSplitFieldsProps) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-4">
      <Label className="text-sm font-medium">
        {transactionType === TransactionType.MERGE ? "合股比例" : "拆股比例"}
      </Label>
      <FormField
        control={form.control}
        name="unitShares"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                type="number"
                placeholder={transactionType === TransactionType.MERGE ? "10（10股合为1股）" : "2（1股拆为2股）"}
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
}

