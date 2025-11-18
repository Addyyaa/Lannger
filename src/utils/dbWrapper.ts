/**
 * 数据库操作包装工具
 * 提供安全的数据库操作包装，自动处理错误和重试
 */

import {
  handleError,
  createAppError,
  ErrorType,
  ErrorSeverity,
  ErrorCategory,
} from "./errorHandler";

/**
 * 数据库操作选项
 */
export interface DbOperationOptions {
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 失败时的默认返回值 */
  fallback?: unknown;
  /** 是否静默处理错误（不显示用户提示） */
  silent?: boolean;
  /** 操作上下文（用于错误日志） */
  context?: Record<string, unknown>;
}

/**
 * 安全执行数据库操作
 * 自动处理错误、重试和日志记录
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  options: DbOperationOptions = {}
): Promise<T> {
  const {
    retries = 0,
    retryDelay = 1000,
    fallback,
    silent = false,
    context = {},
  } = options;

  let lastError: unknown;
  let attempts = 0;

  while (attempts <= retries) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      attempts++;

      // 如果是最后一次尝试，处理错误
      if (attempts > retries) {
        // 异步处理错误，不阻塞
        handleError(
          error,
          {
            ...context,
            operation: "safeDbOperation",
            attempts,
            retries,
          },
          { showUserMessage: !silent }
        ).catch((err) => {
          console.error("handleError failed:", err);
        });

        // 如果有默认值，返回默认值
        if (fallback !== undefined) {
          return fallback as T;
        }

        // 抛出应用错误
        throw createAppError(
          error instanceof Error ? error.message : String(error),
          ErrorType.DATABASE,
          {
            userMessage: "数据库操作失败，请重试",
            context: {
              ...context,
              originalError: error,
              attempts,
            },
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.DATABASE,
          }
        );
      }

      // 等待后重试
      if (retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 理论上不会到达这里，但 TypeScript 需要
  throw lastError;
}

/**
 * 批量安全执行数据库操作
 * 执行多个操作，即使部分失败也继续执行
 */
export async function safeBatchDbOperation<T>(
  operations: Array<() => Promise<T>>,
  options: DbOperationOptions = {}
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const results = await Promise.allSettled(
    operations.map((op) => safeDbOperation(op, { ...options, silent: true }))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return { success: true, result: result.value };
    } else {
      const error =
        result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason));

      // 异步处理错误，不阻塞
      handleError(
        error,
        {
          ...options.context,
          operation: "safeBatchDbOperation",
          operationIndex: index,
        },
        { showUserMessage: !options.silent }
      ).catch((err) => {
        console.error("handleError failed:", err);
      });

      return { success: false, error };
    }
  });
}

/**
 * 事务包装器
 * 安全执行数据库事务操作
 */
export async function safeTransaction<T>(
  transactionFn: () => Promise<T>,
  options: DbOperationOptions = {}
): Promise<T> {
  return safeDbOperation(
    async () => {
      // 这里可以添加事务开始/提交/回滚逻辑
      // 目前 IndexedDB 的事务由 Dexie 自动管理
      return await transactionFn();
    },
    {
      ...options,
      context: {
        ...options.context,
        operationType: "transaction",
      },
    }
  );
}
