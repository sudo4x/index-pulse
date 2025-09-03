import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoldingDetail } from "@/types/investment";

import { createLiquidatedHoldingRowHelpers } from "./liquidated-holdings-table-helpers";

interface LiquidatedHoldingsDataTableProps {
  holdings: HoldingDetail[];
  onShowTransactions: (holding: HoldingDetail) => void;
}

export function LiquidatedHoldingsDataTable({ holdings, onShowTransactions }: LiquidatedHoldingsDataTableProps) {
  const { renderLiquidatedHoldingRow } = createLiquidatedHoldingRowHelpers({
    handleShowTransactions: onShowTransactions,
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead className="text-right">实现盈亏</TableHead>
            <TableHead className="text-right">收益率</TableHead>
            <TableHead className="text-right">持有天数</TableHead>
            <TableHead className="text-right">清仓价</TableHead>
            <TableHead className="text-right">现价</TableHead>
            <TableHead className="text-right">轻仓后距今</TableHead>
            <TableHead className="text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{holdings.map(renderLiquidatedHoldingRow)}</TableBody>
      </Table>
    </div>
  );
}
