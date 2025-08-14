import React, { useState, useCallback } from "react";

import { useToast } from "@/hooks/use-toast";

interface PortfolioData {
  id: string;
  name: string;
  commissionMinAmount?: number;
  commissionRate?: number;
}

export function usePortfolioForm(editMode: boolean, portfolioData?: PortfolioData, isOpen?: boolean) {
  const [portfolioName, setPortfolioName] = useState("");
  const [commissionMinAmount, setCommissionMinAmount] = useState<number>(5.0);
  const [commissionRate, setCommissionRate] = useState<number>(0.0003);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 加载组合详细信息
  const loadPortfolioDetails = useCallback(
    async (portfolioId: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/portfolios/${portfolioId}`);
        if (!response.ok) {
          throw new Error("获取组合信息失败");
        }
        const result = await response.json();
        if (result.success) {
          setPortfolioName(result.data.name);
          setCommissionMinAmount(Number(result.data.commissionMinAmount) || 5.0);
          setCommissionRate(Number(result.data.commissionRate) || 0.0003);
        }
      } catch (error) {
        console.error("Error loading portfolio details:", error);
        toast({
          title: "错误",
          description: "获取组合信息失败，请重试",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  // 初始化编辑模式的数据
  React.useEffect(() => {
    if (isOpen) {
      if (editMode && portfolioData) {
        // 如果已有详细数据，直接使用
        if (portfolioData.commissionMinAmount !== undefined && portfolioData.commissionRate !== undefined) {
          setPortfolioName(portfolioData.name);
          setCommissionMinAmount(portfolioData.commissionMinAmount);
          setCommissionRate(portfolioData.commissionRate);
        } else {
          // 否则异步加载
          loadPortfolioDetails(portfolioData.id);
        }
      } else {
        setPortfolioName("");
        setCommissionMinAmount(5.0);
        setCommissionRate(0.0003);
      }
    }
  }, [isOpen, editMode, portfolioData, loadPortfolioDetails]);

  // 表单验证
  const validateForm = () => {
    if (!portfolioName.trim()) {
      toast({
        title: "错误",
        description: "请输入投资组合名称",
        variant: "destructive",
      });
      return false;
    }

    if (commissionMinAmount < 0) {
      toast({
        title: "错误",
        description: "佣金最低金额不能为负数",
        variant: "destructive",
      });
      return false;
    }

    if (commissionRate < 0 || commissionRate > 0.01) {
      toast({
        title: "错误",
        description: "佣金费率必须在0-1%之间",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  return {
    portfolioName,
    setPortfolioName,
    commissionMinAmount,
    setCommissionMinAmount,
    commissionRate,
    setCommissionRate,
    isLoading,
    setIsLoading,
    validateForm,
  };
}
