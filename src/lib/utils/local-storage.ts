/**
 * 本地存储工具函数
 * 提供类型安全的 localStorage 操作
 */

/**
 * 从 localStorage 中获取值
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 存储的值或默认值
 */
export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const item = window.localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Failed to get localStorage item "${key}":`, error);
    return defaultValue;
  }
}

/**
 * 向 localStorage 中设置值
 * @param key 存储键名
 * @param value 要存储的值
 */
export function setLocalStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to set localStorage item "${key}":`, error);
  }
}

/**
 * 从 localStorage 中移除值
 * @param key 存储键名
 */
export function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove localStorage item "${key}":`, error);
  }
}

// 常用的存储键名
export const LOCAL_STORAGE_KEYS = {
  HOLDINGS_PRICE_UPDATES_ENABLED: "holdings-price-updates-enabled",
} as const;
