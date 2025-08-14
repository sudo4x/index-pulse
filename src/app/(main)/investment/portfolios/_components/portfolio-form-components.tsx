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
export function DefaultTriggerButton({
  size,
  variant,
  text,
}: {
  size?: "sm";
  variant: "default" | "outline";
  text: string;
}) {
  return (
    <Button size={size} variant={variant}>
      <Plus className="mr-2 size-4" />
      {text}
    </Button>
  );
}

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
  commissionMinAmount,
  setCommissionMinAmount,
  commissionRate,
  setCommissionRate,
  isLoading,
  editMode,
  handleSubmit,
}: {
  portfolioName: string;
  setPortfolioName: (value: string) => void;
  commissionMinAmount: number;
  setCommissionMinAmount: (value: number) => void;
  commissionRate: number;
  setCommissionRate: (value: number) => void;
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
      <CommissionFields
        minAmount={commissionMinAmount}
        rate={commissionRate}
        onMinAmountChange={setCommissionMinAmount}
        onRateChange={setCommissionRate}
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
    <div className="grid grid-cols-[80px_1fr] items-center gap-4">
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

// 佣金字段组件
export function CommissionFields({
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
    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-4">
      <Label htmlFor="commissionMin" className="text-sm font-medium">
        最低佣金
      </Label>
      <Input
        id="commissionMin"
        type="number"
        step="0.01"
        min="0"
        value={minAmount}
        onChange={(e) => onMinAmountChange(Number(e.target.value))}
        placeholder="5.00"
        disabled={disabled}
      />
      <Label htmlFor="commissionRate" className="text-sm font-medium">
        佣金率
      </Label>
      <Input
        id="commissionRate"
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
