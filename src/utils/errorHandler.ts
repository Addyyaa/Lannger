/**
 * 统一错误处理工具
 * 提供全局错误处理机制，包括错误分类、日志记录和用户提示
 */

/**
 * 应用错误类
 * 扩展标准 Error，添加错误代码、用户友好的错误消息、严重程度和分类
 */
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

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * 错误类型枚举（兼容旧代码，保留）
 */
export enum ErrorType {
  DATABASE = "DATABASE_ERROR",
  NETWORK = "NETWORK_ERROR",
  VALIDATION = "VALIDATION_ERROR",
  PERMISSION = "PERMISSION_ERROR",
  UNKNOWN = "UNKNOWN_ERROR",
}

/**
 * 错误分类（新增，用于更细粒度的错误分类）
 */
export enum ErrorCategory {
  DATABASE = "database",
  NETWORK = "network",
  VALIDATION = "validation",
  PERMISSION = "permission",
  UNKNOWN = "unknown",
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
  id?: string; // 用于本地存储的唯一ID
  error: Error | AppError;
  type: ErrorType;
  severity: ErrorSeverity;
  category: ErrorCategory;
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
 * 判断错误分类
 */
function getErrorCategory(error: unknown): ErrorCategory {
  if (error instanceof AppError) {
    return error.category;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("database") || message.includes("indexeddb")) {
      return ErrorCategory.DATABASE;
    }
    if (message.includes("network") || message.includes("fetch")) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes("permission") || message.includes("unauthorized")) {
      return ErrorCategory.PERMISSION;
    }
  }

  return ErrorCategory.UNKNOWN;
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
 * 创建错误日志对象
 */
export function createErrorLog(
  error: unknown,
  context?: Record<string, unknown>
): ErrorLog {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const type = getErrorType(error);
  const category = getErrorCategory(error);
  const severity = getErrorSeverity(error, type);

  const errorLog: ErrorLog = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    error: errorObj,
    type,
    severity,
    category,
    context: {
      ...context,
      ...(error instanceof AppError ? error.context : {}),
    },
    timestamp: new Date().toISOString(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  return errorLog;
}

/**
 * 记录错误日志（内存中，用于向后兼容）
 */
function logError(error: unknown, context?: Record<string, unknown>): ErrorLog {
  const errorLog = createErrorLog(error, context);

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
 * 显示用户通知（占位函数，后续可集成 Toast 组件）
 */
function showUserNotification(errorLog: ErrorLog): void {
  const userMessage = getUserFriendlyMessage(errorLog.error);

  if (typeof window === "undefined") {
    return;
  }

  // 使用简单的 console.error，后续可以替换为更友好的 Toast 组件
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

/**
 * 更新错误统计（占位函数，后续可扩展）
 */
function updateErrorStatistics(_errorLog: ErrorLog): void {
  // 可以在这里实现错误统计逻辑
  // 例如：记录错误频率、错误趋势等
}

/**
 * 处理错误
 * 统一处理所有错误，包括日志记录和用户提示
 *
 * @param error 错误对象
 * @param context 错误上下文或处理选项（向后兼容：第三个参数可以是 boolean 或 options 对象）
 * @param optionsOrShowMessage 处理选项或是否显示用户消息（向后兼容）
 */
export async function handleError(
  error: unknown,
  context?:
    | Record<string, unknown>
    | {
        showUserMessage?: boolean;
        reportToSentry?: boolean;
        silent?: boolean;
      },
  optionsOrShowMessage?:
    | boolean
    | {
        showUserMessage?: boolean;
        reportToSentry?: boolean;
        silent?: boolean;
      }
): Promise<void> {
  // 处理向后兼容：支持旧调用方式 handleError(error, context, showUserMessage)
  let actualContext: Record<string, unknown> | undefined;
  let options: {
    showUserMessage?: boolean;
    reportToSentry?: boolean;
    silent?: boolean;
  } = {};

  if (
    typeof context === "boolean" ||
    (context &&
      !("showUserMessage" in context) &&
      !("silent" in context) &&
      !("reportToSentry" in context))
  ) {
    // 旧调用方式：handleError(error, context, showUserMessage)
    actualContext = context as Record<string, unknown>;
    options = {
      showUserMessage: (optionsOrShowMessage as boolean) ?? true,
    };
  } else if (
    context &&
    ("showUserMessage" in context ||
      "silent" in context ||
      "reportToSentry" in context)
  ) {
    // 新调用方式：handleError(error, options)
    options = context as {
      showUserMessage?: boolean;
      reportToSentry?: boolean;
      silent?: boolean;
    };
    actualContext = undefined;
  } else {
    // 新调用方式：handleError(error, context, options)
    actualContext = context as Record<string, unknown>;
    options =
      (optionsOrShowMessage as {
        showUserMessage?: boolean;
        reportToSentry?: boolean;
        silent?: boolean;
      }) || {};
  }

  const errorLog = createErrorLog(error, actualContext);

  // 记录到本地日志
  if (!options.silent) {
    // 动态导入 logger，避免循环依赖
    const { logErrorLocally } = await import("./logger");
    await logErrorLocally(errorLog);
  }

  // 上报到 Sentry（生产环境）
  if (
    options.reportToSentry !== false &&
    process.env.NODE_ENV === "production"
  ) {
    // 动态导入 sentry，避免循环依赖
    const { reportToSentry } = await import("./sentry");
    reportToSentry(errorLog);
  }

  // 显示用户提示
  if (options.showUserMessage !== false) {
    showUserNotification(errorLog);
  }

  // 更新错误统计
  updateErrorStatistics(errorLog);

  // 向后兼容：同时记录到内存中
  logError(error, actualContext);
}

/**
 * 处理错误（同步版本，向后兼容）
 * 用于在非异步上下文中调用，内部会异步处理但不阻塞
 *
 * @param error 错误对象
 * @param context 错误上下文
 * @param showUserMessage 是否显示用户消息（可选，默认 true）
 */
export function handleErrorSync(
  error: unknown,
  context?: Record<string, unknown>,
  showUserMessage: boolean = true
): void {
  // 调用异步版本，但不等待结果（fire and forget）
  handleError(error, context, { showUserMessage }).catch((err) => {
    console.error("handleError 内部错误:", err);
  });
}

// 为了向后兼容，导出 handleError 的同步别名
// 注意：这会在内部异步处理，但不阻塞调用者
export const handleErrorSyncAlias = handleErrorSync;

/**
 * 创建应用错误
 *
 * @param message 错误消息
 * @param code 错误代码
 * @param options 错误选项（用户消息、上下文、严重程度、分类）
 */
export function createAppError(
  message: string,
  code: string,
  options?: {
    userMessage?: string;
    context?: Record<string, unknown>;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
  }
): AppError {
  return new AppError(message, code, options);
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
