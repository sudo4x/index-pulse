import { formatRelativeTime } from "@/utils/time-utils";

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

  // 正常连接且有更新时间，显示更新时间
  if (isConnected && lastUpdate) {
    return (
      <div className="flex justify-end">
        <div className="text-muted-foreground/70 text-xs">更新于{formatRelativeTime(lastUpdate)}</div>
      </div>
    );
  }

  // 显示连接状态（只在连接中或异常时）
  if (isConnecting) {
    return (
      <div className="flex justify-end">
        <div className="text-muted-foreground/70 text-xs">连接中...</div>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="flex justify-end">
        <div className="text-xs text-red-500/70">连接异常</div>
      </div>
    );
  }

  // 其他情况不显示
  return null;
}
