import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

      {/* 交易记录列表对话框 */}
      <Dialog open={isTransactionListOpen} onOpenChange={onTransactionListClose}>
        <DialogContent className="max-h-[85vh] w-full min-w-[70vw] overflow-y-auto p-0">
          <DialogTitle className="sr-only">{selectedStockName} 交易记录</DialogTitle>
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{selectedStockName} 交易记录</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable portfolioId={portfolioId} symbol={selectedSymbol} />
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

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
