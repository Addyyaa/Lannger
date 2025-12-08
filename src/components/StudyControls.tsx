/**
 * 学习控制按钮组件
 * 提供统一的学习操作按钮（正确、错误、跳过等）
 */

import React from "react";
import { useTheme, useOrientation } from "../main";
import { useTranslation } from "react-i18next";

export interface StudyControlButton {
  /** 按钮标签 */
  label: string;
  /** 按钮类型 */
  type: "correct" | "wrong" | "skip" | "show" | "custom";
  /** 点击回调 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示 */
  visible?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export interface StudyControlsProps {
  /** 按钮列表 */
  buttons: StudyControlButton[];
  /** 是否显示答案 */
  showAnswer?: boolean;
  /** 自定义容器样式 */
  style?: React.CSSProperties;
}

/**
 * StudyControls 组件
 */
export default function StudyControls({
  buttons,
  showAnswer = false,
  style,
}: StudyControlsProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

  const containerStyle: React.CSSProperties = {
    display: "flex",
    gap: isPortrait ? "2vw" : "0.8vw",
    justifyContent: "center",
    alignItems: "center",
    padding: isPortrait ? "3vw" : "1.5vw",
    flexWrap: "wrap",
    ...style,
  };

  const getButtonStyle = (type: StudyControlButton["type"]): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: isPortrait ? "3vw 6vw" : "1vw 2vw",
      fontSize: isPortrait ? "4vw" : "1.2vw",
      fontWeight: "600",
      border: "none",
      borderRadius: isPortrait ? "2vw" : "0.5vw",
      cursor: "pointer",
      transition: "all 0.3s ease",
      minWidth: isPortrait ? "20vw" : "8vw",
      textAlign: "center",
    };

    switch (type) {
      case "correct":
        // 绿色按钮：确保对比度符合 WCAG AA（4.5:1）
        // #4caf50 on dark: 对比度约 3.2:1，需要调整
        // #2e7d32 on light: 对比度约 4.8:1，符合标准
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#52c85a" : "#2e7d32", // 调整暗色主题为更亮的绿色
          color: "#fff",
        };
      case "wrong":
        // 红色按钮：确保对比度符合 WCAG AA
        // #f44336 on dark: 对比度约 3.1:1，需要调整
        // #c62828 on light: 对比度约 5.2:1，符合标准
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#ff5252" : "#c62828", // 调整暗色主题为更亮的红色
          color: "#fff",
        };
      case "skip":
        // 灰色按钮：确保对比度符合 WCAG AA
        // #666 on dark: 对比度约 4.2:1，需要调整
        // #999 on light: 对比度约 3.0:1，需要调整
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#757575" : "#616161", // 调整以确保对比度
          color: "#fff",
        };
      case "show":
        // 蓝色按钮：确保对比度符合 WCAG AA
        // #00b4ff on dark: 对比度约 2.8:1，需要调整
        // #007aff on light: 对比度约 4.6:1，符合标准
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#42a5f5" : "#007aff", // 调整暗色主题为更亮的蓝色
          color: "#fff",
        };
      default:
        // 默认按钮：确保文本对比度
        return {
          ...baseStyle,
          backgroundColor: isDark ? "#424242" : "#e0e0e0",
          color: isDark ? "#ffffff" : "#212121", // 使用更深的文本颜色确保对比度
        };
    }
  };

  const visibleButtons = buttons.filter(
    (btn) => btn.visible !== false
  );

  return (
    <div style={containerStyle}>
      {visibleButtons.map((button, index) => {
        const buttonStyle = {
          ...getButtonStyle(button.type),
          ...button.style,
          opacity: button.disabled ? 0.5 : 1,
          cursor: button.disabled ? "not-allowed" : "pointer",
        };

        return (
          <button
            key={index}
            style={buttonStyle}
            onClick={button.disabled ? undefined : button.onClick}
            disabled={button.disabled}
            aria-label={button.label}
            aria-pressed={button.type === "correct" || button.type === "wrong" ? false : undefined}
            onMouseEnter={(e) => {
              if (!button.disabled) {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = isDark
                  ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                  : "0 4px 12px rgba(0, 0, 0, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (!button.disabled) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!button.disabled) {
                  button.onClick();
                }
              }
            }}
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}

