import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoldingDetail } from "@/types/investment";

import { createHoldingRowHelpers } from "./holdings-table-helpers";

interface HoldingsDataTableProps {
  holdings: HoldingDetail[];
  onAddClick: (holding: HoldingDetail) => void;
  onShowTransactions: (holding: HoldingDetail) => void;
  onDeleteClick: (holding: HoldingDetail) => void;
}

export function HoldingsDataTable({ holdings, onAddClick, onShowTransactions, onDeleteClick }: HoldingsDataTableProps) {
  const { renderHoldingRow } = createHoldingRowHelpers({
    handleAddClick: onAddClick,
    handleShowTransactions: onShowTransactions,
    handleDeleteClick: onDeleteClick,
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称/代码</TableHead>
            <TableHead className="text-right">涨跌</TableHead>
            <TableHead className="text-right">市值/持仓</TableHead>
            <TableHead className="text-right">现价/成本</TableHead>
            <TableHead className="text-right">当日盈亏</TableHead>
            <TableHead className="text-right">盈亏</TableHead>
            <TableHead className="text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{holdings.map(renderHoldingRow)}</TableBody>
      </Table>
    </div>
  );
}
