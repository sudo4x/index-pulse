"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioOverview } from "@/types/investment";

import { HoldingsTable } from "./holdings-table";
import { OverviewCards } from "./overview-cards";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionsTable } from "./transactions-table";
import { TransferDialog } from "./transfer-dialog";
import { TransfersTable } from "./transfers-table";

interface PortfolioTabsProps {
  portfolioId: string;
  portfolioName: string;
}

export function PortfolioTabs({ portfolioId, portfolioName }: PortfolioTabsProps) {
  const [showHistoricalHoldings, setShowHistoricalHoldings] = useState(false);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<Partial<PortfolioOverview>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createFinancialData = (data: Partial<PortfolioOverview>) => ({
    totalAssets: data.totalAssets ?? 0,
    marketValue: data.marketValue ?? 0,
    cash: data.cash ?? 0,
    principal: data.principal ?? 0,
  });

  const createProfitLossData = (data: Partial<PortfolioOverview>) => ({
    floatAmount: data.floatAmount ?? 0,
    floatRate: data.floatRate ?? 0,
    accumAmount: data.accumAmount ?? 0,
    accumRate: data.accumRate ?? 0,
    dayFloatAmount: data.dayFloatAmount ?? 0,
    dayFloatRate: data.dayFloatRate ?? 0,
  });

  const updateOverviewData = useCallback((data: Partial<PortfolioOverview>) => {
    const financialData = createFinancialData(data);
    const profitLossData = createProfitLossData(data);

    setOverviewData({
      ...financialData,
      ...profitLossData,
    });
  }, []);

  const buildPortfolioIdentity = () => ({
    portfolioId,
    name: portfolioName,
  });

  const buildPortfolioFinancials = () => createFinancialData(overviewData);

  const buildPortfolioProfitLoss = () => createProfitLossData(overviewData);

  const buildCurrentPortfolio = (): PortfolioOverview => ({
    ...buildPortfolioIdentity(),
    ...buildPortfolioFinancials(),
    ...buildPortfolioProfitLoss(),
  });

  const renderHistoricalCheckbox = () => (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="show-historical"
        checked={showHistoricalHoldings}
        onCheckedChange={(checked) => setShowHistoricalHoldings(checked === true)}
      />
      <Label htmlFor="show-historical" className="text-sm font-medium">
        显示历史持仓
      </Label>
    </div>
  );

  const renderActionButtons = () => (
    <div className="flex items-center space-x-2">
      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setActiveDialog("buy")}>
        <ArrowUpRight className="mr-1 size-4" />
        买入
      </Button>
      <Button size="sm" variant="destructive" onClick={() => setActiveDialog("sell")}>
        <ArrowDownRight className="mr-1 size-4" />
        卖出
      </Button>
      <Button size="sm" variant="outline" onClick={() => setActiveDialog("transfer")}>
        <ArrowLeftRight className="mr-1 size-4" />
        银证转账
      </Button>
    </div>
  );

  // 当组合切换时，获取概览数据
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!portfolioId || portfolioId === "undefined") {
      return;
    }

    const fetchPortfolioOverview = async () => {
      try {
        const response = await fetch(`/api/portfolios/${portfolioId}/overview`);

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            updateOverviewData(result.data);
          }
        }
      } catch (error) {
        console.error("Error fetching portfolio overview:", error);
      }
    };

    timeoutRef.current = setTimeout(fetchPortfolioOverview, 100); // 100ms 防抖，比holdings稍微晚一点

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [portfolioId, updateOverviewData]);

  const currentPortfolio = buildCurrentPortfolio();

  return (
    <div className="space-y-6">
      {/* 组合概览信息 */}
      <OverviewCards portfolio={currentPortfolio} />

      {/* 详细信息 Tab */}
      <Tabs defaultValue="holdings" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="holdings">持仓</TabsTrigger>
            <TabsTrigger value="transactions">交易记录</TabsTrigger>
            <TabsTrigger value="transfers">转账记录</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-4">
            {renderHistoricalCheckbox()}
            {renderActionButtons()}
          </div>
        </div>

        <TabsContent value="holdings" className="space-y-4">
          <HoldingsTable portfolioId={portfolioId} showHistorical={showHistoricalHoldings} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionsTable portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <TransfersTable portfolioId={portfolioId} />
        </TabsContent>
      </Tabs>

      {/* 交易对话框 */}
      <TransactionDialog
        isOpen={activeDialog === "buy" || activeDialog === "sell"}
        onClose={() => setActiveDialog(null)}
        portfolioId={portfolioId}
        defaultType={activeDialog === "buy" ? "buy" : activeDialog === "sell" ? "sell" : undefined}
      />

      {/* 转账对话框 */}
      <TransferDialog
        isOpen={activeDialog === "transfer"}
        onClose={() => setActiveDialog(null)}
        portfolioId={portfolioId}
      />
    </div>
  );
}
