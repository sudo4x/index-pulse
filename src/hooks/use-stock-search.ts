import { useState, useRef, useCallback, useEffect } from "react";

export interface StockSearchResult {
  symbol: string;
  name: string;
  currentPrice: string;
  change: string;
  changePercent: string;
  limitUp?: string;
  limitDown?: string;
}

export interface UseStockSearchOptions {
  defaultSymbol?: string;
  defaultName?: string;
  disableAutoFetch?: boolean;
  onStockSelect?: (stock: StockSearchResult) => void;
}

export interface UseStockSearchReturn {
  // 搜索状态
  stockCode: string;
  stockSearchResults: StockSearchResult[];
  showSearchResults: boolean;
  isSearching: boolean;
  selectedStock: StockSearchResult | null;

  // 操作方法
  handleStockCodeChange: (value: string) => void;
  selectStock: (stock: StockSearchResult) => void;
  clearSelection: () => void;
}

export function useStockSearch(options: UseStockSearchOptions = {}): UseStockSearchReturn {
  const { defaultSymbol, defaultName, disableAutoFetch, onStockSelect } = options;

  const [stockCode, setStockCode] = useState("");
  const [stockSearchResults, setStockSearchResults] = useState<StockSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef<string>("");

  // 股票代码检查工具函数
  const isShangHaiCode = useCallback((code: string): boolean => {
    return code.startsWith("60") || code.startsWith("688") || code.startsWith("51") || code.startsWith("588");
  }, []);

  const isShenZhenCode = useCallback((code: string): boolean => {
    return (
      code.startsWith("00") ||
      code.startsWith("002") ||
      code.startsWith("30") ||
      code.startsWith("15") ||
      code.startsWith("16")
    );
  }, []);

  const isIndexCode = useCallback((code: string): boolean => {
    return code.startsWith("000") || code.startsWith("399");
  }, []);

  const generateStandardSymbol = useCallback(
    (code: string): string => {
      const upperCode = code.toUpperCase();

      if (upperCode.length !== 6) return upperCode;

      if (isShangHaiCode(upperCode)) {
        return `SH${upperCode}`;
      }

      if (isShenZhenCode(upperCode)) {
        return `SZ${upperCode}`;
      }

      if (isIndexCode(upperCode)) {
        return upperCode;
      }

      // 默认当作深圳股票
      return `SZ${upperCode}`;
    },
    [isShangHaiCode, isShenZhenCode, isIndexCode],
  );

  // 获取单个股票的实时价格
  const fetchStockPrice = useCallback(async (symbol: string): Promise<StockSearchResult | null> => {
    try {
      const response = await fetch(`/api/stock-info?symbols=${symbol}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          return result.data[0];
        }
      }
    } catch (error) {
      console.error("Error fetching stock price:", error);
    }
    return null;
  }, []);

  // 搜索股票
  const searchStock = useCallback(
    async (code: string) => {
      if (code.length !== 6) {
        setStockSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const standardSymbol = generateStandardSymbol(code);
        const response = await fetch(`/api/stock-info?symbols=${standardSymbol}`);

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
    },
    [generateStandardSymbol],
  );

  // 处理股票代码输入
  const handleStockCodeChange = useCallback(
    (value: string) => {
      setStockCode(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // 先清空之前的搜索结果
      setStockSearchResults([]);
      setShowSearchResults(false);

      if (value.length === 6) {
        searchTimeoutRef.current = setTimeout(() => {
          searchStock(value);
        }, 300);
      }
    },
    [searchStock],
  );

  // 选择股票
  const selectStock = useCallback(
    (stock: StockSearchResult) => {
      const displayValue = `${stock.symbol}(${stock.name})`;
      setStockCode(displayValue);
      setSelectedStock(stock);
      onStockSelect?.(stock);
      setShowSearchResults(false);
    },
    [onStockSelect],
  );

  // 清除选择
  const clearSelection = useCallback(() => {
    setStockCode("");
    setSelectedStock(null);
    setStockSearchResults([]);
    setShowSearchResults(false);
  }, []);

  // 处理默认值并获取实时价格
  useEffect(() => {
    if (defaultSymbol && defaultName) {
      const displayValue = `${defaultSymbol}(${defaultName})`;
      setStockCode(displayValue);

      // 先设置基础信息
      const basicStock: StockSearchResult = {
        symbol: defaultSymbol,
        name: defaultName,
        currentPrice: "0.00",
        change: "0.00",
        changePercent: "0.00",
        limitUp: "0.000",
        limitDown: "0.000",
      };
      setSelectedStock(basicStock);

      // 如果禁用自动获取，只触发基础信息的选择事件
      if (disableAutoFetch) {
        onStockSelect?.(basicStock);
        return;
      }

      // 只有当股票代码真正变化时才获取实时价格，避免重复请求
      if (initializedRef.current !== defaultSymbol) {
        initializedRef.current = defaultSymbol;

        // 尝试获取实时价格
        fetchStockPrice(defaultSymbol).then((priceData) => {
          if (priceData) {
            const updatedStock: StockSearchResult = {
              symbol: defaultSymbol,
              name: defaultName,
              currentPrice: priceData.currentPrice,
              change: priceData.change,
              changePercent: priceData.changePercent,
              limitUp: priceData.limitUp,
              limitDown: priceData.limitDown,
            };
            setSelectedStock(updatedStock);
            onStockSelect?.(updatedStock);
          } else {
            // 如果获取价格失败，仍然触发选择事件
            onStockSelect?.(basicStock);
          }
        });
      } else {
        // 如果是相同股票，只触发选择事件，不重新获取价格
        onStockSelect?.(basicStock);
      }
    } else {
      // 清空时重置初始化状态
      initializedRef.current = "";
    }
  }, [defaultSymbol, defaultName, disableAutoFetch, onStockSelect, fetchStockPrice]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    stockCode,
    stockSearchResults,
    showSearchResults,
    isSearching,
    selectedStock,
    handleStockCodeChange,
    selectStock,
    clearSelection,
  };
}
