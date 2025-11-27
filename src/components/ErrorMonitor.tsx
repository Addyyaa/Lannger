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
import { useTheme, useOrientation } from "../main";
import {
  isErrorMonitorVisible,
  setErrorMonitorVisible,
} from "../utils/errorMonitorToggle";

export function ErrorMonitor() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
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

  // 需要可见状态才显示（支持开发环境和正式环境）
  if (!visible) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: isPortrait ? "2vw" : "1.5vh",
    right: isPortrait ? "2vw" : "1.5vw",
    left: isPortrait ? "2vw" : "auto", // 竖屏时左右都有边距，确保居中
    width: isPortrait ? "calc(100vw - 4vw)" : "min(40vw, 500px)", // 竖屏时减去左右边距
    maxWidth: isPortrait ? "calc(100vw - 4vw)" : "500px",
    maxHeight: isPortrait ? "75vh" : "85vh",
    minHeight: isPortrait ? "50vh" : "350px",
    background: isDark ? "rgba(28, 28, 30, 0.98)" : "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: `1px solid ${
      isDark ? "rgba(118, 118, 128, 0.4)" : "rgba(141, 153, 174, 0.3)"
    }`,
    borderRadius: isPortrait ? "2.5vw" : "0.8vw",
    padding: isPortrait ? "4vw 3vw" : "1.5vw",
    fontFamily: "monospace",
    fontSize: isPortrait ? "3.2vw" : "clamp(0.75vw, 0.75rem, 1vw)",
    boxShadow: isDark
      ? isPortrait
        ? "0 1.5vw 4vw rgba(0, 0, 0, 0.6)"
        : "0 0.3vw 1vw rgba(0, 0, 0, 0.5)"
      : isPortrait
      ? "0 1.5vw 4vw rgba(0, 0, 0, 0.2)"
      : "0 0.3vw 1vw rgba(0, 0, 0, 0.15)",
    zIndex: 10000,
    overflowY: "auto",
    overflowX: "hidden",
    color: isDark ? "#fff" : "#333",
    boxSizing: "border-box",
    // 添加滚动条样式优化
    scrollbarWidth: "thin",
    scrollbarColor: isDark
      ? "rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1)",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isPortrait ? "3vw" : "1.2vh",
    paddingBottom: isPortrait ? "2vw" : "0.8vh",
    borderBottom: `1px solid ${
      isDark ? "rgba(118, 118, 128, 0.35)" : "rgba(141, 153, 174, 0.25)"
    }`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "4vw" : "clamp(1vw, 1rem, 1.4vw)",
    fontWeight: "bold",
    color: isDark ? "#fff" : "#333",
    lineHeight: 1.2,
  };

  const buttonStyle: React.CSSProperties = {
    padding: isPortrait ? "2.5vw 5vw" : "0.6vh 1.5vw",
    fontSize: isPortrait ? "3.2vw" : "clamp(0.75vw, 0.75rem, 1vw)",
    background: isDark ? "rgba(255, 59, 48, 0.2)" : "rgba(255, 59, 48, 0.1)",
    color: isDark ? "#ff3b30" : "#d70015",
    border: `1px solid ${
      isDark ? "rgba(255, 59, 48, 0.3)" : "rgba(255, 59, 48, 0.2)"
    }`,
    borderRadius: isPortrait ? "1.5vw" : "0.4vw",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginLeft: isPortrait ? "2vw" : "0.8vw",
    minHeight: isPortrait ? "9vw" : "3.2vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };

  const closeButtonStyle: React.CSSProperties = {
    padding: isPortrait ? "2.5vw" : "0.6vh 1vw",
    fontSize: isPortrait ? "5.5vw" : "clamp(1.2vw, 1.2rem, 1.6vw)",
    background: "transparent",
    color: isDark ? "#fff" : "#333",
    border: "none",
    borderRadius: isPortrait ? "1.5vw" : "0.4vw",
    cursor: "pointer",
    transition: "all 0.2s ease",
    lineHeight: "1",
    fontWeight: "bold",
    minWidth: isPortrait ? "9vw" : "3.2vh",
    minHeight: isPortrait ? "9vw" : "3.2vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const statItemStyle: React.CSSProperties = {
    marginBottom: isPortrait ? "2vw" : "0.8vh",
    fontSize: isPortrait ? "3.2vw" : "clamp(0.8vw, 0.8rem, 1.1vw)",
  };

  const logItemStyle: React.CSSProperties = {
    marginBottom: isPortrait ? "3vw" : "1.2vh",
    padding: isPortrait ? "3vw" : "1.2vh",
    background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
    borderRadius: isPortrait ? "1.5vw" : "0.4vw",
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
    <div data-test-id="error-monitor-div-test-14" style={containerStyle}>
      <div data-test-id="error-monitor-div-test-13" style={headerStyle}>
        <h2 data-test-id="error-monitor-h2-test" style={titleStyle}>
          {t("errorMonitorTitle") || "错误监控 Dashboard"}
        </h2>
        <div
          data-test-id="error-monitor-div-test-12"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isPortrait ? "2vw" : "0.5vw",
          }}
        >
          <button
            data-test-id="error-monitor-button-test-1"
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
            data-test-id="error-monitor-button-test"
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

      <div
        data-test-id="error-monitor-div-test-11"
        style={{ marginBottom: isPortrait ? "4vw" : "1.6vh" }}
      >
        <div data-test-id="error-monitor-div-test-10" style={statItemStyle}>
          <strong data-test-id="error-monitor-strong-test-7">
            {t("totalErrors") || "总错误数"}:
          </strong>{" "}
          {stats.total}
        </div>
        <div data-test-id="error-monitor-div-test-9" style={statItemStyle}>
          <strong data-test-id="error-monitor-strong-test-6">
            {t("criticalErrors") || "严重错误"}:
          </strong>{" "}
          <span
            data-test-id="error-monitor-span-test-2"
            style={{ color: severityColor("critical") }}
          >
            {stats.critical}
          </span>
        </div>
        <div data-test-id="error-monitor-div-test-8" style={statItemStyle}>
          <strong data-test-id="error-monitor-strong-test-5">
            {t("highErrors") || "高级错误"}:
          </strong>{" "}
          <span
            data-test-id="error-monitor-span-test-1"
            style={{ color: severityColor("high") }}
          >
            {stats.high}
          </span>
        </div>
        <div data-test-id="error-monitor-div-test-7" style={statItemStyle}>
          <strong data-test-id="error-monitor-strong-test-4">
            {t("last24Hours") || "最近 24 小时"}:
          </strong>{" "}
          {stats.last24Hours}
        </div>
      </div>

      <div data-test-id="error-monitor-div-test-6">
        <h3
          data-test-id="error-monitor-h3-test"
          style={{
            fontSize: isPortrait ? "3.8vw" : "clamp(0.9vw, 0.9rem, 1.2vw)",
            marginBottom: isPortrait ? "2vw" : "0.8vh",
          }}
        >
          {t("errorList") || "错误列表"}
        </h3>
        {logs.length === 0 ? (
          <div
            data-test-id="error-monitor-div-test-5"
            style={{
              color: isDark ? "#8e8e93" : "#666",
              fontSize: isPortrait ? "3.2vw" : "clamp(0.8vw, 0.8rem, 1.1vw)",
            }}
          >
            {t("noErrorLogs") || "暂无错误日志"}
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              data-test-id="error-monitor-div-test-4"
              key={log.id || index}
              style={logItemStyle}
            >
              <div
                data-test-id="error-monitor-div-test-3"
                style={{
                  marginBottom: isPortrait ? "1.5vw" : "0.4vh",
                  fontSize: isPortrait ? "3vw" : "clamp(0.75vw, 0.75rem, 1vw)",
                }}
              >
                <strong data-test-id="error-monitor-strong-test-3">
                  {t("time") || "时间"}:
                </strong>{" "}
                {new Date(log.timestamp).toLocaleString()}
              </div>
              <div
                data-test-id="error-monitor-div-test-2"
                style={{
                  marginBottom: isPortrait ? "1.5vw" : "0.4vh",
                  fontSize: isPortrait ? "3vw" : "clamp(0.75vw, 0.75rem, 1vw)",
                }}
              >
                <strong data-test-id="error-monitor-strong-test-2">
                  {t("message") || "消息"}:
                </strong>{" "}
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
              <div
                data-test-id="error-monitor-div-test-1"
                style={{
                  marginBottom: isPortrait ? "1.5vw" : "0.4vh",
                  fontSize: isPortrait ? "3vw" : "clamp(0.75vw, 0.75rem, 1vw)",
                }}
              >
                <strong data-test-id="error-monitor-strong-test-1">
                  {t("severity") || "严重程度"}:
                </strong>{" "}
                <span
                  data-test-id="error-monitor-span-test"
                  style={{ color: severityColor(log.severity) }}
                >
                  {log.severity}
                </span>
              </div>
              <div
                data-test-id="error-monitor-div-test"
                style={{
                  marginBottom: isPortrait ? "1.5vw" : "0.4vh",
                  fontSize: isPortrait ? "3vw" : "clamp(0.75vw, 0.75rem, 1vw)",
                }}
              >
                <strong data-test-id="error-monitor-strong-test">
                  {t("category") || "类别"}:
                </strong>{" "}
                {log.category}
              </div>
              {log.error instanceof Error && log.error.stack && (
                <details data-test-id="error-monitor-details-test">
                  <summary
                    data-test-id="error-monitor-summary-test"
                    style={{
                      cursor: "pointer",
                      color: isDark ? "#8e8e93" : "#666",
                      marginTop: isPortrait ? "1.5vw" : "0.4vh",
                      fontSize: isPortrait
                        ? "2.8vw"
                        : "clamp(0.7vw, 0.7rem, 0.95vw)",
                    }}
                  >
                    {t("stackTrace") || "堆栈跟踪"}
                  </summary>
                  <pre
                    data-test-id="error-monitor-pre-test"
                    style={{
                      marginTop: isPortrait ? "1.5vw" : "0.4vh",
                      padding: isPortrait ? "2vw" : "0.5vh",
                      background: isDark
                        ? "rgba(0, 0, 0, 0.3)"
                        : "rgba(0, 0, 0, 0.05)",
                      borderRadius: isPortrait ? "1.5vw" : "0.4vw",
                      fontSize: isPortrait
                        ? "2.5vw"
                        : "clamp(0.65vw, 0.65rem, 0.9vw)",
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
