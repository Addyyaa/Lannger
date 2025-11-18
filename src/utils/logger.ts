/**
 * 本地日志系统
 *
 * 用于在本地存储错误日志，支持开发环境错误查看和调试
 */

import { ErrorLog } from "./errorHandler";

const MAX_LOGS = 100;
const STORAGE_KEY = "langger_error_logs";

/**
 * 记录错误到本地存储
 *
 * @param errorLog 错误日志对象
 */
export async function logErrorLocally(errorLog: ErrorLog): Promise<void> {
  try {
    const logs = getStoredLogs();

    // 确保 errorLog 有 id
    if (!errorLog.id) {
      errorLog.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    logs.unshift(errorLog);

    // 限制日志数量
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS);
    }

    // 存储到 localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    }
  } catch (error) {
    console.error("Failed to log error locally:", error);
  }
}

/**
 * 获取存储的错误日志
 *
 * @returns 错误日志数组
 */
export function getStoredLogs(): ErrorLog[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * 清除存储的错误日志
 */
export function clearStoredLogs(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to clear stored logs:", error);
  }
}

/**
 * 获取错误统计信息
 *
 * @param logs 错误日志数组（可选，如果不提供则从存储中读取）
 * @returns 错误统计信息
 */
export function getErrorStatistics(logs?: ErrorLog[]): {
  total: number;
  critical: number;
  high: number;
  last24Hours: number;
} {
  const errorLogs = logs || getStoredLogs();
  const now = Date.now();
  const last24Hours = errorLogs.filter((log) => {
    const logTime = new Date(log.timestamp).getTime();
    return now - logTime < 24 * 60 * 60 * 1000;
  }).length;

  return {
    total: errorLogs.length,
    critical: errorLogs.filter((l) => l.severity === "critical").length,
    high: errorLogs.filter((l) => l.severity === "high").length,
    last24Hours,
  };
}
