/**
 * 统一的加载指示器组件
 * 支持不同尺寸、主题和自定义消息
 */

import React from "react";
import { useTheme } from "../main";
import { useTranslation } from "react-i18next";

export interface LoadingIndicatorProps {
  /** 加载消息，如果为空则不显示文字 */
  message?: string;
  /** 尺寸：small, medium, large */
  size?: "small" | "medium" | "large";
  /** 是否使用全屏遮罩 */
  fullScreen?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
}

/**
 * LoadingIndicator 组件
 */
export default function LoadingIndicator({
  message,
  size = "medium",
  fullScreen = false,
  style,
  className,
}: LoadingIndicatorProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // 根据尺寸计算 Spinner 大小
  const getSpinnerSize = () => {
    switch (size) {
      case "small":
        return "20px";
      case "medium":
        return "40px";
      case "large":
        return "60px";
      default:
        return "40px";
    }
  };

  // 根据尺寸计算字体大小
  const getFontSize = () => {
    switch (size) {
      case "small":
        return "0.875rem";
      case "medium":
        return "1rem";
      case "large":
        return "1.25rem";
      default:
        return "1rem";
    }
  };

  const spinnerSize = getSpinnerSize();
  const fontSize = getFontSize();

  // Spinner 样式
  const spinnerStyle: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `3px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
    borderTop: `3px solid ${isDark ? "#00b4ff" : "#007aff"}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto",
  };

  // 容器样式
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: fullScreen ? "2rem" : "1rem",
    ...(fullScreen && {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark
        ? "rgba(0, 0, 0, 0.7)"
        : "rgba(255, 255, 255, 0.9)",
      zIndex: 9999,
      backdropFilter: "blur(4px)",
    }),
    ...style,
  };

  // 文字样式
  const textStyle: React.CSSProperties = {
    fontSize,
    color: isDark ? "#ccc" : "#666",
    textAlign: "center",
    margin: 0,
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={spinnerStyle} />
      {message && <p style={textStyle}>{message}</p>}
      {!message && (
        <p style={textStyle}>{t("loading") || "加载中..."}</p>
      )}
    </div>
  );
}

// 添加 CSS 动画（如果还没有）
if (typeof document !== "undefined") {
  const styleId = "loading-indicator-spin-animation";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

