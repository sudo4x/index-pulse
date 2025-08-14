"use client";

import { useState, useEffect } from "react";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PortfolioOverview } from "@/types/investment";

import { PortfolioFormDialog } from "./_components/portfolio-form-dialog";
import { PortfolioManagementDialog } from "./_components/portfolio-management-dialog";
import { PortfolioTabs } from "./_components/portfolio-tabs";

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<PortfolioOverview[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isManagementDialogOpen, setIsManagementDialogOpen] = useState(false);
  const { toast } = useToast();

  // 处理组合切换
  const handlePortfolioChange = (portfolioId: string) => {
    setActivePortfolioId(portfolioId);
  };

  // 获取投资组合列表
  const fetchPortfolios = async () => {
    try {
      const response = await fetch("/api/portfolios");
      if (!response.ok) {
        throw new Error("获取投资组合失败");
      }
      const result = await response.json();

      if (result.success) {
        // 将数据库字段 id 映射为 portfolioId
        const mappedData = result.data.map(
          (portfolio: { id: number; name: string; sortOrder?: number; description?: string; createdAt: string }) => ({
            portfolioId: portfolio.id.toString(),
            name: portfolio.name,
            sortOrder: portfolio.sortOrder ?? 0,
            totalAssets: 0,
            marketValue: 0,
            cash: 0,
            principal: 0,
            floatAmount: 0,
            floatRate: 0,
            accumAmount: 0,
            accumRate: 0,
            dayFloatAmount: 0,
            dayFloatRate: 0,
          }),
        );
        setPortfolios(mappedData);
        if (mappedData.length > 0 && !activePortfolioId) {
          const firstPortfolioId = mappedData[0].portfolioId;
          setActivePortfolioId(firstPortfolioId);
        }
      }
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      toast({
        title: "错误",
        description: "获取投资组合失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 处理组合创建成功
  const handlePortfolioCreated = (newPortfolio: PortfolioOverview) => {
    setPortfolios((prev) => [...prev, newPortfolio]);
    setActivePortfolioId(newPortfolio.portfolioId);
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <div className="text-muted-foreground text-center">
          <div className="text-lg font-medium">还没有投资组合</div>
          <div className="text-sm">创建您的第一个投资组合来开始管理投资</div>
        </div>
        <PortfolioFormDialog onPortfolioCreated={handlePortfolioCreated} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">投资组合</h1>
          <p className="text-muted-foreground">管理您的投资组合和持仓信息</p>
        </div>
      </div>

      <Tabs value={activePortfolioId ?? undefined} onValueChange={handlePortfolioChange}>
        <div className="flex items-center justify-between">
          <TabsList>
            {portfolios.map((portfolio) => (
              <TabsTrigger key={portfolio.portfolioId} value={portfolio.portfolioId}>
                {portfolio.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center space-x-2">
            <PortfolioFormDialog variant="outline" buttonText="添加组合" onPortfolioCreated={handlePortfolioCreated} />
            <Button size="sm" variant="outline" onClick={() => setIsManagementDialogOpen(true)}>
              <Settings className="mr-2 size-4" />
              管理组合
            </Button>
          </div>
        </div>

        {portfolios.map((portfolio) => (
          <TabsContent key={portfolio.portfolioId} value={portfolio.portfolioId} className="space-y-6">
            <PortfolioTabs portfolioId={portfolio.portfolioId} portfolioName={portfolio.name} />
          </TabsContent>
        ))}
      </Tabs>

      {/* 组合管理对话框 */}
      <PortfolioManagementDialog
        isOpen={isManagementDialogOpen}
        onClose={() => setIsManagementDialogOpen(false)}
        portfolios={portfolios}
        onPortfoliosChange={setPortfolios}
      />
    </div>
  );
}
