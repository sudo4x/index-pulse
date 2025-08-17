import { useState, useCallback } from "react";

import { useToast } from "@/hooks/use-toast";
import { HoldingDetail } from "@/types/investment";

export interface HoldingsTableState {
  // 对话框状态
  isTransactionDialogOpen: boolean;
  isTransactionListOpen: boolean;
  isDeleteDialogOpen: boolean;

  // 选中项状态
  selectedHolding: HoldingDetail | null;
  selectedSymbol: string;
  selectedStockName: string;
  deletingHolding: HoldingDetail | null;

  // 操作状态
  isDeleting: boolean;
}

export interface HoldingsTableActions {
  // 数据操作
  handleDeleteHolding: () => Promise<void>;

  // 对话框操作
  handleAddClick: (holding: HoldingDetail) => void;
  handleShowTransactions: (holding: HoldingDetail) => void;
  handleDeleteClick: (holding: HoldingDetail) => void;

  // 对话框关闭操作
  closeTransactionDialog: () => void;
  closeTransactionList: () => void;
  closeDeleteDialog: () => void;
}

export function useHoldingsTableLogic(
  portfolioId: string,
  onDataRefresh?: () => void,
): [HoldingsTableState, HoldingsTableActions] {
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isTransactionListOpen, setIsTransactionListOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<HoldingDetail | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedStockName, setSelectedStockName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingHolding, setDeletingHolding] = useState<HoldingDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const handleDeleteHolding = useCallback(async () => {
    if (!deletingHolding) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/holdings/${portfolioId}/${deletingHolding.symbol}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除持仓品种失败");
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: "成功",
          description: result.message,
        });
        onDataRefresh?.();
        setIsDeleteDialogOpen(false);
        setDeletingHolding(null);
      }
    } catch (error) {
      console.error("Error deleting holding:", error);
      toast({
        title: "错误",
        description: "删除持仓品种失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deletingHolding, portfolioId, toast, onDataRefresh]);

  const handleAddClick = useCallback((holding: HoldingDetail) => {
    setSelectedHolding(holding);
    setIsTransactionDialogOpen(true);
  }, []);

  const handleShowTransactions = useCallback((holding: HoldingDetail) => {
    setSelectedSymbol(holding.symbol);
    setSelectedStockName(holding.name);
    setIsTransactionListOpen(true);
  }, []);

  const handleDeleteClick = useCallback((holding: HoldingDetail) => {
    setDeletingHolding(holding);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeTransactionDialog = useCallback(() => {
    setIsTransactionDialogOpen(false);
    setSelectedHolding(null);
  }, []);

  const closeTransactionList = useCallback(() => {
    setIsTransactionListOpen(false);
    setSelectedStockName("");
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeletingHolding(null);
  }, []);

  const state: HoldingsTableState = {
    isTransactionDialogOpen,
    isTransactionListOpen,
    isDeleteDialogOpen,
    selectedHolding,
    selectedSymbol,
    selectedStockName,
    deletingHolding,
    isDeleting,
  };

  const actions: HoldingsTableActions = {
    handleDeleteHolding,
    handleAddClick,
    handleShowTransactions,
    handleDeleteClick,
    closeTransactionDialog,
    closeTransactionList,
    closeDeleteDialog,
  };

  return [state, actions];
}
