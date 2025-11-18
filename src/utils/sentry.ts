/**
 * Sentry 错误监控集成
 *
 * 用于生产环境错误上报和监控
 * 注意：需要配置 VITE_SENTRY_DSN 环境变量
 */

import { ErrorLog } from "./errorHandler";

// 动态导入 Sentry，避免在开发环境加载
// 注意：需要安装 @sentry/react 包才能使用
let Sentry: any = null;

/**
 * 初始化 Sentry
 * 只在生产环境初始化
 */
export async function initSentry(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  try {
    // 动态导入 Sentry（需要安装 @sentry/react 包）
    // 注意：这是可选依赖，如果未安装会静默失败
    // @ts-ignore - 可选依赖，可能未安装
    const sentryModule = await import("@sentry/react");
    Sentry = sentryModule;

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
      console.warn("Sentry DSN not configured");
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      beforeSend(event: any) {
        // 过滤敏感信息
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      },
    });

    console.log("Sentry initialized");
  } catch (error) {
    // Sentry 未安装或初始化失败，静默处理
    console.warn("Sentry not available (optional dependency):", error);
  }
}

/**
 * 上报错误到 Sentry
 *
 * @param errorLog 错误日志对象
 */
export function reportToSentry(errorLog: ErrorLog): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (!Sentry) {
    // 如果 Sentry 未初始化，尝试初始化
    initSentry().catch((err) => {
      console.warn("Failed to initialize Sentry for error reporting:", err);
    });
    return;
  }

  try {
    const error =
      errorLog.error instanceof Error
        ? errorLog.error
        : new Error(String(errorLog.error));

    Sentry.captureException(error, {
      tags: {
        code:
          errorLog.error instanceof Error && "code" in errorLog.error
            ? String(errorLog.error.code)
            : errorLog.type,
        category: errorLog.category,
        severity: errorLog.severity,
      },
      contexts: {
        custom: errorLog.context,
      },
      extra: {
        url: errorLog.url,
        userAgent: errorLog.userAgent,
        timestamp: errorLog.timestamp,
      },
    });
  } catch (error) {
    console.warn("Failed to report error to Sentry:", error);
  }
}
