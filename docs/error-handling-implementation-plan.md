# 错误处理与监控体系实施方案

**设计日期**：2024-12-19  
**设计者**：高级架构师  
**任务 ID**：A2  
**优先级**：P1  
**预计工时**：12 小时（设计 4 小时 + 实施 8 小时）

---

## 📋 一、实施摘要

基于架构设计文档（`docs/architecture-design.md`）中的错误处理与监控体系设计，本文档提供详细的实施方案，包括：

1. **错误处理增强**：扩展 `errorHandler.ts`，集成 Sentry
2. **本地日志系统**：实现 `logger.ts`，支持错误日志存储
3. **Sentry 集成**：实现 `sentry.ts`，支持生产环境错误监控
4. **错误监控 Dashboard**：实现 `ErrorMonitor.tsx`，支持开发环境错误查看

---

## 🛠️ 二、详细实施步骤

### 2.1 阶段 1：增强 Error Handler（2 小时）

#### 2.1.1 扩展 AppError 类

**文件**：`src/utils/errorHandler.ts`

**修改内容**：

```typescript
// 扩展错误类型枚举
export enum ErrorCategory {
  DATABASE = "database",
  NETWORK = "network",
  VALIDATION = "validation",
  PERMISSION = "permission",
  UNKNOWN = "unknown",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// 扩展 AppError 类
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

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}
```

#### 2.1.2 增强 handleError 函数

**修改内容**：

```typescript
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

### 2.2 阶段 2：实现本地日志系统（2 小时）

#### 2.2.1 创建 logger.ts

**文件**：`src/utils/logger.ts`（新建）

**实现内容**：

```typescript
import { ErrorLog } from "./errorHandler";

const MAX_LOGS = 100;
const STORAGE_KEY = "langger_error_logs";

export async function logErrorLocally(errorLog: ErrorLog): Promise<void> {
  try {
    const logs = getStoredLogs();
    logs.unshift(errorLog);

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

export function getErrorStatistics(logs: ErrorLog[]): {
  total: number;
  critical: number;
  high: number;
  last24Hours: number;
} {
  const now = Date.now();
  const last24Hours = logs.filter((log) => {
    const logTime = new Date(log.timestamp).getTime();
    return now - logTime < 24 * 60 * 60 * 1000;
  }).length;

  return {
    total: logs.length,
    critical: logs.filter((l) => l.severity === "critical").length,
    high: logs.filter((l) => l.severity === "high").length,
    last24Hours,
  };
}
```

### 2.3 阶段 3：集成 Sentry（2 小时）

#### 2.3.1 安装依赖

```bash
npm install @sentry/react
```

#### 2.3.2 创建 sentry.ts

**文件**：`src/utils/sentry.ts`（新建）

**实现内容**：

```typescript
import * as Sentry from "@sentry/react";
import { ErrorLog } from "./errorHandler";

export function initSentry(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn("Sentry DSN not configured");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
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

#### 2.3.3 在 main.tsx 中初始化

**文件**：`src/main.tsx`

**修改内容**：

```typescript
import { initSentry } from "./utils/sentry";

// 初始化 Sentry（生产环境）
initSentry();

// 设置全局错误处理器
window.addEventListener("error", (event) => {
  handleError(event.error, { type: "unhandled_error" });
});

window.addEventListener("unhandledrejection", (event) => {
  handleError(event.reason, { type: "unhandled_promise_rejection" });
});
```

### 2.4 阶段 4：实现错误监控 Dashboard（2 小时）

#### 2.4.1 创建 ErrorMonitor 组件

**文件**：`src/components/ErrorMonitor.tsx`（新建）

**实现内容**：

```typescript
import { useState, useEffect } from "react";
import {
  getStoredLogs,
  clearStoredLogs,
  getErrorStatistics,
} from "../utils/logger";
import { ErrorLog } from "../utils/errorHandler";

export function ErrorMonitor() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState(getErrorStatistics([]));

  useEffect(() => {
    const loadLogs = () => {
      const storedLogs = getStoredLogs();
      setLogs(storedLogs);
      setStats(getErrorStatistics(storedLogs));
    };

    loadLogs();
    // 每 5 秒刷新一次
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    clearStoredLogs();
    setLogs([]);
    setStats(getErrorStatistics([]));
  };

  if (process.env.NODE_ENV !== "development") {
    return null; // 只在开发环境显示
  }

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>错误监控 Dashboard</h2>
      <div style={{ marginBottom: "20px" }}>
        <div>总错误数: {stats.total}</div>
        <div>严重错误: {stats.critical}</div>
        <div>高级错误: {stats.high}</div>
        <div>最近 24 小时: {stats.last24Hours}</div>
        <button onClick={handleClear}>清除日志</button>
      </div>
      <div>
        <h3>错误列表</h3>
        {logs.map((log, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              padding: "10px",
              border: "1px solid #ccc",
            }}
          >
            <div>
              <strong>时间:</strong> {log.timestamp}
            </div>
            <div>
              <strong>消息:</strong> {log.error.message}
            </div>
            <div>
              <strong>严重程度:</strong> {log.severity}
            </div>
            <div>
              <strong>类别:</strong> {log.category}
            </div>
            {log.error.stack && (
              <details>
                <summary>堆栈跟踪</summary>
                <pre>{log.error.stack}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📝 三、环境变量配置

### 3.1 .env 文件

创建 `.env.production` 文件：

```env
VITE_SENTRY_DSN=your_sentry_dsn_here
```

### 3.2 说明

- 开发环境：不使用 Sentry，只使用本地日志
- 生产环境：使用 Sentry 和本地日志

---

## 🧪 四、测试策略

### 4.1 单元测试

```typescript
// src/utils/__tests__/logger.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  logErrorLocally,
  getStoredLogs,
  clearStoredLogs,
  getErrorStatistics,
} from "../logger";
import { ErrorLog } from "../errorHandler";

describe("Logger", () => {
  beforeEach(() => {
    clearStoredLogs();
  });

  it("应该能够记录错误日志", async () => {
    const errorLog: ErrorLog = {
      id: "1",
      timestamp: new Date().toISOString(),
      error: { message: "Test error" },
      severity: "medium",
      category: "unknown",
    };

    await logErrorLocally(errorLog);
    const logs = getStoredLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].error.message).toBe("Test error");
  });

  it("应该限制日志数量", async () => {
    // 创建 150 条日志
    for (let i = 0; i < 150; i++) {
      await logErrorLocally({
        id: `${i}`,
        timestamp: new Date().toISOString(),
        error: { message: `Error ${i}` },
        severity: "low",
        category: "unknown",
      });
    }

    const logs = getStoredLogs();
    expect(logs).toHaveLength(100); // 最多 100 条
  });
});
```

### 4.2 集成测试

测试错误处理流程：

1. 触发错误
2. 验证错误被记录到本地日志
3. 验证错误被上报到 Sentry（生产环境）
4. 验证用户提示显示

---

## ✅ 五、验收标准

1. ✅ `errorHandler.ts` 增强完成，支持错误分类和严重程度
2. ✅ `logger.ts` 实现完成，支持本地日志存储和查询
3. ✅ `sentry.ts` 实现完成，支持生产环境错误上报
4. ✅ `ErrorMonitor.tsx` 实现完成，支持开发环境错误查看
5. ✅ 全局错误处理器配置完成
6. ✅ 所有测试通过

---

**实施完成时间**：预计 2024-12-22  
**下一步行动**：编程专家开始实施
