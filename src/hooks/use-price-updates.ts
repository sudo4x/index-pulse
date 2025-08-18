import { useState, useEffect, useCallback, useRef } from "react";

import { PriceManager, PriceManagerOptions, PriceUpdateData, ConnectionState } from "@/lib/services/price-manager";
import { PRICE_UPDATE_EVENTS } from "@/lib/services/price-manager/websocket-config";

export interface UsePriceUpdatesReturn {
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

export function usePriceUpdates(options: PriceManagerOptions = {}): UsePriceUpdatesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceUpdateData>>({});
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const priceManagerRef = useRef<PriceManager | null>(null);
  const optionsRef = useRef(options);

  // 更新options引用
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // 初始化价格管理器 - 只在组件挂载时创建一次
  useEffect(() => {
    priceManagerRef.current = new PriceManager(optionsRef.current);
    const priceManager = priceManagerRef.current;

    // 设置事件监听器
    const handleConnected = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    const handleStateChanged = (state: ConnectionState) => {
      setIsConnecting(state === ConnectionState.CONNECTING);
      setIsConnected(state === ConnectionState.CONNECTED);
    };

    const handleUpdated = (newPrices: Record<string, PriceUpdateData>) => {
      setPrices((prev) => ({ ...prev, ...newPrices }));
      setLastUpdate(new Date().toISOString());
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
    };

    priceManager.on(PRICE_UPDATE_EVENTS.CONNECTED, handleConnected);
    priceManager.on(PRICE_UPDATE_EVENTS.DISCONNECTED, handleDisconnected);
    priceManager.on(PRICE_UPDATE_EVENTS.STATE_CHANGED, handleStateChanged);
    priceManager.on(PRICE_UPDATE_EVENTS.UPDATED, handleUpdated);
    priceManager.on(PRICE_UPDATE_EVENTS.ERROR, handleError);

    // 自动连接
    if (optionsRef.current.autoConnect !== false) {
      priceManager.connect().catch((err) => {
        console.error("自动连接失败:", err);
      });
    }

    // 清理函数 - 只在组件卸载时销毁
    return () => {
      priceManager.destroy();
    };
  }, []); // 移除所有依赖，只在组件挂载时执行一次

  // 页面可见性检测 - 简化逻辑，避免额外重连
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("页面隐藏，保持连接");
      } else {
        console.log("页面显示");
        // 不再主动重连，让内部重连机制处理
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    priceManagerRef.current?.subscribe(symbols).catch((err) => {
      console.error("订阅失败:", err);
      setError(`订阅失败: ${err.message}`);
    });
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    priceManagerRef.current?.unsubscribe(symbols).catch((err) => {
      console.error("取消订阅失败:", err);
      setError(`取消订阅失败: ${err.message}`);
    });
  }, []);

  const connect = useCallback(() => {
    priceManagerRef.current?.connect().catch((err) => {
      console.error("连接失败:", err);
      setError(`连接失败: ${err.message}`);
    });
  }, []);

  const disconnect = useCallback(() => {
    priceManagerRef.current?.disconnect().catch((err) => {
      console.error("断开连接失败:", err);
    });
  }, []);

  const stats = priceManagerRef.current?.stats ?? {
    totalSubscriptions: 0,
    totalUpdates: 0,
    connectionTime: null,
  };

  const subscribedSymbols = priceManagerRef.current?.subscribedSymbols ?? [];

  return {
    isConnected,
    isConnecting,
    error,
    prices,
    lastUpdate,
    subscribedSymbols,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    stats,
  };
}
