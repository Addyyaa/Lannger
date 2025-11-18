# Langger 架构设计方案

**设计日期**：2024-12-19  
**设计者**：高级架构师  
**协作**：编程专家、数据库设计专家、测试专家  
**任务 ID**：A1, A2, A3, A4, A5

---

## 📋 一、执行摘要

本文档提供 Langger 项目的完整架构设计方案，涵盖：

1. **状态管理架构优化**（A1）：从当前 Store 模式迁移到 Zustand 全局状态管理
2. **错误处理与监控体系**（A2）：建立完整的错误处理、日志记录和监控机制
3. **性能优化架构设计**（A3）：数据库查询优化、Web Worker、缓存策略、虚拟滚动
4. **数据迁移与版本管理优化**（A4）：模块化迁移逻辑、回滚机制、数据完整性校验
5. **测试架构设计**（A5）：Vitest 测试环境、单元测试、集成测试、CI/CD

**设计原则**：

- ✅ **可扩展性**：架构支持未来功能扩展
- ✅ **可维护性**：代码结构清晰，易于理解和修改
- ✅ **高性能**：优化关键路径，提升用户体验
- ✅ **可测试性**：架构支持单元测试和集成测试
- ✅ **可靠性**：完善的错误处理和监控机制

---

## 🏗️ 二、整体架构设计

### 2.1 架构分层

```
┌─────────────────────────────────────────────────────────┐
│   Presentation Layer (UI Components)                    │
│   - React Components (FlashcardStudy, TestStudy, etc.) │
│   - UI State (useState, useReducer)                     │
│   - User Interactions                                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   State Management Layer (Zustand Stores)                │
│   - Global State (wordStore, reviewStore, uiStore)      │
│   - State Selectors                                     │
│   - State Actions                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Business Logic Layer                                  │
│   - Algorithm (调度算法、权重计算)                       │
│   - Services (wordService, reviewService)                │
│   - Utils (工具函数)                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Data Access Layer                                      │
│   - Store Wrappers (wordStore, reviewStore)             │
│   - Database Wrapper (dbWrapper.ts)                      │
│   - Cache Layer (Query Cache)                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Data Persistence Layer                                 │
│   - IndexedDB (Dexie ORM)                                │
│   - Local Storage (Settings Cache)                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Infrastructure Layer                                   │
│   - Error Handler (统一错误处理)                         │
│   - Performance Monitor (性能监控)                       │
│   - Logger (日志系统)                                    │
│   - Web Worker (后台计算)                                │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术选型对比

#### 2.2.1 状态管理方案

| 方案          | 优点                                          | 缺点                    | 适用场景                     | 推荐度     |
| ------------- | --------------------------------------------- | ----------------------- | ---------------------------- | ---------- |
| **Zustand**   | 轻量级、API 简单、TypeScript 支持好、性能优秀 | 生态相对较小            | 中小型应用、需要简单状态管理 | ⭐⭐⭐⭐⭐ |
| Redux Toolkit | 生态成熟、DevTools 强大、中间件丰富           | 样板代码多、学习曲线陡  | 大型应用、复杂状态逻辑       | ⭐⭐⭐     |
| Context API   | 原生支持、无需额外依赖                        | 性能问题、Provider 嵌套 | 简单状态共享                 | ⭐⭐       |
| Jotai         | 原子化状态、细粒度更新                        | 学习曲线、生态较小      | 复杂状态依赖                 | ⭐⭐⭐     |

**推荐方案**：**Zustand**

**理由**：

- 项目规模中等，不需要 Redux 的复杂生态
- Zustand 轻量级（< 1KB），性能优秀
- TypeScript 支持完善，类型推导好
- API 简单，学习成本低
- 支持中间件（持久化、DevTools）

#### 2.2.2 错误监控方案

| 方案                   | 优点                                   | 缺点           | 适用场景         | 推荐度     |
| ---------------------- | -------------------------------------- | -------------- | ---------------- | ---------- |
| **Sentry**             | 功能完整、错误追踪、性能监控、用户反馈 | 免费版有限制   | 生产环境错误监控 | ⭐⭐⭐⭐⭐ |
| LogRocket              | 会话回放、错误追踪                     | 价格较高       | 需要会话回放     | ⭐⭐⭐     |
| 自建日志系统           | 完全控制、无成本                       | 开发维护成本高 | 简单错误记录     | ⭐⭐       |
| Console + LocalStorage | 简单快速                               | 功能有限       | 开发阶段         | ⭐         |

**推荐方案**：**Sentry（生产环境）+ 本地日志（开发环境）**

**理由**：

- Sentry 提供完整的错误追踪和性能监控
- 支持 Source Map，便于定位问题
- 免费版足够中小型项目使用
- 开发环境使用本地日志，避免成本

---

## 📦 三、状态管理架构设计（A1）

### 3.1 当前状态分析

**现状**：

- 使用简单的 Store 模式（`wordStore.ts`, `reviewStore.ts`）
- 组件内部使用 `useState`/`useReducer` 管理本地状态
- 没有全局状态管理，数据通过 Props 传递
- 状态分散，难以追踪和调试

**问题**：

- 状态同步困难（多个组件需要相同数据）
- 无法统一管理 UI 状态（加载、错误等）
- 缺少状态持久化机制
- 难以进行状态调试

### 3.2 Zustand Store 设计

#### 3.2.1 Store 结构

```
src/store/
├── index.ts                 # Store 导出和类型定义
├── wordStore.ts             # 单词数据 Store（迁移自 wordStore.ts）
├── reviewStore.ts           # 复习计划 Store（迁移自 reviewStore.ts）
├── uiStore.ts               # UI 状态 Store（新增）
├── settingsStore.ts         # 用户设置 Store（新增）
└── hooks.ts                 # Store Hooks（便捷访问）
```

#### 3.2.2 Word Store 设计

```typescript
// src/store/wordStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Word, WordSet, WordProgress } from "../db";
import * as wordService from "../services/wordService";

