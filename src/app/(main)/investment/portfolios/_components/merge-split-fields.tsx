"use client";

import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionType } from "@/types/investment";

import { MergeSplitForm } from "./transaction-form-types";

interface MergeSplitFieldsProps {
  transactionType: TransactionType;
  form: MergeSplitForm;
}

export function MergeSplitFields({ transactionType, form }: MergeSplitFieldsProps) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-4">
      <Label className="text-sm font-medium">
        {transactionType === TransactionType.MERGE ? "多股合一" : "每股拆为"}
      </Label>
      <FormField
        control={form.control}
        name="unitShares"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                type="number"
                placeholder={transactionType === TransactionType.MERGE ? "多少股合为1股" : "每1股拆为多少股"}
                {...field}
                value={field.value || ""}
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
