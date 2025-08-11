"use client";

import { TransactionType } from "@/types/investment";

import { BuySellFields } from "./buy-sell-fields";
import { DividendFields } from "./dividend-fields";
import { MergeSplitFields } from "./merge-split-fields";
import { TransactionForm, BuySellForm, MergeSplitForm, DividendForm } from "./transaction-form-types";

interface TransactionTypeFieldsProps {
  transactionType: TransactionType;
  form: TransactionForm;
}

export function TransactionTypeFields({ transactionType, form }: TransactionTypeFieldsProps) {
  switch (transactionType) {
    case TransactionType.BUY:
    case TransactionType.SELL:
      return <BuySellFields transactionType={transactionType} form={form as BuySellForm} />;

    case TransactionType.MERGE:
    case TransactionType.SPLIT:
      return <MergeSplitFields transactionType={transactionType} form={form as MergeSplitForm} />;

    case TransactionType.DIVIDEND:
      return <DividendFields form={form as DividendForm} />;

    default:
      return null;
  }
}
