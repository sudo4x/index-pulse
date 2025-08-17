import { EventEmitter } from "events";

import { PriceProvider } from "./price-provider";
import { DEFAULT_WEBSOCKET_CONFIG, PRICE_UPDATE_EVENTS } from "./websocket-config";
import { PriceUpdateData, ConnectionState, ConnectionStats, PriceProviderConfig } from "./websocket-types";

export class PollingPriceProvider extends EventEmitter implements PriceProvider {
  private config: Required<PriceProviderConfig>;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

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
    if (this.isPolling) return;

    this.setState(ConnectionState.POLLING);
    this.connectionStats.connectionTime = new Date().toISOString();
    this.isPolling = true;

    this.emit(PRICE_UPDATE_EVENTS.CONNECTED);

    if (this.subscribedSymbolsList.length > 0) {
      this.startPolling();
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
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

    const newSymbols = [...new Set([...this.subscribedSymbolsList, ...symbols])];
    this.subscribedSymbolsList = newSymbols;
    this.connectionStats.totalSubscriptions = newSymbols.length;

    if (this.isPolling) {
      // 立即获取一次价格
      await this.fetchPrices();
      // 重启轮询以包含新的股票代码
      this.restartPolling();
    }
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    if (symbols.length === 0) return;

    this.subscribedSymbolsList = this.subscribedSymbolsList.filter((symbol) => !symbols.includes(symbol));
    this.connectionStats.totalSubscriptions = this.subscribedSymbolsList.length;

    // 移除已取消订阅的价格数据
    for (const symbol of symbols) {
      delete this.priceData[symbol];
    }

    if (this.subscribedSymbolsList.length === 0) {
      this.stopPolling();
    } else if (this.isPolling) {
      this.restartPolling();
    }
  }

  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }

  private setState(newState: ConnectionState): void {
    if (this.connectionState !== newState) {
      this.connectionState = newState;
      this.emit(PRICE_UPDATE_EVENTS.STATE_CHANGED, newState);
    }
  }

  private startPolling(): void {
    if (this.pollingInterval || this.subscribedSymbolsList.length === 0) return;

    // 立即获取一次
    this.fetchPrices();

    // 设置轮询间隔
    this.pollingInterval = setInterval(() => {
      // 只在页面可见时进行轮询
      if (!document.hidden) {
        this.fetchPrices();
      }
    }, this.config.pollingInterval);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  private restartPolling(): void {
    this.stopPolling();
    this.startPolling();
  }

  private async fetchPrices(): Promise<void> {
    if (this.subscribedSymbolsList.length === 0) return;

    try {
      const symbols = this.subscribedSymbolsList.join(",");
      const response = await fetch(`/api/stock-prices?symbols=${symbols}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const newPrices: Record<string, PriceUpdateData> = {};

        result.data.forEach((priceData: any) => {
          const standardized = this.convertRawDataToPriceUpdate(priceData);
          newPrices[standardized.symbol] = standardized;
        });

        this.priceData = { ...this.priceData, ...newPrices };
        this.connectionStats.totalUpdates += result.data.length;
        this.emit(PRICE_UPDATE_EVENTS.UPDATED, newPrices);
      }
    } catch (error) {
      console.error("轮询获取价格更新失败:", error);
      this.emit(PRICE_UPDATE_EVENTS.ERROR, `轮询失败: ${error}`);
    }
  }

  private convertRawDataToPriceUpdate(rawData: any): PriceUpdateData {
    return {
      symbol: rawData.symbol,
      name: rawData.name ?? rawData.symbol,
      currentPrice: this.safeParseNumber(rawData.currentPrice),
      change: this.safeParseNumber(rawData.change),
      changePercent: this.safeParseNumber(rawData.changePercent),
      volume: this.safeParseNumber(rawData.volume),
      turnover: this.safeParseNumber(rawData.turnover),
      marketValue: this.safeParseNumber(rawData.marketValue),
      limitUp: this.safeParseNumber(rawData.limitUp),
      limitDown: this.safeParseNumber(rawData.limitDown),
      lastUpdated: rawData.lastUpdated ?? new Date().toISOString(),
    };
  }

  private safeParseNumber(value: any): number {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }
}
