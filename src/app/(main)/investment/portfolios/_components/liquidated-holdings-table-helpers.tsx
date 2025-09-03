import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date-utils";
import { formatPercent } from "@/lib/utils/format-utils";
import { HoldingDetail } from "@/types/investment";

interface LiquidatedHoldingTableHelpersProps {
  handleShowTransactions: (holding: HoldingDetail) => void;
}

export const createLiquidatedHoldingRowHelpers = ({ handleShowTransactions }: LiquidatedHoldingTableHelpersProps) => {
  const renderStockNameCell = (holding: HoldingDetail) => {
    const liquidationDate = holding.liquidationTime ? formatDate(holding.liquidationTime) : null;
    const liquidationDisplay = liquidationDate ? `${liquidationDate}清仓` : "已清仓";

    return (
      <TableCell>
        <div className="flex flex-col space-y-1">
          <div className="font-medium">{holding.name}</div>
          <div className="text-muted-foreground text-xs">{liquidationDisplay}</div>
        </div>
      </TableCell>
    );
  };

  const renderRealizedProfitCell = (holding: HoldingDetail) => {
    const realizedProfit = holding.realizedProfit ?? 0;
    return (
      <TableCell className="text-right">
        <div className={cn("font-mono", realizedProfit >= 0 ? "text-red-600" : "text-green-600")}>
          {realizedProfit >= 0 ? "+" : ""}¥{realizedProfit.toFixed(2)}
        </div>
      </TableCell>
    );
  };

  const renderRealizedReturnRateCell = (holding: HoldingDetail) => {
    const returnRate = holding.realizedProfitRate ?? 0;
    return (
      <TableCell className="text-right">
        <div className={cn("font-mono", returnRate >= 0 ? "text-red-600" : "text-green-600")}>
          {returnRate >= 0 ? "+" : ""}
          {formatPercent(returnRate, 2)}
        </div>
      </TableCell>
    );
  };

  const renderHoldingDaysCell = (holding: HoldingDetail) => {
    const holdingDays = holding.holdingDays ?? 0;
    return (
      <TableCell className="text-right">
        <div className="text-muted-foreground font-mono">{holdingDays}天</div>
      </TableCell>
    );
  };

  const renderLiquidationPriceCell = (holding: HoldingDetail) => {
    const liquidationPrice = holding.liquidationPrice ?? 0;
    return (
      <TableCell className="text-right">
        <div className="font-mono">¥{liquidationPrice.toFixed(3)}</div>
      </TableCell>
    );
  };

  const renderCurrentPriceCell = (holding: HoldingDetail) => (
    <TableCell className="text-right">
      <div className="font-mono">¥{holding.currentPrice.toFixed(3)}</div>
    </TableCell>
  );

  const renderPriceChangeSinceLiquidationCell = (holding: HoldingDetail) => {
    const liquidationPrice = holding.liquidationPrice ?? 0;
    if (liquidationPrice === 0) {
      return (
        <TableCell className="text-center">
          <span className="text-gray-400">-</span>
        </TableCell>
      );
    }

    const changeRate = (holding.currentPrice - liquidationPrice) / liquidationPrice;
    return (
      <TableCell className="text-right">
        <div className={cn("font-mono", changeRate >= 0 ? "text-red-600" : "text-green-600")}>
          {changeRate >= 0 ? "+" : ""}
          {formatPercent(changeRate, 2)}
        </div>
      </TableCell>
    );
  };

  const renderActionsCell = (holding: HoldingDetail) => (
    <TableCell className="text-center">
      <div className="flex items-center justify-center">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleShowTransactions(holding)}>
          <History className="mr-1 h-3 w-3" />
          交易
        </Button>
      </div>
    </TableCell>
  );

  const renderLiquidatedHoldingRow = (holding: HoldingDetail) => (
    <TableRow key={holding.id}>
      {renderStockNameCell(holding)}
      {renderRealizedProfitCell(holding)}
      {renderRealizedReturnRateCell(holding)}
      {renderHoldingDaysCell(holding)}
      {renderLiquidationPriceCell(holding)}
      {renderCurrentPriceCell(holding)}
      {renderPriceChangeSinceLiquidationCell(holding)}
      {renderActionsCell(holding)}
    </TableRow>
  );

  return {
    renderLiquidatedHoldingRow,
  };
};
