import { Input } from "@/components/ui/input";

interface StockSearchInputProps {
  stockCode: string;
  onStockCodeChange: (value: string) => void;
}

export function StockSearchInput({ stockCode, onStockCodeChange }: StockSearchInputProps) {
  return (
    <Input
      placeholder="输入6位股票代码，如：000858"
      value={stockCode}
      onChange={(e) => onStockCodeChange(e.target.value)}
      className="w-full"
    />
  );
}
