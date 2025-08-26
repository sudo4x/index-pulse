import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { HoldingDetail } from "@/types/investment";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionsTable } from "./transactions-table";

interface HoldingDialogsManagerProps {
  portfolioId: string;

  // Transaction Dialog
  isTransactionDialogOpen: boolean;
  selectedHolding: HoldingDetail | null;
  onTransactionDialogClose: () => void;

  // Transaction List Dialog
  isTransactionListOpen: boolean;
  selectedSymbol: string;
  selectedStockName: string;
  onTransactionListClose: () => void;

  // Delete Dialog
  isDeleteDialogOpen: boolean;
  deletingHolding: HoldingDetail | null;
  isDeleting: boolean;
  onDeleteDialogClose: () => void;
  onDeleteConfirm: () => Promise<void>;

  // Data refresh callback
  onDataRefresh: () => void;
}

export function HoldingDialogsManager({
  portfolioId,
  isTransactionDialogOpen,
  selectedHolding,
  onTransactionDialogClose,
  isTransactionListOpen,
  selectedSymbol,
  selectedStockName,
  onTransactionListClose,
  isDeleteDialogOpen,
  deletingHolding,
  isDeleting,
  onDeleteDialogClose,
  onDeleteConfirm,
  onDataRefresh,
}: HoldingDialogsManagerProps) {
  return (
    <>
      {/* 添加交易对话框 */}
      <TransactionDialog
        isOpen={isTransactionDialogOpen}
        onClose={onTransactionDialogClose}
        portfolioId={portfolioId}
        selectedHolding={selectedHolding}
        onSuccess={onDataRefresh}
      />

      {/* 交易记录列表抽屉 */}
      <Drawer open={isTransactionListOpen} onOpenChange={onTransactionListClose}>
        <DrawerContent className="mx-auto max-h-[80vh] w-[80%]">
          <DrawerHeader>
            <DrawerTitle className="text-xl">{selectedStockName} 交易记录</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="mx-auto">
              <TransactionsTable portfolioId={portfolioId} symbol={selectedSymbol} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 确认删除对话框 */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={onDeleteDialogClose}
        onConfirm={onDeleteConfirm}
        title="删除持仓品种"
        description={`确定要删除品种 ${deletingHolding?.name} (${deletingHolding?.symbol}) 吗？此操作将同时删除该品种的所有交易记录，且无法撤销。`}
        isLoading={isDeleting}
      />
    </>
  );
}
