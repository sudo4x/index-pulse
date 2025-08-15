import { useState, useEffect, useCallback, useRef } from "react";

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

interface WebSocketMessage {
  type: "connected" | "subscribed" | "unsubscribed" | "priceUpdate" | "pong" | "error";
  data?: PriceUpdateData;
  symbols?: string[];
  message?: string;
  clientId?: string;
  timestamp: string;
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
 * WebSocket股票价格实时更新Hook
 * 支持本地WebSocket服务和Cloudflare Workers
 */
export function useWebSocketPrices(
  websocketUrl: string = process.env.NODE_ENV === 'production' 
    ? "wss://your-worker.your-subdomain.workers.dev" 
    : "ws://localhost:8787",
  autoConnect: boolean = true
): UseWebSocketPricesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceUpdateData>>({});
  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    totalUpdates: 0,
    connectionTime: null as string | null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 发送消息到WebSocket服务器
   */
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        setError("发送消息失败");
        return false;
      }
    }
    return false;
  }, []);

  /**
   * 转换原始数据为标准格式
   */
  const convertRawDataToPriceUpdate = useCallback((rawData: any): PriceUpdateData => {
    return {
      symbol: rawData.symbol,
      name: rawData.name,
      currentPrice: parseFloat(rawData.currentPrice) || 0,
      change: parseFloat(rawData.change) || 0,
      changePercent: parseFloat(rawData.changePercent) || 0,
      volume: parseFloat(rawData.volume) || 0,
      turnover: parseFloat(rawData.turnover) || 0,
      marketValue: parseFloat(rawData.marketValue) || 0,
      limitUp: parseFloat(rawData.limitUp) || 0,
      limitDown: parseFloat(rawData.limitDown) || 0,
      lastUpdated: rawData.lastUpdated || new Date().toISOString(),
    };
  }, []);

  /**
   * 处理收到的WebSocket消息
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      // 处理结构化消息 (保持向后兼容)
      if (data.type) {
        const message: WebSocketMessage = data;
        switch (message.type) {
          case "connected":
            console.log("WebSocket连接成功:", message.clientId);
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
            setStats(prev => ({
              ...prev,
              connectionTime: new Date().toISOString(),
            }));
            break;

          case "subscribed":
            console.log("订阅成功:", message.symbols);
            if (message.symbols) {
              setSubscribedSymbols(prev => {
                const newSymbols = [...new Set([...prev, ...message.symbols!])];
                setStats(prevStats => ({
                  ...prevStats,
                  totalSubscriptions: newSymbols.length,
                }));
                return newSymbols;
              });
            }
            break;

          case "unsubscribed":
            console.log("取消订阅成功:", message.symbols);
            if (message.symbols) {
              setSubscribedSymbols(prev => {
                const newSymbols = prev.filter(symbol => !message.symbols!.includes(symbol));
                setStats(prevStats => ({
                  ...prevStats,
                  totalSubscriptions: newSymbols.length,
                }));
                return newSymbols;
              });
            }
            break;

          case "priceUpdate":
            if (message.data) {
              setPrices(prev => ({
                ...prev,
                [message.data!.symbol]: message.data!,
              }));
              setLastUpdate(message.data.lastUpdated);
              setStats(prev => ({
                ...prev,
                totalUpdates: prev.totalUpdates + 1,
              }));
              console.log(`价格更新: ${message.data.symbol} = ${message.data.currentPrice}`);
            }
            break;

          case "pong":
            // 心跳响应，保持连接活跃
            break;

          case "error":
            console.error("WebSocket服务器错误:", message.message);
            setError(message.message || "未知错误");
            break;

          default:
            console.warn("未知消息类型:", message.type);
        }
        return;
      }

      // 处理Cloudflare Workers直接数组格式
      if (Array.isArray(data)) {
        console.log(`接收到价格更新批次: ${data.length} 个股票`);
        
        const newPrices: Record<string, PriceUpdateData> = {};
        let lastUpdateTime = "";

        data.forEach((rawItem: any) => {
          try {
            const priceData = convertRawDataToPriceUpdate(rawItem);
            newPrices[priceData.symbol] = priceData;
            lastUpdateTime = priceData.lastUpdated;
            console.log(`价格更新: ${priceData.symbol} = ${priceData.currentPrice}`);
          } catch (error) {
            console.warn(`处理股票数据失败: ${rawItem.symbol}`, error);
          }
        });

        // 批量更新价格数据
        setPrices(prev => ({ ...prev, ...newPrices }));
        setLastUpdate(lastUpdateTime);
        setStats(prev => ({
          ...prev,
          totalUpdates: prev.totalUpdates + data.length,
        }));
        return;
      }

      // 处理单个价格更新对象
      if (data.symbol) {
        const priceData = convertRawDataToPriceUpdate(data);
        setPrices(prev => ({
          ...prev,
          [priceData.symbol]: priceData,
        }));
        setLastUpdate(priceData.lastUpdated);
        setStats(prev => ({
          ...prev,
          totalUpdates: prev.totalUpdates + 1,
        }));
        console.log(`价格更新: ${priceData.symbol} = ${priceData.currentPrice}`);
        return;
      }

      console.warn("未知消息格式:", data);
    } catch (error) {
      console.error("解析WebSocket消息失败:", error);
      setError("消息解析失败");
    }
  }, []);

  /**
   * 连接到WebSocket服务器
   */
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log("WebSocket已连接或正在连接");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log("连接到WebSocket服务器:", websocketUrl);
      const ws = new WebSocket(websocketUrl);

      ws.onopen = () => {
        console.log("WebSocket连接已建立");
        wsRef.current = ws;
        
        // 对于Cloudflare Workers，连接成功即表示已连接
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        setStats(prev => ({
          ...prev,
          connectionTime: new Date().toISOString(),
        }));

        // 启动心跳检测 (可选，Cloudflare Workers可能不需要)
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
              wsRef.current.send(JSON.stringify({ type: "ping" }));
            } catch (error) {
              console.warn("心跳发送失败:", error);
            }
          }
        }, 30000);
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log("WebSocket连接已关闭:", event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // 清理心跳检测
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // 非正常关闭时尝试重连
        if (event.code !== 1000) {
          setError("连接断开，尝试重连...");
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket错误:", error);
        setError("WebSocket连接错误");
        setIsConnecting(false);
      };

    } catch (error) {
      console.error("创建WebSocket连接失败:", error);
      setError("无法创建WebSocket连接");
      setIsConnecting(false);
    }
  }, [websocketUrl, handleMessage, sendMessage]);

  /**
   * 断开WebSocket连接
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "用户主动断开");
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    setSubscribedSymbols([]);
    setPrices({});
    setStats({
      totalSubscriptions: 0,
      totalUpdates: 0,
      connectionTime: null,
    });
  }, []);

  /**
   * 订阅股票代码
   */
  const subscribe = useCallback((symbols: string[]) => {
    if (symbols.length === 0) return;

    const success = sendMessage({
      type: "subscribe",
      symbols: symbols.map(s => s.toUpperCase()),
    });

    if (!success) {
      setError("订阅失败：连接未建立");
    }
  }, [sendMessage]);

  /**
   * 取消订阅股票代码
   */
  const unsubscribe = useCallback((symbols: string[]) => {
    if (symbols.length === 0) return;

    const success = sendMessage({
      type: "unsubscribe", 
      symbols: symbols.map(s => s.toUpperCase()),
    });

    if (!success) {
      setError("取消订阅失败：连接未建立");
    }
  }, [sendMessage]);

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // 移除connect和disconnect的依赖，避免循环

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时保持连接但可以降低更新频率
        console.log("页面隐藏，保持WebSocket连接");
      } else {
        // 页面显示时确保连接活跃
        console.log("页面显示，检查WebSocket连接");
        if (!isConnected && !isConnecting) {
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConnected, isConnecting, connect]);

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