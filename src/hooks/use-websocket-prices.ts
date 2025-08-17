/**
 * @deprecated 使用 usePriceUpdates 替代
 * 此文件保留仅为向后兼容，请迁移到新的价格管理系统
 */

import { usePriceUpdates } from "./use-price-updates";

interface PriceUpdateData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  marketValue: number;
  limitUp: number;
  limitDown: number;
  lastUpdated: string;
}

interface UseWebSocketPricesReturn {
  // 连接状态
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // 价格数据
  prices: Record<string, PriceUpdateData>;
  lastUpdate: string | null;

  // 订阅管理
  subscribedSymbols: string[];
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;

  // 连接控制
  connect: () => void;
  disconnect: () => void;

  // 统计信息
  stats: {
    totalSubscriptions: number;
    totalUpdates: number;
    connectionTime: string | null;
  };
}

/**
 * @deprecated 使用 usePriceUpdates 替代
 * WebSocket股票价格实时更新Hook（兼容性包装器）
 */
export function useWebSocketPrices(websocketUrl?: string, autoConnect: boolean = true): UseWebSocketPricesReturn {
  // 使用新的价格更新Hook，但保持旧的API兼容性
  const priceUpdates = usePriceUpdates({
    websocketUrl,
    autoConnect,
  });

  return {
    isConnected: priceUpdates.isConnected,
    isConnecting: priceUpdates.isConnecting,
    error: priceUpdates.error,
    prices: priceUpdates.prices,
    lastUpdate: priceUpdates.lastUpdate,
    subscribedSymbols: priceUpdates.subscribedSymbols,
    subscribe: priceUpdates.subscribe,
    unsubscribe: priceUpdates.unsubscribe,
    connect: priceUpdates.connect,
    disconnect: priceUpdates.disconnect,
    stats: priceUpdates.stats,
  };
}
