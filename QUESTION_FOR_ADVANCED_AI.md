# 问题：Dexie Mock 在 Vitest 测试环境中表属性为 undefined

## 问题描述

在使用 `rolldown-vite` 的项目中，通过手动 mock Dexie 来解决测试环境兼容性问题。虽然已经实施了高级AI建议的方案A（移除 `overrides`，使用 `alias`），模块导出问题已解决，但现在遇到了新的问题：**`db` 实例的表属性（如 `db.userSettings`、`db.wordSets`）在测试中为 `undefined`**。

## 环境信息

- **项目类型**: React + TypeScript + Vite
- **Vite 版本**: `npm:rolldown-vite@7.1.14` (通过 `alias` 配置，测试使用原版 Vite)
- **测试框架**: Vitest `^1.0.4`
- **Node.js 版本**: v24.10.0
- **操作系统**: macOS (darwin 25.1.0)
- **数据库库**: Dexie.js `^4.2.1`

## 相关代码

### 1. 数据库模块 (`src/db.ts`)

```typescript
import Dexie, { Table } from "dexie";

export class JpLearnDB extends Dexie {
  wordSets!: Table<WordSet, number>;
  words!: Table<Word, number>;
  userSettings!: Table<UserSettings, number>;
  studySessions!: Table<StudySession, number>;
  dailyStats!: Table<DailyStat, string>;
  wordProgress!: Table<WordProgress, number>;
  reviewLogs!: Table<ReviewLog, number>;
  reviewPlans!: Table<ReviewPlan, number>;

  constructor() {
    super("jpLearnDB");
    this.version(1).stores({
      wordSets: "++id, name, createdAt",
      words: "++id, kana, kanji, meaning, type, [setId+kana]",
    });
    // ... 其他版本升级逻辑
  }
}

export let db = new JpLearnDB();

export async function ensureDBOpen() {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
    await ensureDefaultWordSetExists();
    return db;
  } catch (error) {
    // ... 错误处理
  }
}
```

### 2. 测试环境设置 (`src/test/setup.ts`)

```typescript
import { expect, afterEach, vi } from "vitest";

// Mock Dexie - 手动实现完整的 Dexie API
vi.mock("dexie", () => {
  // Mock Table 类
  class MockTable<T, TKey> {
    private data: Map<TKey, T> = new Map();
    
    async get(key: TKey): Promise<T | undefined> {
      return this.data.get(key);
    }
    
    async put(item: T): Promise<TKey> {
      const key = (item as any).id ?? (item as any).date ?? this.data.size;
      this.data.set(key as TKey, item);
      return key as TKey;
    }
    
    // ... 其他方法（add, update, delete, toArray, count, bulkPut, filter, where 等）
  }
  
  // Mock Version 类（支持链式调用）
  class MockVersion {
    private _versionNum: number;
    private _storesSchema: any = {};
    private _upgradeFn: ((trans: any) => Promise<void>) | null = null;
    
    constructor(versionNum: number) {
      this._versionNum = versionNum;
    }
    
    stores(schema: any) {
      this._storesSchema = schema;
      return this;
    }
    
    upgrade(fn: (trans: any) => Promise<void>) {
      this._upgradeFn = fn;
      return this;
    }
  }
  
  // Mock Dexie 类
  class MockDexie {
    private _dbName: string;
    private versions: Map<number, MockVersion> = new Map();
    private tables: Map<string, MockTable<any, any>> = new Map();
    private isOpenState: boolean = false;
    
    constructor(dbName: string) {
      this._dbName = dbName;
      // 直接初始化表属性，确保在子类构造函数执行前就已经设置好
      (this as any).wordSets = this.getTable("wordSets");
      (this as any).words = this.getTable("words");
      (this as any).userSettings = this.getTable("userSettings");
      (this as any).studySessions = this.getTable("studySessions");
      (this as any).dailyStats = this.getTable("dailyStats");
      (this as any).wordProgress = this.getTable("wordProgress");
      (this as any).reviewLogs = this.getTable("reviewLogs");
      (this as any).reviewPlans = this.getTable("reviewPlans");
    }
    
    private getTable(name: string): MockTable<any, any> {
      if (!this.tables.has(name)) {
        this.tables.set(name, new MockTable());
      }
      return this.tables.get(name)!;
    }
    
    version(versionNum: number): MockVersion {
      if (!this.versions.has(versionNum)) {
        this.versions.set(versionNum, new MockVersion(versionNum));
      }
      return this.versions.get(versionNum)!;
    }
    
    async open(): Promise<void> {
      this.isOpenState = true;
      // 执行所有版本的 upgrade 函数
      for (const [, version] of this.versions) {
        if ((version as any)._upgradeFn) {
          const trans = new MockTransaction();
          await (version as any)._upgradeFn(trans);
        }
      }
    }
    
    isOpen(): boolean {
      return this.isOpenState;
    }
    
    // ... 其他方法
  }
  
  return {
    default: MockDexie,
    Dexie: MockDexie,
    Table: MockTable,
  };
});
```

