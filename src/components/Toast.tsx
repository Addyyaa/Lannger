/**
 * Toast 通知组件
 * 显示 UI Store 中的 Toast 通知
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import { useUIToasts, useUIStore } from "../store/hooks";

/**
 * Toast 组件
 */
export default function Toast() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const toasts = useUIToasts();
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 10000,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "400px",
    width: "100%",
  };

  const getToastStyle = (type?: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: "12px 16px",
      borderRadius: "8px",
      color: "#fff",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      animation: "slideInUp 0.3s ease-out",
      minWidth: "200px",
    };

    switch (type) {
      case "success":
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#4caf50" : "#2e7d32",
        };
      case "error":
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#f44336" : "#c62828",
        };
      case "warning":
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#ff9800" : "#f57c00",
        };
      case "info":
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#2196f3" : "#1565c0",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#666" : "#424242",
        };
    }
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    fontSize: "14px",
    lineHeight: 1.5,
    wordBreak: "break-word",
  };

  const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "18px",
    padding: "0",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "background-color 0.2s",
  };

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => (
        <div key={toast.id} style={getToastStyle(toast.type)}>
          <div style={textStyle}>{toast.message}</div>
          <button
            style={closeButtonStyle}
            onClick={() => removeToast(toast.id)}
            aria-label={t("close") || "关闭"}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// 添加 CSS 动画（如果还没有）
if (typeof document !== "undefined") {
  const styleId = "toast-animation";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes slideInUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

