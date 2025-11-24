/**
 * 查询缓存测试
 * 测试 QueryCache 类的功能
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QueryCache } from "../queryCache";

describe("QueryCache", () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
  });

  describe("基本操作", () => {
    it("应该能够设置和获取缓存值", () => {
      cache.set("test-key", "test-value");
      const value = cache.get<string>("test-key");
      expect(value).toBe("test-value");
    });

    it("应该在缓存未命中时返回 null", () => {
      const value = cache.get<string>("non-existent-key");
      expect(value).toBeNull();
    });

    it("应该能够覆盖已存在的缓存值", () => {
      cache.set("test-key", "value1");
      cache.set("test-key", "value2");
      const value = cache.get<string>("test-key");
      expect(value).toBe("value2");
    });
  });

  describe("TTL（过期时间）", () => {
    it("应该在TTL过期后返回 null", async () => {
      cache.set("test-key", "test-value", 100); // 100ms TTL
      expect(cache.get<string>("test-key")).toBe("test-value");

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get<string>("test-key")).toBeNull();
    });

    it("应该在TTL未过期时返回缓存值", async () => {
      cache.set("test-key", "test-value", 1000); // 1秒 TTL
      expect(cache.get<string>("test-key")).toBe("test-value");

      // 等待但未过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.get<string>("test-key")).toBe("test-value");
    });
  });

  describe("LRU 淘汰策略", () => {
    it("应该在超过最大容量时淘汰最久未使用的项", () => {
      const smallCache = new QueryCache({ maxSize: 3 });

      // 添加3个项
      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      smallCache.set("key3", "value3");

      // 访问 key2 和 key3，使 key1 成为最久未使用的
      smallCache.get("key2");
      smallCache.get("key3");

      // 添加第4个项，应该淘汰 key1（最久未使用）
      smallCache.set("key4", "value4");

      expect(smallCache.get("key1")).toBeNull(); // 被淘汰
      expect(smallCache.get("key2")).toBe("value2"); // 保留
      expect(smallCache.get("key3")).toBe("value3"); // 保留
      expect(smallCache.get("key4")).toBe("value4"); // 新添加，保留
    });

    it("应该正确跟踪访问次数和最后访问时间", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      // 多次访问 key1
      cache.get("key1");
      cache.get("key1");
      cache.get("key2");

      // key1 应该被标记为最近使用
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });
  });

  describe("缓存失效", () => {
    it("应该能够清除单个缓存项", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.invalidate("key1");

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBe("value2");
    });

    it("应该能够使用通配符清除多个缓存项", () => {
      cache.set("wordSets:all", "value1");
      cache.set("wordSets:1", "value2");
      cache.set("reviewPlans:all", "value3");
      cache.set("reviewPlans:due", "value4");

      cache.invalidate("wordSets:*");

      expect(cache.get("wordSets:all")).toBeNull();
      expect(cache.get("wordSets:1")).toBeNull();
      expect(cache.get("reviewPlans:all")).toBe("value3");
      expect(cache.get("reviewPlans:due")).toBe("value4");
    });

    it("应该能够清除所有缓存", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      cache.clear();

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBeNull();
    });
  });

  describe("缓存统计", () => {
    it("应该正确统计命中次数", () => {
      cache.set("key1", "value1");
      cache.get("key1"); // 命中
      cache.get("key1"); // 命中
      cache.get("key2"); // 未命中

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it("应该正确统计缓存大小", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it("应该正确统计淘汰次数", () => {
      const smallCache = new QueryCache({ maxSize: 2 });

      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      smallCache.set("key3", "value3"); // 触发淘汰

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
    });
  });

  describe("缓存容量限制", () => {
    it("应该拒绝超过最大项大小的缓存值", () => {
      const smallCache = new QueryCache({ maxItemSize: 100 });

      // 创建一个大对象（估算大小超过100字节）
      const largeValue = "x".repeat(200);
      smallCache.set("large-key", largeValue);

      // 应该无法获取（被拒绝）
      expect(smallCache.get("large-key")).toBeNull();
    });

    it("应该在达到最大容量时自动淘汰", () => {
      const smallCache = new QueryCache({ maxSize: 2 });

      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      expect(smallCache.getStats().size).toBe(2);

      smallCache.set("key3", "value3");
      expect(smallCache.getStats().size).toBe(2); // 仍然为2
      expect(smallCache.get("key1")).toBeNull(); // 被淘汰
    });
  });

  describe("复杂数据类型", () => {
    it("应该能够缓存对象", () => {
      const obj = { name: "test", count: 42 };
      cache.set("obj-key", obj);
      const retrieved = cache.get<typeof obj>("obj-key");
      expect(retrieved).toEqual(obj);
    });

    it("应该能够缓存数组", () => {
      const arr = [1, 2, 3, 4, 5];
      cache.set("arr-key", arr);
      const retrieved = cache.get<number[]>("arr-key");
      expect(retrieved).toEqual(arr);
    });

    it("应该能够缓存嵌套对象", () => {
      const nested = {
        level1: {
          level2: {
            level3: "deep value",
          },
        },
      };
      cache.set("nested-key", nested);
      const retrieved = cache.get<typeof nested>("nested-key");
      expect(retrieved).toEqual(nested);
    });
  });

  describe("缓存命中率计算", () => {
    it("应该正确计算命中率", () => {
      cache.set("key1", "value1");

      cache.get("key1"); // 命中
      cache.get("key1"); // 命中
      cache.get("key2"); // 未命中

      const stats = cache.getStats();
      const hitRate = stats.hits / (stats.hits + stats.misses);
      expect(hitRate).toBeCloseTo(2 / 3, 2);
    });
  });
});
