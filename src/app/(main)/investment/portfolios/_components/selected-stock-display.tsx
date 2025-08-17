import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StockSearchResult } from "@/hooks/use-stock-search";
import { cn } from "@/lib/utils";

interface SelectedStockDisplayProps {
  selectedStock: StockSearchResult | null;
  onClear: () => void;
}

export function SelectedStockDisplay({ selectedStock, onClear }: SelectedStockDisplayProps) {
  if (!selectedStock) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-md bg-blue-50 p-2">
      <div className="text-sm">
        <div className="text-muted-foreground">
          <span>
            最新 <span className="text-green-600">{parseFloat(selectedStock.currentPrice).toFixed(3)}</span>
            <span className={cn(parseFloat(selectedStock.change || "0") >= 0 ? "text-red-500" : "text-green-500")}>
              ({parseFloat(selectedStock.changePercent || "0").toFixed(2)}%)
            </span>
            {selectedStock.limitUp && selectedStock.limitDown && (
              <>
                {" 涨停 "}
                <span className="text-red-500">{parseFloat(selectedStock.limitUp).toFixed(3)}</span>
                {" 跌停 "}
                <span className="text-green-500">{parseFloat(selectedStock.limitDown).toFixed(3)}</span>
              </>
            )}
          </span>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
