"use client";

import { HoldingsTableContainer } from "./holdings-table-container";

interface HoldingsTableProps {
  portfolioId: string;
}

export function HoldingsTable({ portfolioId }: HoldingsTableProps) {
  return <HoldingsTableContainer portfolioId={portfolioId} />;
}
