import { History, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPercent, formatShares } from "@/lib/utils/format-utils";
import { HoldingDetail } from "@/types/investment";

interface HoldingTableHelpersProps {
  handleAddClick: (holding: HoldingDetail) => void;
  handleShowTransactions: (holding: HoldingDetail) => void;
  handleDeleteClick: (holding: HoldingDetail) => void;
}

export const createHoldingRowHelpers = ({
  handleAddClick,
  handleShowTransactions,
  handleDeleteClick,
}: HoldingTableHelpersProps) => {
  const renderStockNameCell = (holding: HoldingDetail) => (
    <TableCell>
      <div className="flex flex-col space-y-1">
        <div className="font-medium">{holding.name}</div>
        <div className="text-muted-foreground text-sm">{holding.symbol}</div>
        {!holding.isActive && (
          <Badge variant="secondary" className="w-fit text-xs">
            已清仓
          </Badge>
        )}
      </div>
    </TableCell>
  );

  const renderPriceChangeCell = (holding: HoldingDetail) => (
    <TableCell className="text-right">
      <div className="flex flex-col items-end space-y-1">
        <div className={cn("font-mono", holding.change >= 0 ? "text-green-600" : "text-red-600")}>
          {holding.change >= 0 ? "+" : ""}
          {holding.change.toFixed(3)}
        </div>
        <div className={cn("font-mono text-sm", holding.changePercent >= 0 ? "text-green-600" : "text-red-600")}>
          {holding.changePercent >= 0 ? "+" : ""}
          {formatPercent(holding.changePercent, 3)}
        </div>
      </div>
    </TableCell>
  );

  // 新增：市值/持仓合并单元格
  const renderMarketValueSharesCell = (holding: HoldingDetail) => (
    <TableCell className="text-right">
      <div className="flex flex-col items-end space-y-1">
        <div className="font-mono">¥{holding.marketValue.toFixed(2)}</div>
        <div className="text-muted-foreground font-mono text-sm">{formatShares(holding.shares)}</div>
      </div>
    </TableCell>
  );

  // 新增：现价/成本合并单元格
  const renderPriceCostCell = (holding: HoldingDetail) => (
    <TableCell className="text-right">
      <div className="flex flex-col items-end space-y-1">
        <div className="font-mono">¥{holding.currentPrice.toFixed(3)}</div>
        <div className="text-muted-foreground font-mono text-sm">¥{holding.cost.toFixed(3)}</div>
      </div>
    </TableCell>
  );

  const renderProfitLossCell = (amount: number, rate: number) => (
    <TableCell className="text-right">
      <div className="flex flex-col items-end space-y-1">
        <div className={cn("font-mono", amount >= 0 ? "text-green-600" : "text-red-600")}>
          {amount >= 0 ? "+" : ""}¥{amount.toFixed(2)}
        </div>
        <div className={cn("font-mono text-sm", rate >= 0 ? "text-green-600" : "text-red-600")}>
          {rate >= 0 ? "+" : ""}
          {formatPercent(rate, 3)}
        </div>
      </div>
    </TableCell>
  );

  const renderActionsCell = (holding: HoldingDetail) => (
    <TableCell className="text-center">
      <div className="flex items-center justify-center space-x-1">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleAddClick(holding)}>
          <Plus className="mr-1 h-3 w-3" />
          添加
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleShowTransactions(holding)}>
          <History className="mr-1 h-3 w-3" />
          交易
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
          onClick={() => handleDeleteClick(holding)}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          删除
        </Button>
      </div>
    </TableCell>
  );

  const renderHoldingRow = (holding: HoldingDetail) => (
    <TableRow key={holding.id}>
      {renderStockNameCell(holding)}
      {renderPriceChangeCell(holding)}
      {renderMarketValueSharesCell(holding)}
      {renderPriceCostCell(holding)}
      {renderProfitLossCell(holding.dayFloatAmount, holding.dayFloatRate)}
      {renderProfitLossCell(holding.profitAmount, holding.profitRate)}
      {renderActionsCell(holding)}
    </TableRow>
  );

  return {
    renderHoldingRow,
  };
};
