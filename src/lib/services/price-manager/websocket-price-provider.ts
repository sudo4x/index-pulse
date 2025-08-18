import { EventEmitter } from "events";

import { DEFAULT_WEBSOCKET_CONFIG, PRICE_UPDATE_EVENTS } from "./websocket-config";
import {
  PriceUpdateData,
  WebSocketMessage,
  ConnectionState,
  ConnectionStats,
  PriceProviderConfig,
} from "./websocket-types";

export class WebSocketPriceProvider extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<PriceProviderConfig>;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private isDestroyed: boolean = false;

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private connectionStats: ConnectionStats = {
    totalSubscriptions: 0,
    totalUpdates: 0,
    connectionTime: null,
  };
  private priceData: Record<string, PriceUpdateData> = {};
  private subscribedSymbolsList: string[] = [];

  constructor(config: Partial<PriceProviderConfig> = {}) {
    super();
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };
  }

  get state(): ConnectionState {
    return this.connectionState;
  }

  get stats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  get prices(): Record<string, PriceUpdateData> {
    return { ...this.priceData };
  }

  get subscribedSymbols(): string[] {
    return [...this.subscribedSymbolsList];
  }

  async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("Provider has been destroyed");
    }

    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.websocketUrl);

        this.ws.onopen = () => {
          this.setState(ConnectionState.CONNECTED);
          this.connectionStats.connectionTime = new Date().toISOString();
          this.reconnectAttempts = 0; // 重置重连计数
          this.emit(PRICE_UPDATE_EVENTS.CONNECTED);
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = (error) => {
          this.setState(ConnectionState.ERROR);
          const errorMessage = `WebSocket连接失败: ${this.config.websocketUrl}。请检查服务器是否运行。`;
          console.warn(errorMessage, error);
          this.emit(PRICE_UPDATE_EVENTS.ERROR, errorMessage);
          reject(error);
        };
      } catch (error) {
        this.setState(ConnectionState.ERROR);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.clearReconnectTimeout();
    this.clearHeartbeat();

    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      // 使用正常关闭码，避免触发重连
      this.ws.close(1000, "正常关闭");
      this.ws = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.subscribedSymbolsList = [];
    this.priceData = {};
    this.connectionStats = {
      totalSubscriptions: 0,
      totalUpdates: 0,
      connectionTime: null,
    };
  }

  async subscribe(symbols: string[]): Promise<void> {
    if (symbols.length === 0) return;

    const success = this.sendMessage({
      type: "subscribe",
      symbols: symbols.map((s) => s.toUpperCase()),
    });

    if (!success) {
      throw new Error("订阅失败：连接未建立");
    }
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    if (symbols.length === 0) return;

    const success = this.sendMessage({
      type: "unsubscribe",
      symbols: symbols.map((s) => s.toUpperCase()),
    });

    if (!success) {
      throw new Error("取消订阅失败：连接未建立");
    }
  }

  destroy(): void {
    this.isDestroyed = true;

    // 先清理定时器和监听器，再断开连接
    this.clearReconnectTimeout();
    this.clearHeartbeat();
    this.removeAllListeners();

    // 最后关闭 WebSocket 连接
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close(1000, "组件销毁");
      this.ws = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
  }

  private setState(newState: ConnectionState): void {
    if (this.connectionState !== newState) {
      this.connectionState = newState;
      this.emit(PRICE_UPDATE_EVENTS.STATE_CHANGED, newState);
    }
  }

  private sendMessage(message: Record<string, any>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        this.emit(PRICE_UPDATE_EVENTS.ERROR, "发送消息失败");
        return false;
      }
    }
    return false;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      if (data.type) {
        const message: WebSocketMessage = data;
        this.processMessage(message);
      }
    } catch (error) {
      console.error("解析WebSocket消息失败:", error);
      this.emit(PRICE_UPDATE_EVENTS.ERROR, "消息解析失败");
    }
  }

  private processMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "subscribed":
        if (message.symbols) {
          this.subscribedSymbolsList = [...new Set([...this.subscribedSymbolsList, ...message.symbols])];
          this.connectionStats.totalSubscriptions = this.subscribedSymbolsList.length;
        }
        break;

      case "unsubscribed":
        if (message.symbols) {
          this.subscribedSymbolsList = this.subscribedSymbolsList.filter(
            (symbol) => !message.symbols!.includes(symbol),
          );
          this.connectionStats.totalSubscriptions = this.subscribedSymbolsList.length;
        }
        break;

      case "priceUpdate":
        if (message.data && "prices" in message.data) {
          const { prices } = message.data;
          const newPrices: Record<string, PriceUpdateData> = {};

          prices.forEach((rawItem: any) => {
            try {
              const priceData = this.convertRawDataToPriceUpdate(rawItem);
              newPrices[priceData.symbol] = priceData;
            } catch (error) {
              console.warn(`处理股票数据失败: ${rawItem.symbol}`, error);
            }
          });

          this.priceData = { ...this.priceData, ...newPrices };
          this.connectionStats.totalUpdates += prices.length;
          this.emit(PRICE_UPDATE_EVENTS.UPDATED, newPrices);
        }
        break;

      case "error":
        this.emit(PRICE_UPDATE_EVENTS.ERROR, message.message ?? "未知错误");
        break;
    }
  }

  private convertRawDataToPriceUpdate(rawData: any): PriceUpdateData {
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
      lastUpdated: rawData.lastUpdated ?? new Date().toISOString(),
    };
  }

  private handleClose(event: CloseEvent): void {
    this.setState(ConnectionState.DISCONNECTED);
    this.clearHeartbeat();
    this.ws = null;

    // 只有在非正常关闭且未被销毁且重连次数未达上限时才重连
    if (!this.isDestroyed && event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.emit(PRICE_UPDATE_EVENTS.ERROR, `连接断开，尝试第${this.reconnectAttempts + 1}次重连...`);
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit(PRICE_UPDATE_EVENTS.ERROR, "WebSocket重连次数已达上限，将切换到轮询模式");
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: "ping" });
      }
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect().catch((error) => {
          console.error(`第${this.reconnectAttempts}次重连失败:`, error);
        });
      }
    }, this.config.reconnectDelay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}
