"use client";

import type { StockSearchResult } from "@/hooks/use-stock-search";

import { StockSearchContainer } from "./stock-search-container";

export type { StockSearchResult };

interface StockSearchProps {
  onStockSelect: (stock: StockSearchResult) => void;
  defaultSymbol?: string;
  defaultName?: string;
  className?: string;
  disableAutoFetch?: boolean;
}

export function StockSearch({
  onStockSelect,
  defaultSymbol,
  defaultName,
  className,
  disableAutoFetch,
}: StockSearchProps) {
  return (
    <StockSearchContainer
      onStockSelect={onStockSelect}
      defaultSymbol={defaultSymbol}
      defaultName={defaultName}
      className={className}
      disableAutoFetch={disableAutoFetch}
    />
  );
}
