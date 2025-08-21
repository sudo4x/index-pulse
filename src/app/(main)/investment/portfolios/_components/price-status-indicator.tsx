import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils/time-utils";

interface PriceStatusIndicatorProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastUpdate: string | null;
  enabled: boolean;
}

export function PriceStatusIndicator({
  isConnected,
  isConnecting,
  error,
  lastUpdate,
  enabled,
}: PriceStatusIndicatorProps) {
  // 如果未启用价格更新，不显示任何状态
  if (!enabled) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isConnecting && (
          <Badge variant="outline" className="text-xs">
            连接中...
          </Badge>
        )}
        {isConnected && (
          <Badge variant="default" className="bg-green-500 text-xs">
            实时更新
          </Badge>
        )}
        {error && !isConnected && (
          <Badge variant="destructive" className="text-xs">
            连接失败
          </Badge>
        )}
      </div>
      {lastUpdate && <div className="text-muted-foreground/70 text-xs">{formatRelativeTime(lastUpdate)}</div>}
    </div>
  );
}
