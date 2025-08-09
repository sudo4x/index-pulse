"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Plus, ArrowLeftRight, DollarSign, MinusCircle, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { PortfolioOverview } from "@/types/investment";
import { OverviewCards } from "./overview-cards";
import { HoldingsTable } from "./holdings-table";
import { TransactionsTable } from "./transactions-table";
import { TransfersTable } from "./transfers-table";
import { TransactionDialog } from "./transaction-dialog";
import { TransferDialog } from "./transfer-dialog";

interface PortfolioTabsProps {
  portfolioId: string;
  portfolioName: string;
}

export function PortfolioTabs({ portfolioId, portfolioName }: PortfolioTabsProps) {
  const [showHistoricalHoldings, setShowHistoricalHoldings] = useState(false);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<Partial<PortfolioOverview>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 当组合切换时，获取概览数据
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!portfolioId || portfolioId === "undefined") {
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/portfolios/${portfolioId}/overview`);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setOverviewData({
              totalAssets: result.data.totalAssets || 0,
              marketValue: result.data.marketValue || 0,
              cash: result.data.cash || 0,
              principal: result.data.principal || 0,
              floatAmount: result.data.floatAmount || 0,
              floatRate: result.data.floatRate || 0,
              accumAmount: result.data.accumAmount || 0,
              accumRate: result.data.accumRate || 0,
              dayFloatAmount: result.data.dayFloatAmount || 0,
              dayFloatRate: result.data.dayFloatRate || 0,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching portfolio overview:", error);
      }
    }, 100); // 100ms 防抖，比holdings稍微晚一点
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [portfolioId]);

  // 合并基本信息和概览数据
  const currentPortfolio: PortfolioOverview = { 
    portfolioId,
    name: portfolioName,
    totalAssets: overviewData.totalAssets || 0,
    marketValue: overviewData.marketValue || 0,
    cash: overviewData.cash || 0,
    principal: overviewData.principal || 0,
    floatAmount: overviewData.floatAmount || 0,
    floatRate: overviewData.floatRate || 0,
    accumAmount: overviewData.accumAmount || 0,
    accumRate: overviewData.accumRate || 0,
    dayFloatAmount: overviewData.dayFloatAmount || 0,
    dayFloatRate: overviewData.dayFloatRate || 0,
  };

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
            {/* 显示历史持仓复选框 */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-historical"
                checked={showHistoricalHoldings}
                onCheckedChange={setShowHistoricalHoldings}
              />
              <Label htmlFor="show-historical" className="text-sm font-medium">
                显示历史持仓
              </Label>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setActiveDialog("buy")}
              >
                <ArrowUpRight className="size-4 mr-1" />
                买入
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => setActiveDialog("sell")}
              >
                <ArrowDownRight className="size-4 mr-1" />
                卖出
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setActiveDialog("transfer")}
              >
                <ArrowLeftRight className="size-4 mr-1" />
                银证转账
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="holdings" className="space-y-4">
          <HoldingsTable 
            portfolioId={portfolioId} 
            showHistorical={showHistoricalHoldings}
          />
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