interface WordStore {
  // State
  wordSets: WordSet[];
  words: Record<number, Word>; // wordId -> Word
  wordProgress: Record<number, WordProgress>; // wordId -> Progress
  currentWordSetId: number | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadWordSets: () => Promise<void>;
  loadWords: (wordSetId: number) => Promise<void>;
  loadWordProgress: (wordIds: number[]) => Promise<void>;
  createWordSet: (wordSet: Omit<WordSet, "id">) => Promise<number>;
  createWord: (word: Omit<Word, "id">) => Promise<number>;
  updateWordProgress: (
    wordId: number,
    progress: Partial<WordProgress>
  ) => Promise<void>;
  setCurrentWordSetId: (id: number | null) => void;
  clearError: () => void;
}

export const useWordStore = create<WordStore>()(
  persist(
    (set, get) => ({
      // Initial state
      wordSets: [],
      words: {},
      wordProgress: {},
      currentWordSetId: null,
      loading: false,
      error: null,

      // Actions
      loadWordSets: async () => {
        set({ loading: true, error: null });
        try {
          const wordSets = await wordService.getAllWordSets();
          set({ wordSets, loading: false });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      loadWords: async (wordSetId: number) => {
        set({ loading: true, error: null });
        try {
          const words = await wordService.getWordsBySetId(wordSetId);
          const wordsMap = words.reduce((acc, word) => {
            acc[word.id] = word;
            return acc;
          }, {} as Record<number, Word>);
          set((state) => ({
            words: { ...state.words, ...wordsMap },
            loading: false,
          }));
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      loadWordProgress: async (wordIds: number[]) => {
        try {
          const progresses = await wordService.getWordProgressBatch(wordIds);
          const progressMap = progresses.reduce((acc, progress) => {
            acc[progress.wordId] = progress;
            return acc;
          }, {} as Record<number, WordProgress>);
          set((state) => ({
            wordProgress: { ...state.wordProgress, ...progressMap },
          }));
        } catch (error) {
          set({ error: error.message });
        }
      },

      // ... 其他 actions
    }),
    {
      name: "word-store", // LocalStorage key
      partialize: (state) => ({
        currentWordSetId: state.currentWordSetId,
        // 不持久化 words 和 wordProgress（从数据库加载）
      }),
    }
  )
);
```

#### 3.2.3 UI Store 设计

```typescript
// src/store/uiStore.ts
import { create } from "zustand";
import { ErrorLog } from "../utils/errorHandler";

interface UIStore {
  // Loading states
  loading: Record<string, boolean>; // key -> loading state
  setLoading: (key: string, loading: boolean) => void;

  // Error states
  errors: ErrorLog[];
  addError: (error: ErrorLog) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;

  // Toast notifications
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Modal states
  modals: Record<string, boolean>;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  loading: {},
  setLoading: (key, loading) =>
    set((state) => ({
      loading: { ...state.loading, [key]: loading },
    })),

  errors: [],
  addError: (error) =>
    set((state) => ({
      errors: [...state.errors, error],
    })),
  clearError: (id) =>
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    })),
  clearAllErrors: () => set({ errors: [] }),

  // ... Toast 和 Modal 实现
}));
```

### 3.3 迁移策略

#### 3.3.1 分阶段迁移

**阶段 1：基础设施搭建**（2 小时）

- 安装 Zustand 依赖
- 创建 Store 结构
- 实现 UI Store（新增功能，不影响现有代码）

**阶段 2：Word Store 迁移**（4 小时）

- 创建新的 `wordStore.ts`（Zustand 版本）
- 保持旧的 `wordStore.ts` 作为 `wordService.ts`
- 逐步迁移组件使用新 Store
- 验证功能正常

**阶段 3：Review Store 迁移**（4 小时）

- 创建新的 `reviewStore.ts`（Zustand 版本）
- 迁移复习相关组件
- 验证功能正常

**阶段 4：清理和优化**（2 小时）

- 移除旧 Store 文件
- 统一使用 Store Hooks
- 添加 DevTools 支持

#### 3.3.2 兼容性保证

- 保持旧的 Store API 不变，内部调用新 Store
- 使用适配器模式，逐步迁移
- 充分测试，确保功能正常

### 3.4 实施步骤

1. **安装依赖**

   ```bash
   npm install zustand
   ```

2. **创建 Store 结构**

   - 创建 `src/store/` 目录
   - 实现 `uiStore.ts`（新增功能）
   - 实现 `wordStore.ts`（迁移）
   - 实现 `reviewStore.ts`（迁移）

3. **迁移组件**

   - 从 `wordStore.ts` 导入改为从 `src/store/wordStore.ts` 导入
   - 使用 `useWordStore()` Hook 访问状态
   - 逐步迁移所有组件

4. **测试验证**
   - 单元测试 Store Actions
   - 集成测试组件使用 Store
   - E2E 测试完整流程

---

## 🛡️ 四、错误处理与监控体系设计（A2）

### 4.1 当前错误处理分析

**现状**：

- ✅ 已有 `ErrorBoundary` 组件
- ✅ 已有 `errorHandler.ts` 工具
- ✅ 已有 `dbWrapper.ts` 安全数据库操作
- ⚠️ 缺少统一的错误监控和上报
- ⚠️ 错误日志仅存储在内存
- ⚠️ 缺少错误分析和统计

### 4.2 错误处理架构

```
┌─────────────────────────────────────────────────────────┐
│   Error Sources                                          │
│   - React Components (ErrorBoundary)                    │
│   - Async Operations (API, Database)                    │
│   - User Interactions                                    │
│   - System Events (Unhandled Errors)                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Error Handler (errorHandler.ts)                        │
│   - Error Classification                                │
│   - Error Logging                                        │
│   - User-Friendly Messages                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Error Logger (logger.ts)                              │
│   - Local Storage (开发环境)                             │
│   - Sentry (生产环境)                                    │
│   - Console (调试)                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Error Monitor (errorMonitor.ts)                        │
│   - Error Statistics                                     │
│   - Error Trends                                         │
│   - Alert System                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 错误处理实现

