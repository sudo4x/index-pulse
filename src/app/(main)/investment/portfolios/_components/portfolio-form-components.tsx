import React from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 工具函数
export function getButtonProps(variant: "primary" | "outline"): {
  size?: "sm";
  variant: "default" | "outline";
} {
  return {
    size: variant === "primary" ? undefined : ("sm" as const),
    variant: variant === "primary" ? ("default" as const) : ("outline" as const),
  };
}

// 默认触发按钮组件
export const DefaultTriggerButton = React.forwardRef<
  HTMLButtonElement,
  {
    size?: "sm";
    variant: "default" | "outline";
    text: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ size, variant, text, ...props }, ref) => {
  return (
    <Button ref={ref} size={size} variant={variant} {...props}>
      <Plus className="mr-2 size-4" />
      {text}
    </Button>
  );
});

DefaultTriggerButton.displayName = "DefaultTriggerButton";

// 加载指示器组件
export function LoadingIndicator({ isLoading, editMode }: { isLoading: boolean; editMode: boolean }) {
  if (!isLoading || !editMode) return null;

  return (
    <div className="text-muted-foreground flex items-center justify-center py-4">
      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
      正在加载组合信息...
    </div>
  );
}

// 表单组件
export function PortfolioForm({
  portfolioName,
  setPortfolioName,
  stockCommissionMinAmount,
  setStockCommissionMinAmount,
  stockCommissionRate,
  setStockCommissionRate,
  etfCommissionMinAmount,
  setEtfCommissionMinAmount,
  etfCommissionRate,
  setEtfCommissionRate,
  isLoading,
  editMode,
  handleSubmit,
}: {
  portfolioName: string;
  setPortfolioName: (value: string) => void;
  stockCommissionMinAmount: number;
  setStockCommissionMinAmount: (value: number) => void;
  stockCommissionRate: number;
  setStockCommissionRate: (value: number) => void;
  etfCommissionMinAmount: number;
  setEtfCommissionMinAmount: (value: number) => void;
  etfCommissionRate: number;
  setEtfCommissionRate: (value: number) => void;
  isLoading: boolean;
  editMode: boolean;
  handleSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-4"
    >
      <NameField value={portfolioName} onChange={setPortfolioName} disabled={isLoading} />
      <StockCommissionFields
        minAmount={stockCommissionMinAmount}
        rate={stockCommissionRate}
        onMinAmountChange={setStockCommissionMinAmount}
        onRateChange={setStockCommissionRate}
        disabled={isLoading}
      />
      <EtfCommissionFields
        minAmount={etfCommissionMinAmount}
        rate={etfCommissionRate}
        onMinAmountChange={setEtfCommissionMinAmount}
        onRateChange={setEtfCommissionRate}
        disabled={isLoading}
      />
      <SubmitButton isLoading={isLoading} editMode={editMode} />
    </form>
  );
}

// 名称字段组件
export function NameField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-3">
      <Label htmlFor="name" className="text-sm font-medium">
        组合名称
      </Label>
      <Input
        id="name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入投资组合名称"
        disabled={disabled}
      />
    </div>
  );
}

// 个股佣金字段组件
export function StockCommissionFields({
  minAmount,
  rate,
  onMinAmountChange,
  onRateChange,
  disabled,
}: {
  minAmount: number;
  rate: number;
  onMinAmountChange: (value: number) => void;
  onRateChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-[80px_60px_1fr_60px_1fr] items-center gap-3">
      <Label className="text-sm font-medium">个股佣金</Label>
      <Label htmlFor="stockCommissionMin" className="text-muted-foreground text-sm">
        最低(元)
      </Label>
      <Input
        id="stockCommissionMin"
        type="number"
        step="0.01"
        min="0"
        value={minAmount}
        onChange={(e) => onMinAmountChange(Number(e.target.value))}
        placeholder="5.00"
        disabled={disabled}
      />
      <Label htmlFor="stockCommissionRate" className="text-muted-foreground text-sm">
        佣金率
      </Label>
      <Input
        id="stockCommissionRate"
        type="number"
        step="0.0001"
        min="0"
        max="0.01"
        value={rate}
        onChange={(e) => onRateChange(Number(e.target.value))}
        placeholder="0.0003"
        disabled={disabled}
      />
    </div>
  );
}

// ETF佣金字段组件
export function EtfCommissionFields({
  minAmount,
  rate,
  onMinAmountChange,
  onRateChange,
  disabled,
}: {
  minAmount: number;
  rate: number;
  onMinAmountChange: (value: number) => void;
  onRateChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-[80px_60px_1fr_60px_1fr] items-center gap-3">
      <Label className="text-sm font-medium">ETF佣金</Label>
      <Label htmlFor="etfCommissionMin" className="text-muted-foreground text-sm">
        最低(元)
      </Label>
      <Input
        id="etfCommissionMin"
        type="number"
        step="0.01"
        min="0"
        value={minAmount}
        onChange={(e) => onMinAmountChange(Number(e.target.value))}
        placeholder="5.00"
        disabled={disabled}
      />
      <Label htmlFor="etfCommissionRate" className="text-muted-foreground text-sm">
        佣金率
      </Label>
      <Input
        id="etfCommissionRate"
        type="number"
        step="0.0001"
        min="0"
        max="0.01"
        value={rate}
        onChange={(e) => onRateChange(Number(e.target.value))}
        placeholder="0.0003"
        disabled={disabled}
      />
    </div>
  );
}

// 提交按钮组件
export function SubmitButton({ isLoading, editMode }: { isLoading: boolean; editMode: boolean }) {
  return (
    <div className="flex justify-end pt-4">
      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></div>
            {editMode ? "保存中..." : "创建中..."}
          </>
        ) : editMode ? (
          "保存"
        ) : (
          "创建"
        )}
      </Button>
    </div>
  );
}
