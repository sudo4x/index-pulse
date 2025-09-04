export interface PriceUpdateData {
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

export interface WebSocketMessage {
  type: "connected" | "subscribed" | "unsubscribed" | "priceUpdate" | "pong" | "error";
  data?:
    | {
        prices: PriceUpdateData[];
        count: number;
        source: string;
      }
    | PriceUpdateData;
  symbols?: string[];
  message?: string;
  clientId?: string;
  timestamp: string;
}

export interface ConnectionStats {
  totalSubscriptions: number;
  totalUpdates: number;
  connectionTime: string | null;
}

export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

export interface PriceProviderConfig {
  websocketUrl?: string;
  autoConnect?: boolean;
  heartbeatInterval?: number;
  reconnectDelay?: number;
}
