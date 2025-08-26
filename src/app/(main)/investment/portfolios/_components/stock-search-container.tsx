import { FormLabel } from "@/components/ui/form";
import { useStockSearch, UseStockSearchOptions } from "@/hooks/use-stock-search";
import { cn } from "@/lib/utils";

import { SelectedStockDisplay } from "./selected-stock-display";
import { StockSearchInput } from "./stock-search-input";
import { StockSearchResults } from "./stock-search-results";

interface StockSearchContainerProps extends UseStockSearchOptions {
  className?: string;
}

export function StockSearchContainer({ className, onStockSelect, ...searchOptions }: StockSearchContainerProps) {
  const {
    stockCode,
    stockSearchResults,
    showSearchResults,
    isSearching,
    selectedStock,
    handleStockCodeChange,
    selectStock,
    clearSelection,
  } = useStockSearch({ onStockSelect, ...searchOptions });

  return (
    <div className={cn("space-y-2", className)}>
      <FormLabel className="text-sm font-medium">股票</FormLabel>
      <div className="space-y-2">
        <div className="relative">
          <StockSearchInput stockCode={stockCode} onStockCodeChange={handleStockCodeChange} />

          <StockSearchResults
            showSearchResults={showSearchResults}
            isSearching={isSearching}
            searchResults={stockSearchResults}
            onSelectStock={selectStock}
          />
        </div>

        <SelectedStockDisplay selectedStock={selectedStock} onClear={clearSelection} />
      </div>
    </div>
  );
}
