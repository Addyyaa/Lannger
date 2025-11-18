/**
 * 错误监控 Dashboard 组件
 *
 * 用于开发环境查看错误日志和统计信息
 * 只在开发环境显示
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getStoredLogs,
  clearStoredLogs,
  getErrorStatistics,
} from "../utils/logger";
import { ErrorLog } from "../utils/errorHandler";
import { useTheme } from "../main";
import {
  isErrorMonitorVisible,
  setErrorMonitorVisible,
} from "../utils/errorMonitorToggle";

export function ErrorMonitor() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState(getErrorStatistics([]));
  const [visible, setVisible] = useState(false);

  // 检查是否应该显示
  useEffect(() => {
    const checkVisibility = () => {
      setVisible(isErrorMonitorVisible());
    };
    checkVisibility();
    // 监听 localStorage 变化
    const interval = setInterval(checkVisibility, 500);
    return () => clearInterval(interval);
  }, []);

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

  const handleClose = () => {
    setErrorMonitorVisible(false);
    setVisible(false);
  };

  // 只在开发环境显示，且需要可见状态
  if (process.env.NODE_ENV !== "development" || !visible) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "400px",
    maxHeight: "600px",
    background: isDark ? "rgba(28, 28, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
    border: `1px solid ${
      isDark ? "rgba(118, 118, 128, 0.35)" : "rgba(141, 153, 174, 0.25)"
    }`,
    borderRadius: "8px",
    padding: "16px",
    fontFamily: "monospace",
    fontSize: "12px",
    boxShadow: isDark
      ? "0 4px 12px rgba(0, 0, 0, 0.5)"
      : "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 10000,
    overflowY: "auto",
    color: isDark ? "#fff" : "#333",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: `1px solid ${
      isDark ? "rgba(118, 118, 128, 0.35)" : "rgba(141, 153, 174, 0.25)"
    }`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: "bold",
    color: isDark ? "#fff" : "#333",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "4px 12px",
    fontSize: "12px",
    background: isDark ? "rgba(255, 59, 48, 0.2)" : "rgba(255, 59, 48, 0.1)",
    color: isDark ? "#ff3b30" : "#d70015",
    border: `1px solid ${
      isDark ? "rgba(255, 59, 48, 0.3)" : "rgba(255, 59, 48, 0.2)"
    }`,
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginLeft: "8px",
  };

  const closeButtonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "16px",
    background: "transparent",
    color: isDark ? "#fff" : "#333",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    lineHeight: "1",
    fontWeight: "bold",
  };

  const statItemStyle: React.CSSProperties = {
    marginBottom: "8px",
    fontSize: "12px",
  };

  const logItemStyle: React.CSSProperties = {
    marginBottom: "12px",
    padding: "8px",
    background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
    borderRadius: "4px",
    border: `1px solid ${
      isDark ? "rgba(118, 118, 128, 0.2)" : "rgba(141, 153, 174, 0.15)"
    }`,
  };

  const severityColor = (severity: string): string => {
    switch (severity) {
      case "critical":
        return "#ff3b30";
      case "high":
        return "#ff9500";
      case "medium":
        return "#ffcc00";
      case "low":
        return "#34c759";
      default:
        return isDark ? "#fff" : "#333";
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          {t("errorMonitorTitle") || "错误监控 Dashboard"}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={handleClear}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark
                ? "rgba(255, 59, 48, 0.3)"
                : "rgba(255, 59, 48, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark
                ? "rgba(255, 59, 48, 0.2)"
                : "rgba(255, 59, 48, 0.1)";
            }}
          >
            {t("clearLogs") || "清除日志"}
          </button>
          <button
            onClick={handleClose}
            style={closeButtonStyle}
            title={t("close") || "关闭"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={statItemStyle}>
          <strong>{t("totalErrors") || "总错误数"}:</strong> {stats.total}
        </div>
        <div style={statItemStyle}>
          <strong>{t("criticalErrors") || "严重错误"}:</strong>{" "}
          <span style={{ color: severityColor("critical") }}>
            {stats.critical}
          </span>
        </div>
        <div style={statItemStyle}>
          <strong>{t("highErrors") || "高级错误"}:</strong>{" "}
          <span style={{ color: severityColor("high") }}>{stats.high}</span>
        </div>
        <div style={statItemStyle}>
          <strong>{t("last24Hours") || "最近 24 小时"}:</strong>{" "}
          {stats.last24Hours}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
          {t("errorList") || "错误列表"}
        </h3>
        {logs.length === 0 ? (
          <div style={{ color: isDark ? "#8e8e93" : "#666" }}>
            {t("noErrorLogs") || "暂无错误日志"}
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={log.id || index} style={logItemStyle}>
              <div style={{ marginBottom: "4px" }}>
                <strong>{t("time") || "时间"}:</strong>{" "}
                {new Date(log.timestamp).toLocaleString()}
              </div>
              <div style={{ marginBottom: "4px" }}>
                <strong>{t("message") || "消息"}:</strong>{" "}
                {(() => {
                  const error = log.error;
                  if (error instanceof Error) {
                    // 如果是 AppError，优先显示 userMessage
                    if (
                      "userMessage" in error &&
                      typeof (error as any).userMessage === "string"
                    ) {
                      return (error as any).userMessage;
                    }
                    return error.message || "未知错误";
                  }
                  // 如果是对象，尝试序列化
                  if (typeof error === "object" && error !== null) {
                    try {
                      // 尝试提取常见属性
                      if (
                        "message" in error &&
                        typeof (error as any).message === "string"
                      ) {
                        return (error as any).message;
                      }
                      if (
                        "error" in error &&
                        typeof (error as any).error === "string"
                      ) {
                        return (error as any).error;
                      }
                      // 如果对象有 toString 方法且不是默认的
                      const str = String(error);
                      if (str !== "[object Object]") {
                        return str;
                      }
                      // 最后尝试 JSON 序列化
                      return JSON.stringify(error, null, 2);
                    } catch {
                      return "无法序列化错误对象";
                    }
                  }
                  return String(error);
                })()}
              </div>
              <div style={{ marginBottom: "4px" }}>
                <strong>{t("severity") || "严重程度"}:</strong>{" "}
                <span style={{ color: severityColor(log.severity) }}>
                  {log.severity}
                </span>
              </div>
              <div style={{ marginBottom: "4px" }}>
                <strong>{t("category") || "类别"}:</strong> {log.category}
              </div>
              {log.error instanceof Error && log.error.stack && (
                <details>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: isDark ? "#8e8e93" : "#666",
                      marginTop: "4px",
                    }}
                  >
                    {t("stackTrace") || "堆栈跟踪"}
                  </summary>
                  <pre
                    style={{
                      marginTop: "4px",
                      padding: "4px",
                      background: isDark
                        ? "rgba(0, 0, 0, 0.3)"
                        : "rgba(0, 0, 0, 0.05)",
                      borderRadius: "4px",
                      fontSize: "10px",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {log.error.stack}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
