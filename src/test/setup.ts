/**
 * 测试环境设置文件
 * 
 * 注意：现在使用 alias 而非 overrides，Vitest 会自动使用原版 Vite。
 * 采用 mock db.ts 模块的方式，而不是 mock Dexie，以避免子类属性覆盖问题。
 */

import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Mock IndexedDB（基础实现）
if (typeof global.indexedDB === "undefined") {
  global.indexedDB = {
    open: vi.fn(),
    deleteDatabase: vi.fn(),
    databases: vi.fn().mockResolvedValue([]),
  } as any;
}

// Mock Table - 内存数据库实现
class MockTable<T = any, TKey = any> {
  private data: Map<TKey, T> = new Map();
  
  async get(key: TKey): Promise<T | undefined> {
    return this.data.get(key);
  }
  
  async put(item: T): Promise<TKey> {
    const key = (item as any).id ?? (item as any).date ?? this.data.size;
    this.data.set(key as TKey, item);
    return key as TKey;
  }
  
  async add(item: T): Promise<TKey> {
    return this.put(item);
  }
  
  async update(key: TKey, changes: Partial<T>): Promise<number> {
    const existing = this.data.get(key);
    if (existing) {
      this.data.set(key, { ...existing, ...changes } as T);
      return 1;
    }
    return 0;
  }
  
  async delete(key: TKey): Promise<void> {
    this.data.delete(key);
  }
  
  async clear(): Promise<void> {
    this.data.clear();
  }
  
  async toArray(): Promise<T[]> {
    return Array.from(this.data.values());
  }
  
  async count(): Promise<number> {
    return this.data.size;
  }
  
  async bulkPut(items: T[]): Promise<void> {
    for (const item of items) {
      await this.put(item);
    }
  }
  
  filter(predicate: (item: T) => boolean): {
    toArray: () => Promise<T[]>;
  } {
    return {
      toArray: async () => {
        const all = await this.toArray();
        return all.filter(predicate);
      },
    };
  }
  
  where(index: string): {
    equals: (value: any) => {
      toArray: () => Promise<T[]>;
      first: () => Promise<T | undefined>;
      delete: () => Promise<number>;
    };
    startsWith: (value: string) => {
      toArray: () => Promise<T[]>;
    };
    between: (lower: any, upper: any) => {
      toArray: () => Promise<T[]>;
    };
  } {
    return {
      equals: (value: any) => ({
        toArray: async () => {
          const all = await this.toArray();
          return all.filter((item: any) => item[index] === value);
        },
        first: async () => {
          const all = await this.toArray();
          return all.find((item: any) => item[index] === value);
        },
        delete: async () => {
          const all = await this.toArray();
          let deleted = 0;
          for (const item of all) {
            if ((item as any)[index] === value) {
              const key = (item as any).id ?? (item as any).date;
              if (key !== undefined) {
                this.data.delete(key);
                deleted++;
              }
            }
          }
          return deleted;
        },
      }),
      startsWith: (prefix: string) => ({
        toArray: async () => {
          const all = await this.toArray();
          return all.filter((item: any) => {
            const fieldValue = item[index];
            return typeof fieldValue === "string" && fieldValue.startsWith(prefix);
          });
        },
      }),
      between: (lower: any, upper: any) => ({
        toArray: async () => {
          const all = await this.toArray();
          return all.filter((item: any) => {
            const fieldValue = item[index];
            return fieldValue >= lower && fieldValue <= upper;
          });
        },
      }),
    };
  }
}

// 创建 mock 数据库实例
const mockDb = {
  wordSets: new MockTable(),
  words: new MockTable(),
  userSettings: new MockTable(),
  studySessions: new MockTable(),
  dailyStats: new MockTable(),
  wordProgress: new MockTable(),
  reviewLogs: new MockTable(),
  reviewPlans: new MockTable(),
  
  async open(): Promise<void> {
    // Mock 打开数据库
  },
  
  isOpen(): boolean {
    return true;
  },
  
  async delete(): Promise<void> {
    // Mock 删除数据库
  },
  
  async transaction<T>(
    _mode: string,
    _tables: any,
    callback: (trans: any) => Promise<T>
  ): Promise<T> {
    // 简化的事务实现
    const trans = {
      table: (name: string) => (mockDb as any)[name],
    };
    return await callback(trans);
  },
};

// 初始化默认数据的辅助函数
async function initializeDefaultData() {
  // 确保默认单词集存在
  const defaultWordSet = await mockDb.wordSets.get(0);
  if (!defaultWordSet) {
    await mockDb.wordSets.put({
      id: 0,
      name: "Default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  // 确保用户设置存在（id = 1）
  const userSettings = await mockDb.userSettings.get(1);
  if (!userSettings) {
    const nowIso = new Date().toISOString();
    await mockDb.userSettings.put({
      id: 1,
      currentMode: "flashcard",
      dailyGoal: 20,
      currentStreak: 0,
      longestStreak: 0,
      activeReviewLock: null,
      updatedAt: nowIso,
      createdAt: nowIso,
    });
  }
}

// Mock db.ts 模块 - 这是关键！直接 mock 整个模块，而不是 Dexie
vi.mock("../db", () => {
  return {
    db: mockDb,
    ensureDBOpen: async () => {
      if (!mockDb.isOpen()) {
        await mockDb.open();
      }
      // 确保默认数据存在
      await initializeDefaultData();
      return mockDb;
    },
    getOrCreateDefaultWordSet: async () => {
      await initializeDefaultData();
      return 0;
    },
    resetDB: async () => {
      await mockDb.delete();
      await mockDb.open();
      await initializeDefaultData();
      return mockDb;
    },
    // 导出 JpLearnDB 类（虽然测试中可能不会直接使用，但为了完整性）
    JpLearnDB: class {
      constructor() {
        // 空实现
      }
    },
  };
});

// 扩展 expect 匹配器
expect.extend(matchers);

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