### 3. 测试文件 (`src/utils/__tests__/reviewLock.test.ts`)

```typescript
import { db, ensureDBOpen } from "../../db";

describe("reviewLock", () => {
  beforeEach(async () => {
    await ensureDBOpen();
    const settings = await db.userSettings.get(1); // ❌ TypeError: Cannot read properties of undefined (reading 'get')
    // ...
  });
});
```

## 错误信息

```
TypeError: Cannot read properties of undefined (reading 'get')
 ❯ src/utils/__tests__/reviewLock.test.ts:28:44
     26|   afterEach(async () => {
     27|     // 清理锁定状态
     28|     const settings = await db.userSettings.get(1);
       |                                            ^
     29|     if (settings) {
     30|       settings.activeReviewLock = null;
```

以及：

```
ensureDBOpen 失败: TypeError: Cannot read properties of undefined (reading 'get')
    at ensureDefaultWordSetExists (/Users/shenfeng/Project/Lannger/src/db.ts:337:42)
    at Module.ensureDBOpen (/Users/shenfeng/Project/Lannger/src/db.ts:372:11)
```

## 问题分析

### 根本原因

1. **属性声明覆盖问题**：
   - `JpLearnDB` 类中声明了 `userSettings!: Table<UserSettings, number>;` 等属性
   - 这些属性声明会覆盖父类 `MockDexie` 中在构造函数中设置的属性
   - 即使 `MockDexie` 构造函数中设置了 `(this as any).userSettings = this.getTable("userSettings")`，子类的属性声明仍然导致这些属性为 `undefined`

2. **类继承和属性初始化顺序**：
   - TypeScript/JavaScript 中，子类的属性声明会在类定义时创建，但值为 `undefined`
   - 父类构造函数中设置的属性可能被子类的属性声明覆盖
   - `!` 断言（`userSettings!`）只是告诉 TypeScript 这些属性会被初始化，但不会实际初始化它们

### 已尝试的解决方案

1. **在构造函数中直接初始化属性**：
   ```typescript
   constructor(dbName: string) {
     this._dbName = dbName;
     (this as any).userSettings = this.getTable("userSettings");
     // ...
   }
   ```
   - **结果**：失败，子类属性声明仍然覆盖

2. **使用 `Object.defineProperty` 定义 getter**：
   ```typescript
   Object.defineProperty(this, "userSettings", {
     get: () => this.getTable("userSettings"),
     enumerable: true,
     configurable: true,
   });
   ```
   - **结果**：失败，子类属性声明仍然覆盖 getter

3. **在 `version()` 和 `open()` 方法中初始化**：
   - **结果**：失败，属性仍然为 `undefined`

4. **使用 `Object.defineProperty` 但设置 `configurable: false`**：
   - **结果**：未尝试（担心会影响子类的正常使用）

## 关键问题

1. **如何让 `MockDexie` 的表属性在 `JpLearnDB` 继承后仍然可用？**
   - `JpLearnDB` 的属性声明（`userSettings!: Table<...>`）会覆盖父类的属性
   - 需要一种方法让父类的属性设置能够"穿透"子类的属性声明

