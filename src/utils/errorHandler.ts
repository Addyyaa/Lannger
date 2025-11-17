/**
 * 统一错误处理工具
 * 提供全局错误处理机制，包括错误分类、日志记录和用户提示
 */

/**
 * 应用错误类
 * 扩展标准 Error，添加错误代码和用户友好的错误消息
 */
export class AppError extends Error {
  code: string;
  userMessage: string;
  context?: Record<string, unknown>;
  timestamp: string;

  constructor(
    message: string,
    code: string,
    userMessage?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage || message;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  DATABASE = "DATABASE_ERROR",
  NETWORK = "NETWORK_ERROR",
  VALIDATION = "VALIDATION_ERROR",
  PERMISSION = "PERMISSION_ERROR",
  UNKNOWN = "UNKNOWN_ERROR",
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * 错误日志接口
 */
export interface ErrorLog {
  error: Error | AppError;
  type: ErrorType;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

/**
 * 错误日志存储（内存中，生产环境可替换为持久化存储）
 */
const errorLogs: ErrorLog[] = [];
const MAX_LOG_SIZE = 100; // 最多保存 100 条错误日志

/**
 * 判断错误类型
 */
function getErrorType(error: unknown): ErrorType {
  if (error instanceof AppError) {
    return ErrorType[error.code as keyof typeof ErrorType] || ErrorType.UNKNOWN;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("database") || message.includes("indexeddb")) {
      return ErrorType.DATABASE;
    }
    if (message.includes("network") || message.includes("fetch")) {
      return ErrorType.NETWORK;
    }
    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorType.VALIDATION;
    }
    if (message.includes("permission") || message.includes("unauthorized")) {
      return ErrorType.PERMISSION;
    }
  }

  return ErrorType.UNKNOWN;
}

/**
 * 判断错误严重程度
 */
function getErrorSeverity(error: unknown, type: ErrorType): ErrorSeverity {
  if (error instanceof AppError && error.context?.severity) {
    return error.context.severity as ErrorSeverity;
  }

  switch (type) {
    case ErrorType.DATABASE:
      return ErrorSeverity.HIGH;
    case ErrorType.NETWORK:
      return ErrorSeverity.MEDIUM;
    case ErrorType.PERMISSION:
      return ErrorSeverity.HIGH;
    case ErrorType.VALIDATION:
      return ErrorSeverity.LOW;
    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * 记录错误日志
 */
function logError(error: unknown, context?: Record<string, unknown>): ErrorLog {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const type = getErrorType(error);
  const severity = getErrorSeverity(error, type);

  const errorLog: ErrorLog = {
    error: errorObj,
    type,
    severity,
    context: {
      ...context,
      ...(error instanceof AppError ? error.context : {}),
    },
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  // 添加到日志数组
  errorLogs.push(errorLog);

  // 限制日志大小
  if (errorLogs.length > MAX_LOG_SIZE) {
    errorLogs.shift();
  }

  // 控制台输出（开发环境）
  if (process.env.NODE_ENV === "development") {
    console.error("错误日志:", errorLog);
  }

  return errorLog;
}

/**
 * 获取用户友好的错误消息
 */
function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // 数据库错误
    if (message.includes("database") || message.includes("indexeddb")) {
      return "数据库操作失败，请刷新页面重试";
    }

    // 网络错误
    if (message.includes("network") || message.includes("fetch")) {
      return "网络连接失败，请检查网络设置";
    }

    // 验证错误
    if (message.includes("validation") || message.includes("invalid")) {
      return "数据格式不正确，请检查输入";
    }

    // 权限错误
    if (message.includes("permission") || message.includes("unauthorized")) {
      return "没有权限执行此操作";
    }

    // 默认错误消息
    return "操作失败，请重试";
  }

  return "发生未知错误，请刷新页面重试";
}

/**
 * 处理错误
 * 统一处理所有错误，包括日志记录和用户提示
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>,
  showUserMessage: boolean = true
): void {
  // 记录错误日志
  const errorLog = logError(error, context);

  // 获取用户友好的错误消息
  const userMessage = getUserFriendlyMessage(error);

  // 显示用户提示（可选）
  if (showUserMessage && typeof window !== "undefined") {
    // 使用简单的 alert，后续可以替换为更友好的 Toast 组件
    // 只在非开发环境或严重错误时显示
    if (
      process.env.NODE_ENV !== "development" ||
      errorLog.severity === ErrorSeverity.CRITICAL ||
      errorLog.severity === ErrorSeverity.HIGH
    ) {
      // 可以在这里集成 Toast 通知系统
      console.error("用户错误提示:", userMessage);
    }
  }

  // 上报错误（可选：集成 Sentry 或其他错误监控服务）
  // reportError(errorLog);
}

/**
 * 创建应用错误
 */
export function createAppError(
  message: string,
  code: string,
  userMessage?: string,
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, code, userMessage, context);
}

/**
 * 获取错误日志
 */
export function getErrorLogs(): ErrorLog[] {
  return [...errorLogs];
}

/**
 * 清空错误日志
 */
export function clearErrorLogs(): void {
  errorLogs.length = 0;
}

/**
 * 导出错误日志（用于调试）
 */
export function exportErrorLogs(): string {
  return JSON.stringify(errorLogs, null, 2);
}

