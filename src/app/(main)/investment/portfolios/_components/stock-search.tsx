"use client";

import { useState, useRef } from "react";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";

export interface StockSearchResult {
  symbol: string;
  name: string;
  currentPrice: string;
  change: string;
  changePercent: string;
}

interface StockSearchProps {
  onStockSelect: (stock: StockSearchResult) => void;
  className?: string;
}

export function StockSearch({ onStockSelect, className }: StockSearchProps) {
  const [stockCode, setStockCode] = useState("");
  const [stockSearchResults, setStockSearchResults] = useState<StockSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 生成标准格式股票代码
  const generateStandardSymbol = (code: string): string => {
    const upperCode = code.toUpperCase();

    if (upperCode.length !== 6) return upperCode;

    // 沪市个股: 60/688开头
    if (upperCode.startsWith("60") || upperCode.startsWith("688")) {
      return `SH${upperCode}`;
    }

    // 深市个股: 00/002/30开头
    if (upperCode.startsWith("00") || upperCode.startsWith("002") || upperCode.startsWith("30")) {
      return `SZ${upperCode}`;
    }

    // 沪市ETF: 51/588开头
    if (upperCode.startsWith("51") || upperCode.startsWith("588")) {
      return `SH${upperCode}`;
    }

    // 深市ETF: 15/16开头
    if (upperCode.startsWith("15") || upperCode.startsWith("16")) {
      return `SZ${upperCode}`;
    }

    // 指数: 000开头(沪深)，399开头(深市) - 无后缀
    if (upperCode.startsWith("000") || upperCode.startsWith("399")) {
      return upperCode;
    }

    // 默认当作深圳股票
    return `SZ${upperCode}`;
  };

  // 搜索股票
  const searchStock = async (code: string) => {
    if (code.length !== 6) {
      setStockSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const standardSymbol = generateStandardSymbol(code);
      const response = await fetch(`/api/stock-prices?symbols=${standardSymbol}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setStockSearchResults(result.data);
          setShowSearchResults(true);
        } else {
          setStockSearchResults([]);
          setShowSearchResults(true);
        }
      }
    } catch (error) {
      console.error("Error searching stock:", error);
      setStockSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 处理股票代码输入
  const handleStockCodeChange = (value: string) => {
    setStockCode(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length === 6) {
      searchTimeoutRef.current = setTimeout(() => {
        searchStock(value);
      }, 300);
    } else {
      setShowSearchResults(false);
      setStockSearchResults([]);
    }
  };

  // 选择股票
  const selectStock = (stock: StockSearchResult) => {
    const displayValue = `${stock.symbol}(${stock.name})`;
    setStockCode(displayValue);
    setSelectedStock(stock);
    onStockSelect(stock);
    setShowSearchResults(false);
  };

  // 清除选择
  const clearSelection = () => {
    setStockCode("");
    setSelectedStock(null);
    setStockSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div className={cn("grid grid-cols-[80px_1fr] items-start gap-4", className)}>
      <Label className="pt-2 text-sm font-medium">股票</Label>
      <div className="space-y-2">
        <div className="relative">
          <Input
            placeholder="输入6位股票代码，如：000858"
            value={stockCode}
            onChange={(e) => handleStockCodeChange(e.target.value)}
            className="w-full"
          />

          {/* 搜索结果下拉 */}
          {showSearchResults && (
            <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-md border bg-white shadow-lg">
              {isSearching ? (
                <div className="text-muted-foreground p-3 text-center">搜索中...</div>
              ) : stockSearchResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto">
                  {stockSearchResults.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="cursor-pointer border-b p-3 last:border-b-0 hover:bg-gray-50"
                      onClick={() => selectStock(stock)}
                    >
                      <div className="font-medium">
                        {stock.name}({stock.symbol})
                      </div>
                      <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                        <span>
                          最新 <span className="text-green-600">{stock.currentPrice}</span>
                        </span>
                        <span className={cn(parseFloat(stock.change) >= 0 ? "text-red-500" : "text-green-500")}>
                          {stock.change}({stock.changePercent}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground p-3 text-center">未找到匹配的股票</div>
              )}
            </div>
          )}
        </div>

        {/* 已选股票显示 - 显示价格和涨跌信息 */}
        {selectedStock && (
          <div className="flex items-center justify-between rounded-md bg-blue-50 p-2">
            <div className="flex items-center space-x-4 text-sm">
              <span className="font-medium">{selectedStock.name}</span>
              <span className="text-green-600">最新 {selectedStock.currentPrice}</span>
              <span className={cn(parseFloat(selectedStock.change || "0") >= 0 ? "text-red-500" : "text-green-500")}>
                {selectedStock.change}({selectedStock.changePercent}%)
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
