/**
 * 游戏事件发射器 - 用于核心模块的事件系统
 * 模拟 Phaser.Events.EventEmitter 的 API，但可在 Node.js 环境中运行
 */
export class GameEventEmitter {
  private listeners: Map<string | symbol, Set<Function>> = new Map();

  /**
   * 注册事件监听器
   */
  public on(event: string | symbol, fn: Function, _context?: unknown): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return this;
  }

  /**
   * 注册一次性事件监听器
   */
  public once(event: string | symbol, fn: Function, _context?: unknown): this {
    const onceFn = (...args: unknown[]) => {
      this.off(event, onceFn);
      fn.apply(_context, args);
    };
    return this.on(event, onceFn, _context);
  }

  /**
   * 移除事件监听器
   */
  public off(event: string | symbol, fn?: Function, _context?: unknown): this {
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(fn);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  /**
   * 移除所有事件监听器
   */
  public removeAllListeners(event?: string | symbol): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /**
   * 触发事件
   */
  public emit(event: string | symbol, ...args: unknown[]): boolean {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }

    for (const fn of eventListeners) {
      fn(...args);
    }
    return true;
  }

  /**
   * 获取事件监听器数量
   */
  public listenerCount(event: string | symbol): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * 检查是否有事件监听器
   */
  public hasListeners(event: string | symbol): boolean {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size > 0 : false;
  }

  /**
   * 销毁事件发射器
   */
  public destroy(): void {
    this.listeners.clear();
  }
}
