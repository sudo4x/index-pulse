import { PriceUpdateData, ConnectionState, ConnectionStats } from "./websocket-types";

export interface PriceProvider {
  readonly state: ConnectionState;
  readonly stats: ConnectionStats;
  readonly prices: Record<string, PriceUpdateData>;
  readonly subscribedSymbols: string[];

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[]): Promise<void>;
  unsubscribe(symbols: string[]): Promise<void>;

  // 事件监听
  on(event: string, callback: (data: unknown) => void): void;
  off(event: string, callback: (data: unknown) => void): void;

  // 清理资源
  destroy(): void;
}