#### 4.3.1 增强 Error Handler

```typescript
// src/utils/errorHandler.ts (增强版)
import * as Sentry from "@sentry/react";

export class AppError extends Error {
  code: string;
  userMessage: string;
  context?: Record<string, unknown>;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;

  constructor(
    message: string,
    code: string,
    options?: {
      userMessage?: string;
      context?: Record<string, unknown>;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
    }
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.userMessage = options?.userMessage || message;
    this.context = options?.context;
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.category = options?.category || ErrorCategory.UNKNOWN;
    this.timestamp = new Date().toISOString();
  }
}

export async function handleError(
  error: unknown,
  context?: Record<string, unknown>,
  options?: {
    showUserMessage?: boolean;
    reportToSentry?: boolean;
    silent?: boolean;
  }
): Promise<void> {
  const errorLog = createErrorLog(error, context);

  // 记录到本地日志
  if (!options?.silent) {
    await logErrorLocally(errorLog);
  }

  // 上报到 Sentry（生产环境）
  if (
    options?.reportToSentry !== false &&
    process.env.NODE_ENV === "production"
  ) {
    reportToSentry(errorLog);
  }

  // 显示用户提示
  if (options?.showUserMessage !== false) {
    showUserNotification(errorLog);
  }

  // 更新错误统计
  updateErrorStatistics(errorLog);
}
```

#### 4.3.2 本地日志系统