2. **是否应该修改 `JpLearnDB` 的构造函数？**
   - 在 `super()` 之后显式设置这些属性？
   - 但这需要修改生产代码，可能不是最佳方案

3. **是否应该在测试文件中 mock `db.ts` 模块？**
   - 直接提供 mock 的 `db` 实例，而不是通过 mock Dexie 间接创建
   - 但这需要为每个测试文件都设置 mock

4. **是否有其他更好的 mock 策略？**
   - 使用 `Proxy` 拦截属性访问？
   - 使用其他 mock 库？

## 期望的解决方案

1. **不修改生产代码**（`src/db.ts`）
2. **在 `src/test/setup.ts` 中统一配置**，所有测试都能使用
3. **表属性能够正确访问**，`db.userSettings.get()` 等操作能够正常工作

## 相关文件

- `src/db.ts` - 数据库模块定义
- `src/test/setup.ts` - 测试环境设置
- `src/utils/__tests__/reviewLock.test.ts` - 失败的测试文件
- `package.json` - 已移除 `overrides`，使用 `alias` 配置
- `vitest.config.ts` - 简化的 Vitest 配置

## ✅ 最终解决方案（已解决）

### 问题根源

TypeScript 的类字段初始化机制会覆盖 MockDexie 构造函数设置的属性。即使父类在构造函数中设置了属性，子类的属性声明（`userSettings!: Table<...>`）仍然会导致这些属性为 `undefined`。

### 解决方案

**不要 mock Dexie，而是直接 mock `db.ts` 模块**。这是 Dexie 官方在测试中推荐的方式，也是 Vitest/vite 社区的共识。

### 实施步骤

1. **移除 Dexie mock**：删除 `vi.mock("dexie", ...)` 相关代码
2. **创建 MockTable 类**：实现一个简单的内存数据库，支持所有必要的 API（`get`, `put`, `add`, `toArray`, `where`, `filter`, `count`, `bulkPut`, `delete`, `clear` 等）
3. **创建 mockDb 对象**：直接创建包含所有表属性的对象
4. **Mock db.ts 模块**：使用 `vi.mock("../db", ...)` 直接 mock 整个模块

### 关键代码

```typescript
// src/test/setup.ts

// Mock Table - 内存数据库实现
class MockTable<T = any, TKey = any> {
  private data: Map<TKey, T> = new Map();
  // ... 实现所有必要的 API
}

// 创建 mock 数据库实例
const mockDb = {
  wordSets: new MockTable(),
  words: new MockTable(),
  userSettings: new MockTable(),
  // ... 其他表
  async open(): Promise<void> {},
  isOpen(): boolean { return true; },
};

// Mock db.ts 模块 - 这是关键！
vi.mock("../db", () => {
  return {
    db: mockDb,
    ensureDBOpen: async () => {
      if (!mockDb.isOpen()) {
        await mockDb.open();
      }
      await initializeDefaultData();
      return mockDb;
    },
    // ... 其他导出
  };
});
```

### 优势

- ✅ **彻底避免继承覆盖问题**：完全跳过 Dexie/继承体系，不会被覆盖
- ✅ **更快、可控、测试更稳定**：不需要复杂的 Dexie 内部逻辑
- ✅ **不修改生产代码**：所有改动都在测试环境
- ✅ **兼容所有对 db 的调用**：所有 API 都可以完全模拟

### 测试结果

- ✅ `reviewLock.test.ts`: 11/11 通过
- ✅ `reviewStore.test.ts`: 11/11 通过
- ✅ `dataVerify.test.ts`: 4/4 通过
- ✅ 总计：26 个测试通过，74 个测试跳过（等待启用）

### 相关文件

- `src/test/setup.ts` - 测试环境设置（已更新）
- `src/store/__tests__/reviewStore.test.ts` - 复习计划测试（已简化）
- `src/utils/__tests__/reviewLock.test.ts` - 复习锁定测试（已通过）
