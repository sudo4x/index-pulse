import { EventEmitter } from "events";

import { PRICE_UPDATE_EVENTS } from "./websocket-config";
import { WebSocketPriceProvider } from "./websocket-price-provider";
import { PriceUpdateData, ConnectionState, ConnectionStats, PriceProviderConfig } from "./websocket-types";

export type PriceManagerOptions = PriceProviderConfig;

export class PriceManager extends EventEmitter {
  private webSocketProvider: WebSocketPriceProvider;
  private options: Required<PriceProviderConfig>;
  private destroyed: boolean = false;

  constructor(options: PriceManagerOptions = {}) {
    super();

    this.options = {
      websocketUrl:
        options.websocketUrl ??
        (process.env.NODE_ENV === "production"
          ? "wss://your-worker.your-subdomain.workers.dev"
          : "ws://localhost:8787"),
      autoConnect: options.autoConnect ?? true,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      reconnectDelay: options.reconnectDelay ?? 5000,
    };

    this.webSocketProvider = new WebSocketPriceProvider(this.options);
    this.setupProviderListeners();
  }

  get state(): ConnectionState {
    return this.webSocketProvider.state;
  }

  get stats(): ConnectionStats {
    return this.webSocketProvider.stats;
  }

  get prices(): Record<string, PriceUpdateData> {
    return this.webSocketProvider.prices;
  }

  get subscribedSymbols(): string[] {
    return this.webSocketProvider.subscribedSymbols;
  }

  get isWebSocketMode(): boolean {
    return true; // 总是 WebSocket 模式
  }

  get isPollingMode(): boolean {
    return false; // 不再有轮询模式
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  async connect(): Promise<void> {
    console.log("尝试连接到 WebSocket...");
    await this.webSocketProvider.connect();
  }

  async disconnect(): Promise<void> {
    await this.webSocketProvider.disconnect();
  }

  async subscribe(): Promise<void> {
    await this.webSocketProvider.subscribe();
  }

  async unsubscribe(): Promise<void> {
    await this.webSocketProvider.unsubscribe();
  }

  destroy(): void {
    this.destroyed = true;
    this.webSocketProvider.destroy();
    this.removeAllListeners();
  }

  private setupProviderListeners(): void {
    // 清除之前的监听器
    this.webSocketProvider.removeAllListeners();

    // 为 WebSocket 提供者设置监听器
    this.webSocketProvider.on(PRICE_UPDATE_EVENTS.CONNECTED, () => {
      this.emit(PRICE_UPDATE_EVENTS.CONNECTED);
    });

    this.webSocketProvider.on(PRICE_UPDATE_EVENTS.DISCONNECTED, () => {
      this.emit(PRICE_UPDATE_EVENTS.DISCONNECTED);
    });

    this.webSocketProvider.on(PRICE_UPDATE_EVENTS.UPDATED, (prices: unknown) => {
      this.emit(PRICE_UPDATE_EVENTS.UPDATED, prices as Record<string, PriceUpdateData>);
    });

    this.webSocketProvider.on(PRICE_UPDATE_EVENTS.ERROR, (error: unknown) => {
      const errorMessage = error as string;
      this.emit(PRICE_UPDATE_EVENTS.ERROR, errorMessage);
    });

    this.webSocketProvider.on(PRICE_UPDATE_EVENTS.STATE_CHANGED, (state: unknown) => {
      this.emit(PRICE_UPDATE_EVENTS.STATE_CHANGED, state);
    });
  }
}
