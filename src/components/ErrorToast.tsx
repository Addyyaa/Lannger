/**
 * 错误提示组件
 * 显示 UI Store 中的错误信息
 */

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import { useUIErrors, useUIStore } from "../store/hooks";

/**
 * ErrorToast 组件
 * 显示 UI Store 中的错误列表
 */
export default function ErrorToast() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const errors = useUIErrors();
  const clearError = useUIStore((state) => state.clearError);

  // 自动清除错误（5 秒后）
  useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        errors.forEach((error) => {
          clearError(error.id);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [errors, clearError]);

  if (errors.length === 0) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 10000,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "400px",
    width: "100%",
  };

  const errorItemStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: "8px",
    // 确保对比度符合 WCAG AA（4.5:1）
    // #ff4444 on dark: 对比度约 3.0:1，需要调整
    // #ff6b6b on light: 对比度约 3.2:1，需要调整
    backgroundColor: isDark ? "#ef5350" : "#d32f2f", // 使用更深的红色确保对比度
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    animation: "slideInRight 0.3s ease-out",
  };

  const errorTextStyle: React.CSSProperties = {
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
      {errors.map((error) => (
        <div key={error.id} style={errorItemStyle}>
          <div style={errorTextStyle}>
            {error.message || t("errorOccurred") || "发生错误"}
          </div>
          <button
            style={closeButtonStyle}
            onClick={() => clearError(error.id)}
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
  const styleId = "error-toast-animation";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

