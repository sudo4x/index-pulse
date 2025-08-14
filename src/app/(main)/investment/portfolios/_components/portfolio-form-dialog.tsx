"use client";

import React, { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PortfolioOverview } from "@/types/investment";

import { DefaultTriggerButton, LoadingIndicator, PortfolioForm, getButtonProps } from "./portfolio-form-components";
import { usePortfolioForm } from "./use-portfolio-form";

interface PortfolioFormDialogProps {
  variant?: "primary" | "outline";
  onPortfolioCreated?: (portfolio: PortfolioOverview) => void;
  onPortfolioUpdated?: (portfolio: PortfolioOverview) => void;
  buttonText?: string;
  // 编辑模式相关
  editMode?: boolean;
  portfolioData?: {
    id: string;
    name: string;
    commissionMinAmount?: number;
    commissionRate?: number;
  };
  trigger?: React.ReactNode; // 自定义触发器
}

export function PortfolioFormDialog({
  variant = "primary",
  onPortfolioCreated,
  onPortfolioUpdated,
  buttonText,
  editMode = false,
  portfolioData,
  trigger,
}: PortfolioFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // 表单状态管理
  const {
    portfolioName,
    setPortfolioName,
    commissionMinAmount,
    setCommissionMinAmount,
    commissionRate,
    setCommissionRate,
    isLoading,
    setIsLoading,
    validateForm,
  } = usePortfolioForm(editMode, portfolioData, isOpen);

  // 根据模式设置默认按钮文字
  const defaultButtonText = editMode ? "编辑组合" : "创建投资组合";
  const finalButtonText = buttonText ?? defaultButtonText;

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (editMode && portfolioData) {
        await handleUpdatePortfolio();
      } else {
        await handleCreatePortfolio();
      }
    } catch (error) {
      handleSubmitError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePortfolio = async () => {
    const response = await fetch(`/api/portfolios/${portfolioData!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: portfolioName.trim(),
        commissionMinAmount,
        commissionRate,
      }),
    });

    if (!response.ok) {
      throw new Error("更新投资组合失败");
    }

    const result = await response.json();
    if (result.success && onPortfolioUpdated) {
      const updatedPortfolio = buildPortfolioOverview(result.data);
      onPortfolioUpdated(updatedPortfolio);
      handleSuccess("投资组合更新成功");
    }
  };

  const handleCreatePortfolio = async () => {
    const response = await fetch("/api/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: portfolioName.trim(),
        commissionMinAmount,
        commissionRate,
      }),
    });

    if (!response.ok) {
      throw new Error("创建投资组合失败");
    }

    const result = await response.json();
    if (result.success && onPortfolioCreated) {
      const newPortfolio = buildPortfolioOverview(result.data);
      onPortfolioCreated(newPortfolio);
      handleSuccess("投资组合创建成功");
    }
  };

  const buildPortfolioOverview = (data: any): PortfolioOverview => ({
    portfolioId: data.id.toString(),
    name: data.name,
    sortOrder: data.sortOrder ?? 0,
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
  });

  const handleSuccess = (message: string) => {
    setIsOpen(false);
    toast({ title: "成功", description: message });
  };

  const handleSubmitError = (error: any) => {
    console.error("Error saving portfolio:", error);
    toast({
      title: "错误",
      description: editMode ? "更新投资组合失败，请重试" : "创建投资组合失败，请重试",
      variant: "destructive",
    });
  };

  const buttonProps = getButtonProps(variant);
  const formProps = {
    portfolioName,
    setPortfolioName,
    commissionMinAmount,
    setCommissionMinAmount,
    commissionRate,
    setCommissionRate,
    isLoading,
    editMode,
    handleSubmit,
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? <DefaultTriggerButton {...buttonProps} text={finalButtonText} />}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0">
        <DialogTitle className="sr-only">{editMode ? "编辑投资组合" : "创建投资组合"}</DialogTitle>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{editMode ? "编辑投资组合" : "创建投资组合"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoadingIndicator isLoading={isLoading} editMode={editMode} />
            <PortfolioForm {...formProps} />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
