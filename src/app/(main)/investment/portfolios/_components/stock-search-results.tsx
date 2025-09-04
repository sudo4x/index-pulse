import { StockSearchResult } from "@/hooks/use-stock-search";
import { formatPercent } from "@/utils/format-utils";
import { cn } from "@/utils/style-utils";

interface StockSearchResultsProps {
  showSearchResults: boolean;
  isSearching: boolean;
  searchResults: StockSearchResult[];
  onSelectStock: (stock: StockSearchResult) => void;
}

export function StockSearchResults({
  showSearchResults,
  isSearching,
  searchResults,
  onSelectStock,
}: StockSearchResultsProps) {
  if (!showSearchResults) {
    return null;
  }

  return (
    <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-md border bg-white shadow-lg">
      {isSearching ? (
        <div className="text-muted-foreground p-3 text-center">搜索中...</div>
      ) : searchResults.length > 0 ? (
        <div className="max-h-48 overflow-y-auto">
          {searchResults.map((stock) => (
            <div
              key={stock.symbol}
              className="cursor-pointer border-b p-3 last:border-b-0 hover:bg-gray-50"
              onClick={() => onSelectStock(stock)}
            >
              <div className="font-medium">
                {stock.symbol}({stock.name})
              </div>
              <div className="text-muted-foreground text-sm">
                <span>
                  最新 <span className="text-green-600">{parseFloat(stock.currentPrice).toFixed(3)}</span>
                  <span className={cn(parseFloat(stock.change) >= 0 ? "text-red-500" : "text-green-500")}>
                    ({formatPercent(parseFloat(stock.changePercent))})
                  </span>
                  {stock.limitUp && stock.limitDown && (
                    <>
                      {" 涨停 "}
                      <span className="text-red-500">{parseFloat(stock.limitUp).toFixed(3)}</span>
                      {" 跌停 "}
                      <span className="text-green-500">{parseFloat(stock.limitDown).toFixed(3)}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground p-3 text-center">未找到匹配的股票</div>
      )}
    </div>
  );
}
