/**
 * 查询缓存管理器
 * 提供内存缓存功能，支持 TTL、LRU 淘汰策略和缓存监控
 */

// 缓存项接口
interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number; // 过期时间戳（可选）
  accessCount: number; // 访问次数（用于 LRU）
  lastAccessTime: number; // 最后访问时间（用于 LRU）
}

// 缓存统计信息
interface CacheStats {
  hits: number; // 命中次数
  misses: number; // 未命中次数
  size: number; // 当前缓存项数量
  totalSize: number; // 总大小（字节，估算）
  evictions: number; // 淘汰次数
}

// 缓存配置
interface CacheConfig {
  maxSize: number; // 最大缓存项数量（默认 100）
  maxItemSize: number; // 单个缓存项最大大小（字节，默认 1MB）
  enableMonitoring: boolean; // 是否启用监控（开发环境）
}

/**
 * QueryCache 类
 * 实现内存缓存，支持 TTL、LRU 淘汰和通配符失效
 */
export class QueryCache {
  private cache: Map<string, CacheItem<unknown>>;
  private config: CacheConfig;
  private stats: CacheStats;
  private isDevelopment: boolean;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map();
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.config = {
      maxSize: 100,
      maxItemSize: 1024 * 1024, // 1MB
      enableMonitoring: this.isDevelopment,
      ...config,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      totalSize: 0,
      evictions: 0,
    };
  }

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    // 缓存未命中
    if (!item) {
      this.stats.misses++;
      this.logCacheMiss(key);
      return null;
    }

    // 检查是否过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      this.logCacheExpired(key);
      return null;
    }

    // 更新访问统计（用于 LRU）
    item.accessCount++;
    item.lastAccessTime = Date.now();

    // 缓存命中
    this.stats.hits++;
    this.logCacheHit(key);
    return item.value as T;
  }

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // 检查单个缓存项大小
    const estimatedSize = this.estimateSize(value);
    if (estimatedSize > this.config.maxItemSize) {
      this.logWarning(
        `缓存项 ${key} 大小 ${estimatedSize} 字节超过限制 ${this.config.maxItemSize} 字节，跳过缓存`
      );
      return;
    }

    // 如果缓存已满，执行 LRU 淘汰
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // 设置过期时间
    const expiresAt = ttl ? Date.now() + ttl : undefined;

    // 创建缓存项
    const item: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      expiresAt,
      accessCount: 0,
      lastAccessTime: Date.now(),
    };

    // 更新统计
    const oldItem = this.cache.get(key);
    if (oldItem) {
      this.stats.totalSize -= this.estimateSize(oldItem.value);
    } else {
      this.stats.size++;
    }
    this.stats.totalSize += estimatedSize;

    // 存储缓存
    this.cache.set(key, item as CacheItem<unknown>);
    this.logCacheSet(key, ttl);
  }

  /**
   * 失效缓存（支持通配符）
   * @param pattern 缓存键模式，支持通配符 *（如 "wordSets:*"）
   */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];

    if (pattern.includes("*")) {
      // 通配符匹配
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
    } else {
      // 精确匹配
      if (this.cache.has(pattern)) {
        keysToDelete.push(pattern);
      }
    }

    // 删除匹配的缓存项
    for (const key of keysToDelete) {
      const item = this.cache.get(key);
      if (item) {
        this.stats.totalSize -= this.estimateSize(item.value);
        this.stats.size--;
      }
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.logCacheInvalidate(pattern, keysToDelete.length);
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.stats.totalSize = 0;
    this.logCacheClear(size);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRate,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: this.cache.size,
      totalSize: this.stats.totalSize,
      evictions: 0,
    };
  }

  /**
   * LRU 淘汰：移除最久未使用的缓存项
   */
  private evictLRU(): void {
    if (this.cache.size === 0) {
      return;
    }

    let lruKey: string | null = null;
    let lruTime = Infinity;

    // 找到最久未访问的缓存项
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessTime < lruTime) {
        lruTime = item.lastAccessTime;
        lruKey = key;
      }
    }

    // 删除最久未使用的项
    if (lruKey) {
      const item = this.cache.get(lruKey);
      if (item) {
        this.stats.totalSize -= this.estimateSize(item.value);
        this.stats.size--;
      }
      this.cache.delete(lruKey);
      this.stats.evictions++;
      this.logCacheEvict(lruKey);
    }
  }

  /**
   * 估算对象大小（字节）
   */
  private estimateSize(value: unknown): number {
    try {
      const jsonString = JSON.stringify(value);
      // 使用 UTF-16 编码估算（每个字符 2 字节）
      return jsonString.length * 2;
    } catch {
      // 如果无法序列化，返回一个较大的估算值
      return 1024;
    }
  }

  /**
   * 日志记录（仅在开发环境）
   */
  private logCacheHit(key: string): void {
    if (this.config.enableMonitoring) {
      console.debug(`[QueryCache] 缓存命中: ${key}`);
    }
  }

  private logCacheMiss(key: string): void {
    if (this.config.enableMonitoring) {
      console.debug(`[QueryCache] 缓存未命中: ${key}`);
    }
  }

  private logCacheSet(key: string, ttl?: number): void {
    if (this.config.enableMonitoring) {
      const ttlInfo = ttl ? `, TTL: ${ttl}ms` : "";
      console.debug(
        `[QueryCache] 设置缓存: ${key}${ttlInfo}, 当前大小: ${this.cache.size}/${this.config.maxSize}`
      );
    }
  }

  private logCacheInvalidate(pattern: string, count: number): void {
    if (this.config.enableMonitoring) {
      console.debug(`[QueryCache] 失效缓存: ${pattern}, 删除 ${count} 项`);
    }
  }

  private logCacheClear(size: number): void {
    if (this.config.enableMonitoring) {
      console.debug(`[QueryCache] 清除所有缓存: ${size} 项`);
    }
  }

  private logCacheExpired(key: string): void {
    if (this.config.enableMonitoring) {
      console.debug(`[QueryCache] 缓存过期: ${key}`);
    }
  }

  private logCacheEvict(key: string): void {
    if (this.config.enableMonitoring) {
      console.debug(`[QueryCache] LRU 淘汰: ${key}`);
    }
  }

  private logWarning(message: string): void {
    if (this.config.enableMonitoring) {
      console.warn(`[QueryCache] ${message}`);
    }
  }

  /**
   * 定期输出统计信息（开发环境）
   */
  logStats(): void {
    if (this.config.enableMonitoring) {
      const stats = this.getStats();
      console.log(
        `[QueryCache] 统计信息:`,
        `命中率: ${(stats.hitRate * 100).toFixed(2)}%`,
        `命中: ${stats.hits}`,
        `未命中: ${stats.misses}`,
        `大小: ${stats.size}/${this.config.maxSize}`,
        `总大小: ${(stats.totalSize / 1024).toFixed(2)}KB`,
        `淘汰: ${stats.evictions}`
      );
    }
  }
}

// 导出单例实例
export const queryCache = new QueryCache();

// 定期输出统计信息（开发环境，每 30 秒）
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    queryCache.logStats();
  }, 30000);
}
