"use client";

import { useState } from "react";
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
  portfolio: PortfolioOverview;
}

export function PortfolioTabs({ portfolio }: PortfolioTabsProps) {
  const [showHistoricalHoldings, setShowHistoricalHoldings] = useState(false);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* 组合概览信息 */}
      <OverviewCards portfolio={portfolio} />

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
            portfolioId={portfolio.portfolioId} 
            showHistorical={showHistoricalHoldings}
          />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionsTable portfolioId={portfolio.portfolioId} />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <TransfersTable portfolioId={portfolio.portfolioId} />
        </TabsContent>
      </Tabs>

      {/* 交易对话框 */}
      <TransactionDialog
        isOpen={activeDialog === "buy" || activeDialog === "sell"}
        onClose={() => setActiveDialog(null)}
        portfolioId={portfolio.portfolioId}
        defaultType={activeDialog === "buy" ? "buy" : activeDialog === "sell" ? "sell" : undefined}
      />

      {/* 转账对话框 */}
      <TransferDialog
        isOpen={activeDialog === "transfer"}
        onClose={() => setActiveDialog(null)}
        portfolioId={portfolio.portfolioId}
      />
    </div>
  );
}