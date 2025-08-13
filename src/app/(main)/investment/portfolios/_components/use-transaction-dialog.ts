import { useState, useEffect, useCallback, useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useToast } from "@/hooks/use-toast";
import { TransactionType, HoldingDetail } from "@/types/investment";

import { StockSearchResult } from "./stock-search";
import {
  createFormDataFromTransaction,
  getInitialTransactionType,
  createSubmitPayload,
} from "./transaction-dialog-helpers";
import { TransactionForm, TransactionFormData } from "./transaction-form-types";
import { getTransactionSchema, getTransactionDefaultValues } from "./transaction-schemas";

interface UseTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioId: string;
  defaultType?: "buy" | "sell";
  editingTransaction?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  selectedHolding?: HoldingDetail | null;
  onSuccess?: () => void;
}

export function useTransactionDialog({
  isOpen,
  onClose,
  portfolioId,
  defaultType,
  editingTransaction,
  selectedHolding,
  onSuccess,
}: UseTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType>(getInitialTransactionType(defaultType));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { toast } = useToast();
  const sharesInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(getTransactionSchema(transactionType)),
    defaultValues: getTransactionDefaultValues(transactionType),
  }) as TransactionForm;

  // Reset form when transaction type changes
  useEffect(() => {
    const currentValues = form.getValues();
    form.reset({
      ...getTransactionDefaultValues(transactionType),
      symbol: currentValues.symbol,
      name: currentValues.name,
      transactionDate: currentValues.transactionDate,
      comment: currentValues.comment,
    });
  }, [transactionType, form]);

  // Initialize form data for editing transaction
  const initializeEditingTransaction = useCallback(() => {
    if (!editingTransaction) return;

    setTransactionType(editingTransaction.type);
    const formData = createFormDataFromTransaction(editingTransaction);
    form.reset(formData);

    // 编辑模式下不触发实时价格获取，保留原始交易价格
    // 只设置股票信息用于显示，不触发价格更新
  }, [editingTransaction, form]);

  // Initialize form data for default type
  const initializeDefaultType = useCallback(() => {
    if (!defaultType) return;

    const newType = defaultType === "buy" ? TransactionType.BUY : TransactionType.SELL;
    setTransactionType(newType);
  }, [defaultType]);

  // Initialize form data for selected holding
  const initializeSelectedHolding = useCallback(() => {
    if (!selectedHolding) return;

    form.setValue("symbol", selectedHolding.symbol);
    form.setValue("name", selectedHolding.name);
    form.setValue("price", selectedHolding.currentPrice);
  }, [selectedHolding, form]);

  // Reset transaction type when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        initializeEditingTransaction();
      } else if (defaultType) {
        initializeDefaultType();
      } else if (selectedHolding) {
        initializeSelectedHolding();
      }
    }
  }, [
    isOpen,
    editingTransaction,
    defaultType,
    selectedHolding,
    initializeEditingTransaction,
    initializeDefaultType,
    initializeSelectedHolding,
  ]);

  const handleStockSelect = useCallback(
    (stock: StockSearchResult) => {
      form.setValue("symbol", stock.symbol);
      form.setValue("name", stock.name);

      // 只有在非编辑模式下才更新价格
      if (!editingTransaction) {
        form.setValue("price", parseFloat(stock.currentPrice) || 0);
      }

      // 延迟设置焦点到股数字段，如果字段不存在则自然失败（无影响）
      setTimeout(() => {
        sharesInputRef.current?.focus();
      }, 100);
    },
    [form, editingTransaction],
  );

  const handleSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      const payload = createSubmitPayload(portfolioId, data, transactionType);
      const isEditing = !!editingTransaction;
      const url = isEditing ? `/api/transactions/${editingTransaction.id}` : "/api/transactions";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(isEditing ? "更新交易记录失败" : "提交交易记录失败");
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: "成功",
          description: isEditing ? "交易记录已更新" : "交易记录已保存",
        });
        onClose();
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      toast({
        title: "错误",
        description: "提交交易记录失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    transactionType,
    setTransactionType,
    isSubmitting,
    isDatePickerOpen,
    setIsDatePickerOpen,
    form,
    sharesInputRef,
    handleStockSelect,
    handleSubmit,
  };
}
