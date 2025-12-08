/**
 * 学习进度显示组件
 * 显示当前学习进度和统计信息
 */

import React from "react";
import { useTheme, useOrientation } from "../main";
import { useTranslation } from "react-i18next";

export interface StudyProgressProps {
  /** 当前索引（从 0 开始） */
  currentIndex: number;
  /** 总数量 */
  total: number;
  /** 已学习数量 */
  studiedCount?: number;
  /** 正确数量 */
  correctCount?: number;
  /** 错误数量 */
  wrongCount?: number;
  /** 是否显示详细统计 */
  showStats?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * StudyProgress 组件
 */
export default function StudyProgress({
  currentIndex,
  total,
  studiedCount,
  correctCount,
  wrongCount,
  showStats = false,
  style,
}: StudyProgressProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  const containerStyle: React.CSSProperties = {
    padding: isPortrait ? "3vw" : "1vw",
    marginBottom: isPortrait ? "2vw" : "1vw",
    ...style,
  };

  const progressBarContainerStyle: React.CSSProperties = {
    width: "100%",
    height: isPortrait ? "1.5vw" : "0.5vw",
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    borderRadius: isPortrait ? "1vw" : "0.25vw",
    overflow: "hidden",
    marginBottom: showStats ? (isPortrait ? "2vw" : "0.5vw") : 0,
  };

  const progressBarStyle: React.CSSProperties = {
    height: "100%",
    width: `${progress}%`,
    background: isDark
      ? "linear-gradient(90deg, #00b4ff 0%, #007aff 100%)"
      : "linear-gradient(90deg, #00b4ff 0%, #007aff 100%)",
    transition: "width 0.3s ease",
    borderRadius: isPortrait ? "1vw" : "0.25vw",
  };

  const textStyle: React.CSSProperties = {
    fontSize: isPortrait ? "3.5vw" : "1vw",
    color: isDark ? "#ccc" : "#666",
    textAlign: "center",
    marginBottom: showStats ? (isPortrait ? "1.5vw" : "0.5vw") : 0,
  };

  const statsContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-around",
    gap: isPortrait ? "2vw" : "1vw",
    fontSize: isPortrait ? "3vw" : "0.9vw",
    color: isDark ? "#aaa" : "#777",
  };

  return (
    <div style={containerStyle}>
      <div style={textStyle}>
        {currentIndex + 1} / {total}
      </div>
      <div style={progressBarContainerStyle}>
        <div style={progressBarStyle} />
      </div>
      {showStats && (studiedCount !== undefined || correctCount !== undefined || wrongCount !== undefined) && (
        <div style={statsContainerStyle}>
          {studiedCount !== undefined && (
            <span>
              {t("studied") || "已学习"}: {studiedCount}
            </span>
          )}
          {correctCount !== undefined && (
            <span style={{ color: isDark ? "#4caf50" : "#2e7d32" }}>
              {t("correct") || "正确"}: {correctCount}
            </span>
          )}
          {wrongCount !== undefined && (
            <span style={{ color: isDark ? "#f44336" : "#c62828" }}>
              {t("wrong") || "错误"}: {wrongCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

