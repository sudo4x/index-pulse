"use client";

import { HoldingsTableContainer } from "./holdings-table-container";

interface HoldingsTableProps {
  portfolioId: string;
  showHistorical: boolean;
}

export function HoldingsTable({ portfolioId, showHistorical }: HoldingsTableProps) {
  return <HoldingsTableContainer portfolioId={portfolioId} showHistorical={showHistorical} />;
}