```typescript
// src/utils/logger.ts
interface ErrorLog {
  id: string;
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  context?: Record<string, unknown>;
  severity: ErrorSeverity;
  category: ErrorCategory;
}

const MAX_LOGS = 100; // 最多保存 100 条错误日志
const STORAGE_KEY = "langger_error_logs";

export async function logErrorLocally(errorLog: ErrorLog): Promise<void> {
  try {
    const logs = getStoredLogs();
    logs.unshift(errorLog);

    // 限制日志数量
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error("Failed to log error locally:", error);
  }
}

export function getStoredLogs(): ErrorLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearStoredLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

#### 4.3.3 Sentry 集成

```typescript
// src/utils/sentry.ts
import * as Sentry from "@sentry/react";

export function initSentry(): void {
  if (process.env.NODE_ENV !== "production") {
    return; // 开发环境不初始化 Sentry
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% 的性能监控采样率
    beforeSend(event, hint) {
      // 过滤敏感信息
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export function reportToSentry(errorLog: ErrorLog): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  Sentry.captureException(errorLog.error, {
    tags: {
      code: errorLog.error.code,
      category: errorLog.category,
      severity: errorLog.severity,
    },
    contexts: {
      custom: errorLog.context,
    },
  });
}
```

#### 4.3.4 错误监控 Dashboard

```typescript
// src/components/ErrorMonitor.tsx
export function ErrorMonitor() {
  const logs = getStoredLogs();
  const stats = calculateErrorStatistics(logs);

  return (
    <div>
      <h2>错误监控</h2>
      <div>
        <div>总错误数: {stats.total}</div>
        <div>严重错误: {stats.critical}</div>
        <div>最近 24 小时: {stats.last24Hours}</div>
      </div>
      <ErrorLogList logs={logs} />
    </div>
  );
}
```

### 4.4 实施步骤

1. **安装依赖**

   ```bash
   npm install @sentry/react
   ```

2. **增强 Error Handler**

   - 扩展 `AppError` 类
   - 实现本地日志系统
   - 集成 Sentry

3. **全局错误捕获**

   - 在 `main.tsx` 初始化 Sentry
   - 设置全局错误处理器
   - 设置未处理的 Promise 拒绝处理器

4. **错误监控 Dashboard**
   - 创建错误监控组件（开发环境）
   - 实现错误统计和分析
   - 添加错误清理功能

---

## ⚡ 五、性能优化架构设计（A3）

### 5.1 性能瓶颈分析

基于数据库评估报告，主要性能瓶颈：

1. **调度算法 N+1 查询问题**（P0）

   - 当前：逐个查询 `wordProgress`
   - 优化：批量查询 `bulkGet()`

2. **wordProgress 索引过多**（P0）

   - 当前：14 个索引
   - 优化：减少到 5 个核心索引

3. **到期计划查询未使用索引**（P0）

   - 当前：使用 `filter()` 全表扫描
   - 优化：使用索引查询

4. **模糊搜索全表扫描**（P1）
   - 当前：`filter()` 全表扫描
   - 优化：限制搜索范围，添加结果限制

### 5.2 性能优化架构

```
┌─────────────────────────────────────────────────────────┐
│   Query Optimization Layer                               │
│   - Batch Queries (bulkGet, bulkPut)                     │
│   - Index Optimization                                   │
│   - Query Cache                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Computation Layer                                      │
│   - Web Worker (权重计算、排序)                          │
│   - Debounce/Throttle                                    │
│   - Memoization                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Rendering Optimization Layer                           │
│   - Virtual Scrolling (react-window)                     │
│   - React.memo, useMemo, useCallback                     │
│   - Code Splitting (React.lazy)                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Caching Layer                                          │
│   - Query Cache (IndexedDB)                              │
│   - Component Cache (React Query)                        │
│   - Local Storage Cache                                  │
└─────────────────────────────────────────────────────────┘
```

### 5.3 查询优化实现

#### 5.3.1 批量查询优化

```typescript
// src/services/wordService.ts
export async function getWordProgressBatch(
  wordIds: number[]
): Promise<WordProgress[]> {
  await ensureDBOpen();

  // 使用 bulkGet 批量查询
  const progresses = await db.wordProgress.bulkGet(wordIds);

  // 过滤 undefined 值
  return progresses.filter((p): p is WordProgress => p !== undefined);
}

// 调度算法中使用
export async function scheduleWords(
  wordIds: number[],
  mode: StudyMode
): Promise<ScheduledWord[]> {
  // 批量查询进度
  const progresses = await getWordProgressBatch(wordIds);

  // 批量查询单词
  const words = await db.words.bulkGet(wordIds);

  // 计算权重（可在 Web Worker 中执行）
  const weights = await calculateWeightsInWorker(progresses, words, mode);

  // 排序
  return sortByWeight(wordIds, weights);
}
```

#### 5.3.2 查询缓存实现

```typescript
// src/utils/queryCache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live (ms)
}

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

// 使用示例
export async function getCachedWordSets(): Promise<WordSet[]> {
  const cacheKey = "wordSets";
  const cached = queryCache.get<WordSet[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const wordSets = await db.wordSets.toArray();
  queryCache.set(cacheKey, wordSets, 10 * 60 * 1000); // 10 分钟缓存
  return wordSets;
}
```

### 5.4 Web Worker 优化

#### 5.4.1 Web Worker 实现

```typescript
// src/workers/weightCalculator.worker.ts
import { calculateWeight } from "../algorithm/weightCalculator";

self.onmessage = (e: MessageEvent) => {
  const { wordIds, progresses, words, mode } = e.data;

  const weights = wordIds.map((wordId: number) => {
    const progress = progresses.find((p: WordProgress) => p.wordId === wordId);
    const word = words.find((w: Word) => w.id === wordId);

    if (!progress || !word) return { wordId, weight: 0 };

    return {
      wordId,
      weight: calculateWeight(progress, word, mode),
    };
  });

  self.postMessage(weights);
};
```

#### 5.4.2 Web Worker 使用

```typescript
// src/utils/workerUtils.ts
export function createWeightCalculatorWorker(): Worker {
  return new Worker(
    new URL("../workers/weightCalculator.worker.ts", import.meta.url),
    { type: "module" }
  );
}

export async function calculateWeightsInWorker(
  wordIds: number[],
  progresses: WordProgress[],
  words: Word[],
  mode: StudyMode
): Promise<Array<{ wordId: number; weight: number }>> {
  return new Promise((resolve, reject) => {
    const worker = createWeightCalculatorWorker();

    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    worker.postMessage({ wordIds, progresses, words, mode });
  });
}
```

### 5.5 实施步骤

1. **数据库查询优化**（P0，2-3 小时）

   - 实现批量查询函数
   - 修改调度算法使用批量查询
   - 优化索引（减少 wordProgress 索引）

2. **查询缓存**（P1，2 小时）

   - 实现 QueryCache 类
   - 在 Store 中集成缓存
   - 添加缓存失效机制

3. **Web Worker**（P1，4 小时）

   - 创建 Web Worker 文件
   - 迁移权重计算到 Worker
   - 测试 Worker 性能

4. **渲染优化**（P1，2 小时）
   - 检查现有虚拟滚动实现
   - 优化组件 memo 使用
   - 添加代码分割

---

## 🔄 六、数据迁移与版本管理优化（A4）

### 6.1 当前迁移机制分析

**现状**：

- ✅ 使用 Dexie 版本管理
- ✅ 基本的迁移逻辑
- ⚠️ 迁移逻辑分散在 `db.ts` 中
- ⚠️ 缺少迁移回滚机制
- ⚠️ 缺少数据完整性校验

### 6.2 迁移架构设计

```
┌─────────────────────────────────────────────────────────┐
│   Migration Manager (migrationManager.ts)                │
│   - Migration Registry                                   │
│   - Migration Execution                                  │
│   - Rollback Support                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Migration Files (migrations/)                          │
│   - v1_to_v2.ts                                          │
│   - v2_to_v3.ts                                          │
│   - v3_to_v4.ts                                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Data Validator (dataValidator.ts)                      │
│   - Schema Validation                                    │
│   - Data Integrity Check                                 │
│   - Consistency Check                                    │
└─────────────────────────────────────────────────────────┘
```

### 6.3 迁移实现

#### 6.3.1 迁移管理器

```typescript
// src/db/migrationManager.ts
interface Migration {
  version: number;
  name: string;
  up: (db: Dexie) => Promise<void>;
  down?: (db: Dexie) => Promise<void>; // 回滚函数
}

class MigrationManager {
  private migrations: Migration[] = [];

  register(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async migrate(
    db: Dexie,
    fromVersion: number,
    toVersion: number
  ): Promise<void> {
    const migrationsToRun = this.migrations.filter(
      (m) => m.version > fromVersion && m.version <= toVersion
    );

    for (const migration of migrationsToRun) {
      try {
        console.log(`Running migration ${migration.name}...`);
        await migration.up(db);
        console.log(`Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`Migration ${migration.name} failed:`, error);
        // 尝试回滚
        if (migration.down) {
          await migration.down(db);
        }
        throw error;
      }
    }
  }

  async rollback(
    db: Dexie,
    fromVersion: number,
    toVersion: number
  ): Promise<void> {
    const migrationsToRollback = this.migrations
      .filter((m) => m.version > toVersion && m.version <= fromVersion)
      .reverse();

    for (const migration of migrationsToRollback) {
      if (migration.down) {
        await migration.down(db);
      }
    }
  }
}

export const migrationManager = new MigrationManager();
```

#### 6.3.2 迁移文件示例

```typescript
// src/db/migrations/v3_to_v4.ts
import { migrationManager } from "../migrationManager";
import { db } from "../index";

migrationManager.register({
  version: 4,
  name: "Add reviewPlans table",
  up: async (db) => {
    // 创建 reviewPlans 表
    // 迁移逻辑已在 db.ts 中实现
  },
  down: async (db) => {
    // 回滚逻辑：删除 reviewPlans 表
    await db.delete();
    // 重新创建旧版本数据库
  },
});
```

#### 6.3.3 数据完整性校验

```typescript
// src/db/dataValidator.ts
export async function validateDataIntegrity(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // 检查孤立记录
  const wordProgresses = await db.wordProgress.toArray();
  for (const progress of wordProgresses) {
    const word = await db.words.get(progress.wordId);
    if (!word) {
      issues.push({
        type: "orphaned_record",
        table: "wordProgress",
        recordId: progress.wordId,
        message: `WordProgress for wordId ${progress.wordId} has no corresponding word`,
      });
    }
  }

  // 检查冗余字段一致性
  for (const progress of wordProgresses) {
    const word = await db.words.get(progress.wordId);
    if (word && progress.setId !== word.setId) {
      issues.push({
        type: "inconsistent_data",
        table: "wordProgress",
        recordId: progress.wordId,
        message: `wordProgress.setId (${progress.setId}) doesn't match word.setId (${word.setId})`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export async function fixDataIntegrity(): Promise<void> {
  const result = await validateDataIntegrity();

  for (const issue of result.issues) {
    if (issue.type === "inconsistent_data" && issue.table === "wordProgress") {
      // 修复冗余字段不一致
      const word = await db.words.get(issue.recordId);
      if (word) {
        await db.wordProgress.update(issue.recordId, { setId: word.setId });
      }
    }
  }
}
```

### 6.4 实施步骤

1. **创建迁移管理器**（2 小时）

   - 实现 `MigrationManager` 类
   - 创建迁移文件结构

2. **重构现有迁移**（2 小时）

   - 将 `db.ts` 中的迁移逻辑提取到独立文件
   - 注册到迁移管理器

3. **实现数据校验**（2 小时）

   - 实现数据完整性检查
   - 实现自动修复功能

4. **测试迁移**（2 小时）
   - 测试正向迁移
   - 测试回滚功能
   - 测试数据校验

---

## 🧪 七、测试架构设计（A5）

### 7.1 当前测试状态分析

**现状**：

- ✅ 已有部分单元测试（Vitest）
- ✅ 测试文件结构清晰（`__tests__` 目录）
- ⚠️ 测试覆盖率不足（目标 > 80%）
- ⚠️ 缺少集成测试
- ⚠️ 缺少 E2E 测试
- ⚠️ 缺少 CI/CD 配置

### 7.2 测试架构设计

```
┌─────────────────────────────────────────────────────────┐
│   Unit Tests (Vitest)                                    │
│   - Algorithm Tests                                      │
│   - Utility Tests                                        │
│   - Store Tests                                           │
│   - Service Tests                                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   Integration Tests (Vitest)                             │
│   - Store + Service Integration                          │
│   - Database Operations                                  │
│   - Component + Store Integration                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   E2E Tests (Cypress / Playwright)                        │
│   - User Flow Tests                                       │
│   - Cross-Browser Tests                                   │
│   - Performance Tests                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│   CI/CD Pipeline (GitHub Actions)                        │
│   - Automated Testing                                     │
│   - Code Coverage Reports                                  │
│   - Automated Deployment                                   │
└─────────────────────────────────────────────────────────┘
```

### 7.3 测试配置

#### 7.3.1 Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

#### 7.3.2 测试工具和 Mock

```typescript
// src/test/setup.ts
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// 清理测试环境
afterEach(() => {
  cleanup();
});

// Mock IndexedDB
import { IDBFactory } from "fake-indexeddb";

global.indexedDB = new IDBFactory();

// Mock Dexie
vi.mock("../db", async () => {
  const actual = await vi.importActual("../db");
  return {
    ...actual,
    db: {
      ...actual.db,
      // Mock 数据库操作
    },
  };
});
```

### 7.4 测试用例设计

#### 7.4.1 单元测试示例

```typescript
// src/algorithm/__tests__/weightCalculator.test.ts
import { describe, it, expect } from "vitest";
import { calculateWeight } from "../weightCalculator";
import { WordProgress, Word } from "../../db";

describe("calculateWeight", () => {
  it("应该为新单词分配高权重", () => {
    const progress: WordProgress = {
      wordId: 1,
      timesSeen: 0,
      nextReviewAt: new Date().toISOString(),
    };
    const word: Word = { id: 1, kana: "test", meaning: "测试" };

    const weight = calculateWeight(progress, word, "flashcard");
    expect(weight).toBeGreaterThan(100);
  });

  it("应该为到期单词分配高权重", () => {
    const progress: WordProgress = {
      wordId: 1,
      timesSeen: 5,
      nextReviewAt: new Date(Date.now() - 1000).toISOString(), // 已过期
    };
    const word: Word = { id: 1, kana: "test", meaning: "测试" };

    const weight = calculateWeight(progress, word, "flashcard");
    expect(weight).toBeGreaterThan(50);
  });
});
```

#### 7.4.2 集成测试示例

```typescript
// src/store/__tests__/wordStore.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useWordStore } from "../wordStore";
import { db } from "../../db";

describe("WordStore Integration", () => {
  beforeEach(async () => {
    // 清理数据库
    await db.wordSets.clear();
    await db.words.clear();
  });

  it("应该能够创建单词集并加载", async () => {
    const store = useWordStore.getState();

    // 创建单词集
    const wordSetId = await store.createWordSet({
      name: "测试单词集",
    });

    expect(wordSetId).toBeGreaterThan(0);

    // 加载单词集
    await store.loadWordSets();
    expect(store.wordSets.length).toBeGreaterThan(0);
  });
});
```

#### 7.4.3 E2E 测试示例

```typescript
// cypress/e2e/study.cy.ts
describe("学习流程 E2E 测试", () => {
  beforeEach(() => {
    // 设置测试数据
    cy.visit("/");
  });

  it("应该能够完成完整的闪卡学习流程", () => {
    // 1. 选择单词集
    cy.get('[data-testid="word-set-card"]').first().click();

    // 2. 开始学习
    cy.get('[data-testid="start-flashcard"]').click();

    // 3. 答题
    cy.get('[data-testid="flashcard-card"]').should("be.visible");
    cy.get('[data-testid="show-answer"]').click();
    cy.get('[data-testid="answer-correct"]').click();

    // 4. 验证进度更新
    cy.get('[data-testid="progress-indicator"]').should("contain", "1/");
  });
});
```

### 7.5 CI/CD 配置

#### 7.5.1 GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        run: npm run test:e2e
```

### 7.6 实施步骤

1. **完善 Vitest 配置**（2 小时）

   - 配置测试环境
   - 设置 Mock 工具
   - 配置代码覆盖率

2. **编写单元测试**（12 小时）

   - 算法模块测试（权重计算、调度算法）
   - 工具函数测试（错误处理、数据验证）
   - Store 测试（状态管理）

3. **编写集成测试**（6 小时）

   - Store + Service 集成测试
   - 数据库操作集成测试
   - 组件 + Store 集成测试

4. **配置 E2E 测试**（4 小时）

   - 设置 Cypress/Playwright
   - 编写关键用户流程测试
   - 配置测试数据

5. **配置 CI/CD**（2 小时）
   - 设置 GitHub Actions
   - 配置自动化测试
   - 配置代码覆盖率报告

---

## 📅 八、实施计划

### 8.1 优先级排序

根据任务优先级和依赖关系，建议按以下顺序实施：

**第一阶段：性能优化（P0，1 周）**

- 数据库查询优化（调度算法批量查询）
- wordProgress 索引优化
- 到期计划查询优化

**第二阶段：状态管理（P1，1 周）**

- Zustand Store 架构搭建
- Word Store 迁移
- Review Store 迁移

**第三阶段：错误处理（P1，1 周）**

- 增强 Error Handler
- 集成 Sentry
- 实现错误监控 Dashboard

**第四阶段：性能优化扩展（P1，1 周）**

- 查询缓存实现
- Web Worker 优化
- 渲染优化

**第五阶段：测试与质量（P1，2 周）**

- 完善单元测试
- 编写集成测试
- 配置 E2E 测试
- 配置 CI/CD

**第六阶段：数据迁移优化（P2，1 周）**

- 迁移管理器实现
- 数据完整性校验
- 迁移回滚机制

### 8.2 时间估算

| 任务               | 优先级 | 预计工时    | 实施者              |
| ------------------ | ------ | ----------- | ------------------- |
| 数据库查询优化     | P0     | 4 小时      | 编程专家            |
| 状态管理架构优化   | P1     | 16 小时     | 编程专家            |
| 错误处理与监控体系 | P1     | 12 小时     | 编程专家            |
| 性能优化架构设计   | P1     | 20 小时     | 编程专家            |
| 测试架构设计       | P1     | 24 小时     | 测试专家 + 编程专家 |
| 数据迁移优化       | P2     | 8 小时      | 编程专家            |
| **总计**           | -      | **84 小时** | -                   |

**预计完成时间**：6-8 周（按每周 10-15 小时计算）

### 8.3 团队协作

**高级架构师**：

- 设计架构方案（已完成）
- 审查代码实现
- 指导技术选型

**编程专家**：

- 实现所有代码
- 编写单元测试
- 性能优化

**测试专家**：

- 设计测试用例
- 编写集成测试和 E2E 测试
- 配置 CI/CD

**数据库设计专家**：

- 审查数据库优化方案
- 验证数据迁移逻辑
- 数据完整性校验

---

## ⚠️ 九、风险评估与缓解策略

### 9.1 技术风险

#### 风险 1：状态管理迁移导致功能回归

**风险等级**：中

**影响**：

- 迁移过程中可能引入 Bug
- 用户体验受影响

**缓解策略**：

- 分阶段迁移，保持向后兼容
- 充分测试，确保功能正常
- 保留旧代码作为备份

#### 风险 2：性能优化效果不明显

**风险等级**：低

**影响**：

- 投入时间但收益有限

**缓解策略**：

- 先进行性能基准测试
- 优先优化已确认的瓶颈
- 持续监控性能指标

#### 风险 3：测试覆盖率难以达到 80%

**风险等级**：中

**影响**：

- 代码质量无法保证

**缓解策略**：

- 分阶段提升覆盖率
- 优先测试核心功能
- 使用工具自动生成测试用例

### 9.2 业务风险

#### 风险 1：架构优化影响用户体验

**风险等级**：低

**影响**：

- 用户在使用过程中遇到问题

**缓解策略**：

- 在开发环境充分测试
- 灰度发布，逐步推广
- 提供回滚机制

#### 风险 2：数据迁移失败导致数据丢失

**风险等级**：高

**影响**：

- 用户数据丢失，严重影响用户体验

**缓解策略**：

- 实现数据备份机制
- 迁移前自动备份
- 实现迁移回滚功能
- 充分测试迁移逻辑

### 9.3 时间风险

#### 风险 1：任务时间估算不准确

**风险等级**：中

**影响**：

- 项目延期

**缓解策略**：

- 使用敏捷开发，分阶段交付
- 定期评估进度
- 调整优先级，确保核心功能优先

---

## 📊 十、成功指标

### 10.1 性能指标

- **数据库查询时间**：< 50ms（1000 个单词）
- **调度算法执行时间**：< 100ms（100 个单词）
- **页面加载时间**：< 2s（首次加载）
- **交互响应时间**：< 100ms

### 10.2 质量指标

- **测试覆盖率**：> 80%
- **代码质量**：ESLint 0 错误，0 警告
- **错误率**：< 0.1%（生产环境）
- **用户反馈**：满意度 > 4.5/5

### 10.3 可维护性指标

- **代码重复率**：< 5%
- **函数复杂度**：< 10（圈复杂度）
- **文件大小**：< 500 行（单个文件）
- **文档完整性**：> 90%

---

## ✅ 十一、总结

### 11.1 架构设计要点

1. **状态管理**：使用 Zustand 实现轻量级全局状态管理
2. **错误处理**：建立完整的错误处理、日志记录和监控体系
3. **性能优化**：数据库查询优化、Web Worker、缓存策略
4. **数据迁移**：模块化迁移逻辑、回滚机制、数据完整性校验
5. **测试体系**：单元测试、集成测试、E2E 测试、CI/CD

### 11.2 实施建议

1. **分阶段实施**：按优先级分阶段实施，确保核心功能优先
2. **充分测试**：每个阶段都要充分测试，确保功能正常
3. **持续监控**：实施后持续监控性能和质量指标
4. **文档更新**：及时更新技术文档和用户文档

### 11.3 后续优化方向

1. **微前端架构**：如果项目规模继续扩大，考虑微前端架构
2. **服务端渲染**：如果需要 SEO 优化，考虑 SSR
3. **实时同步**：如果需要多设备同步，考虑服务端 API
4. **AI 推荐**：基于学习数据，提供个性化推荐

---

**文档完成时间**：2024-12-19  
**下一步行动**：与团队讨论架构方案，开始实施第一阶段（性能优化）
