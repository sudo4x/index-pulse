import { PriceProviderConfig } from "./websocket-types";

export const DEFAULT_WEBSOCKET_CONFIG: Required<PriceProviderConfig> = {
  websocketUrl:
    process.env.NODE_ENV === "production" ? "wss://your-worker.your-subdomain.workers.dev" : "ws://localhost:8787",
  pollingInterval: 60000, // 1分钟轮询间隔
  autoConnect: true,
  heartbeatInterval: 30000, // 30秒心跳间隔
  reconnectDelay: 5000, // 5秒重连延迟
};

export const PRICE_UPDATE_EVENTS = {
  CONNECTED: "price:connected",
  DISCONNECTED: "price:disconnected",
  UPDATED: "price:updated",
  ERROR: "price:error",
  STATE_CHANGED: "price:state_changed",
} as const;
