import { PriceManager, PriceManagerOptions } from "./price-manager";

/**
 * 全局价格管理器单例
 * 确保整个应用只有一个 PriceManager 实例，使用延迟销毁策略避免React严格模式的重复创建问题
 */
class GlobalPriceManager {
  private static instance: PriceManager | null = null;
  private static refCount: number = 0;
  private static destroyTimer: NodeJS.Timeout | null = null;
  private static readonly DESTROY_DELAY = 100; // 100ms延迟销毁

  /**
   * 获取或创建 PriceManager 实例
   */
  static getInstance(options: PriceManagerOptions = {}): PriceManager {
    // 如果有待销毁的定时器，取消它
    if (GlobalPriceManager.destroyTimer) {
      console.log("取消延迟销毁，复用现有实例");
      clearTimeout(GlobalPriceManager.destroyTimer);
      GlobalPriceManager.destroyTimer = null;
    }

    if (!GlobalPriceManager.instance || GlobalPriceManager.instance.isDestroyed) {
      console.log("创建全局 PriceManager 实例");
      GlobalPriceManager.instance = new PriceManager(options);
      GlobalPriceManager.refCount = 0;
    }

    GlobalPriceManager.refCount++;
    console.log(`PriceManager 引用计数: ${GlobalPriceManager.refCount}`);

    return GlobalPriceManager.instance;
  }

  /**
   * 减少引用计数，使用延迟销毁策略
   */
  static releaseInstance(): void {
    if (GlobalPriceManager.instance && GlobalPriceManager.refCount > 0) {
      GlobalPriceManager.refCount--;
      console.log(`PriceManager 引用计数: ${GlobalPriceManager.refCount}`);

      if (GlobalPriceManager.refCount === 0) {
        // 不立即销毁，而是延迟销毁，避免React严格模式的重复创建问题
        console.log(`${GlobalPriceManager.DESTROY_DELAY}ms后销毁实例（如无新引用）`);
        GlobalPriceManager.destroyTimer = setTimeout(() => {
          if (GlobalPriceManager.instance && GlobalPriceManager.refCount === 0) {
            console.log("执行延迟销毁全局 PriceManager 实例");
            GlobalPriceManager.instance.destroy();
            GlobalPriceManager.instance = null;
          }
          GlobalPriceManager.destroyTimer = null;
        }, GlobalPriceManager.DESTROY_DELAY);
      }
    }
  }

  /**
   * 强制销毁实例（用于开发调试）
   */
  static forceDestroy(): void {
    // 清除延迟销毁定时器
    if (GlobalPriceManager.destroyTimer) {
      clearTimeout(GlobalPriceManager.destroyTimer);
      GlobalPriceManager.destroyTimer = null;
    }

    if (GlobalPriceManager.instance) {
      console.log("强制销毁全局 PriceManager 实例");
      GlobalPriceManager.instance.destroy();
      GlobalPriceManager.instance = null;
      GlobalPriceManager.refCount = 0;
    }
  }

  /**
   * 获取当前引用计数
   */
  static getRefCount(): number {
    return GlobalPriceManager.refCount;
  }
}

export { GlobalPriceManager };
