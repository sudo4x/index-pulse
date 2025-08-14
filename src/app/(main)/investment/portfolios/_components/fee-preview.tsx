"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeeCalculator } from "@/lib/services/fee-calculator";
import { TransactionType } from "@/types/investment";

interface FeePreviewProps {
  symbol: string;
  transactionType: TransactionType;
  shares: number;
  price: number;
  commissionRate: number;
  commissionMinAmount: number;
}

export function FeePreview({
  symbol,
  transactionType,
  shares,
  price,
  commissionRate,
  commissionMinAmount,
}: FeePreviewProps) {
  const feeCalculation = useMemo(() => {
    if (
      !symbol ||
      !shares ||
      !price ||
      (transactionType !== TransactionType.BUY && transactionType !== TransactionType.SELL)
    ) {
      return null;
    }

    const baseAmount = shares * price;
    if (baseAmount <= 0) return null;

    return FeeCalculator.calculateFees(symbol, transactionType, baseAmount, commissionRate, commissionMinAmount);
  }, [symbol, transactionType, shares, price, commissionRate, commissionMinAmount]);

  if (!feeCalculation) {
    return null;
  }

  const baseAmount = shares * price;
  const finalAmount =
    transactionType === TransactionType.BUY
      ? baseAmount + feeCalculation.totalFee
      : baseAmount - feeCalculation.totalFee;

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">费用预览</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">成交金额：</span>
          <span>¥{baseAmount.toFixed(2)}</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">佣金：</span>
            <span>¥{feeCalculation.commission.toFixed(2)}</span>
          </div>

          {feeCalculation.stampTax > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">印花税：</span>
              <span>¥{feeCalculation.stampTax.toFixed(2)}</span>
            </div>
          )}

          {feeCalculation.transferFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">过户费：</span>
              <span>¥{feeCalculation.transferFee.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="border-t pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">总费用：</span>
            <span className="font-medium">¥{feeCalculation.totalFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {transactionType === TransactionType.BUY ? "实际支出：" : "实际收入："}
            </span>
            <span className="text-primary font-medium">¥{finalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-muted-foreground pt-2 text-xs">
          <p>{feeCalculation.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
