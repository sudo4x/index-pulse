"use client";

import { TransactionType } from "@/types/investment";

import { BuySellFields } from "./buy-sell-fields";
import { DividendFields } from "./dividend-fields";
import { MergeSplitFields } from "./merge-split-fields";

interface TransactionTypeFieldsProps {
  transactionType: TransactionType;
  form: any; // Form control from react-hook-form // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function TransactionTypeFields({ transactionType, form }: TransactionTypeFieldsProps) {
  switch (transactionType) {
    case TransactionType.BUY:
    case TransactionType.SELL:
      return <BuySellFields transactionType={transactionType} form={form} />;

    case TransactionType.MERGE:
    case TransactionType.SPLIT:
      return <MergeSplitFields transactionType={transactionType} form={form} />;

    case TransactionType.DIVIDEND:
      return <DividendFields form={form} />;

    default:
      return null;
  }
}
