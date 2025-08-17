import { EventEmitter } from "events";

import { PollingPriceProvider } from "./polling-price-provider";
import { PriceProvider } from "./price-provider";
import { PRICE_UPDATE_EVENTS } from "./websocket-config";
import { WebSocketPriceProvider } from "./websocket-price-provider";
import { PriceUpdateData, ConnectionState, ConnectionStats, PriceProviderConfig } from "./websocket-types";

export interface PriceManagerOptions extends PriceProviderConfig {
  preferWebSocket?: boolean;
  fallbackToPolling?: boolean;
}

export class PriceManager extends EventEmitter {
  private webSocketProvider: WebSocketPriceProvider;
  private pollingProvider: PollingPriceProvider;
  private currentProvider: PriceProvider;
  private options: Required<PriceManagerOptions>;

  constructor(options: PriceManagerOptions = {}) {
    super();

    this.options = {
      preferWebSocket: true,
      fallbackToPolling: true,
      websocketUrl:
        options.websocketUrl ??
        (process.env.NODE_ENV === "production"
          ? "wss://your-worker.your-subdomain.workers.dev"
          : "ws://localhost:8787"),
      pollingInterval: options.pollingInterval ?? 60000,
      autoConnect: options.autoConnect ?? true,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      reconnectDelay: options.reconnectDelay ?? 5000,
    };

    this.webSocketProvider = new WebSocketPriceProvider(this.options);
    this.pollingProvider = new PollingPriceProvider(this.options);

    // 默认使用WebSocket，如果不可用则切换到轮询
    this.currentProvider = this.options.preferWebSocket ? this.webSocketProvider : this.pollingProvider;

    this.setupProviderListeners();
  }

  get state(): ConnectionState {
    return this.currentProvider.state;
  }

  get stats(): ConnectionStats {
    return this.currentProvider.stats;
  }

  get prices(): Record<string, PriceUpdateData> {
    return this.currentProvider.prices;
  }

  get subscribedSymbols(): string[] {
    return this.currentProvider.subscribedSymbols;
  }

  get isWebSocketMode(): boolean {
    return this.currentProvider === this.webSocketProvider;
  }

  get isPollingMode(): boolean {
    return this.currentProvider === this.pollingProvider;
  }

  async connect(): Promise<void> {
    try {
      await this.currentProvider.connect();
    } catch (error) {
      if (this.options.fallbackToPolling && this.currentProvider === this.webSocketProvider) {
        console.warn("WebSocket连接失败，切换到轮询模式", error);
        await this.switchToPolling();
      } else {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.webSocketProvider.disconnect();
    await this.pollingProvider.disconnect();
  }

  async subscribe(symbols: string[]): Promise<void> {
    await this.currentProvider.subscribe(symbols);
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    await this.currentProvider.unsubscribe(symbols);
  }

  async switchToWebSocket(): Promise<void> {
    if (this.currentProvider === this.webSocketProvider) return;

    const subscribedSymbols = this.currentProvider.subscribedSymbols;
    await this.pollingProvider.disconnect();

    this.currentProvider = this.webSocketProvider;
    this.setupProviderListeners();

    await this.webSocketProvider.connect();
    if (subscribedSymbols.length > 0) {
      await this.webSocketProvider.subscribe(subscribedSymbols);
    }

    this.emit(PRICE_UPDATE_EVENTS.STATE_CHANGED, this.currentProvider.state);
  }

  async switchToPolling(): Promise<void> {
    if (this.currentProvider === this.pollingProvider) return;

    const subscribedSymbols = this.currentProvider.subscribedSymbols;
    await this.webSocketProvider.disconnect();

    this.currentProvider = this.pollingProvider;
    this.setupProviderListeners();

    await this.pollingProvider.connect();
    if (subscribedSymbols.length > 0) {
      await this.pollingProvider.subscribe(subscribedSymbols);
    }

    this.emit(PRICE_UPDATE_EVENTS.STATE_CHANGED, this.currentProvider.state);
  }

  destroy(): void {
    this.webSocketProvider.destroy();
    this.pollingProvider.destroy();
    this.removeAllListeners();
  }

  private setupProviderListeners(): void {
    // 清除之前的监听器
    this.webSocketProvider.removeAllListeners();
    this.pollingProvider.removeAllListeners();

    // 为当前提供者设置监听器
    this.currentProvider.on(PRICE_UPDATE_EVENTS.CONNECTED, () => {
      this.emit(PRICE_UPDATE_EVENTS.CONNECTED);
    });

    this.currentProvider.on(PRICE_UPDATE_EVENTS.DISCONNECTED, () => {
      this.emit(PRICE_UPDATE_EVENTS.DISCONNECTED);
    });

    this.currentProvider.on(PRICE_UPDATE_EVENTS.UPDATED, (prices: Record<string, PriceUpdateData>) => {
      this.emit(PRICE_UPDATE_EVENTS.UPDATED, prices);
    });

    this.currentProvider.on(PRICE_UPDATE_EVENTS.ERROR, (error: string) => {
      this.emit(PRICE_UPDATE_EVENTS.ERROR, error);

      // 如果WebSocket出错且启用了回退，尝试切换到轮询
      if (
        this.options.fallbackToPolling &&
        this.currentProvider === this.webSocketProvider &&
        this.pollingProvider.state === ConnectionState.DISCONNECTED
      ) {
        console.warn("WebSocket出错，尝试切换到轮询模式");
        this.switchToPolling().catch((err) => {
          console.error("切换到轮询模式失败:", err);
        });
      }
    });

    this.currentProvider.on(PRICE_UPDATE_EVENTS.STATE_CHANGED, (state: ConnectionState) => {
      this.emit(PRICE_UPDATE_EVENTS.STATE_CHANGED, state);
    });
  }
}
