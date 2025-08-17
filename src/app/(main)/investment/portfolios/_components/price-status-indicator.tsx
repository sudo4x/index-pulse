import { Badge } from "@/components/ui/badge";

interface PriceStatusIndicatorProps {
  isConnected: boolean;
  isConnecting: boolean;
  isPollingMode: boolean;
  error: string | null;
  totalUpdates: number;
}

export function PriceStatusIndicator({
  isConnected,
  isConnecting,
  isPollingMode,
  error,
  totalUpdates,
}: PriceStatusIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">持仓列表</span>
        {isConnecting && (
          <Badge variant="outline" className="text-xs">
            连接中...
          </Badge>
        )}
        {isConnected && !isPollingMode && (
          <Badge variant="default" className="bg-green-500 text-xs">
            实时更新
          </Badge>
        )}
        {isPollingMode && (
          <Badge variant="secondary" className="bg-blue-500 text-xs text-white">
            轮询模式
          </Badge>
        )}
        {error && !isConnected && !isPollingMode && (
          <Badge variant="destructive" className="text-xs">
            离线模式
          </Badge>
        )}
      </div>
      {totalUpdates > 0 && <div className="text-muted-foreground text-xs">已更新 {totalUpdates} 次</div>}
    </div>
  );
}
