/**
 * 学习模式卡片组件
 * 显示三种学习模式（闪卡、测试、复习）的入口卡片
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { StudyMode } from "../db";

interface StudyModeCardProps {
  mode: StudyMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: "recommended" | "newWords" | "reviewDue" | null;
  stats?: string;
  onClick: () => void;
  isDark: boolean;
  isPortrait: boolean;
  color: string; // 卡片主题色
}

export default function StudyModeCard({
  title,
  description,
  icon,
  badge,
  stats,
  onClick,
  isDark,
  isPortrait,
  color,
}: StudyModeCardProps) {
  const { t } = useTranslation();

  const cardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, rgba(28, 28, 30, 0.96) 0%, rgba(44, 44, 46, 0.92) 100%)"
      : "linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(243, 246, 255, 0.92) 100%)",
    borderRadius: isPortrait ? "3vw" : "1.2vw",
    padding: isPortrait ? "4vw" : "1.5vw",
    border: isPortrait
      ? `0.3vw solid ${
          isDark ? "rgba(118, 118, 128, 0.35)" : "rgba(141, 153, 174, 0.25)"
        }`
      : `0.12vw solid ${
          isDark ? "rgba(118, 118, 128, 0.35)" : "rgba(141, 153, 174, 0.25)"
        }`,
    boxShadow: isPortrait
      ? "0 4vw 8vw rgba(0, 0, 0, 0.15)"
      : "0 1.5vw 3vw rgba(15, 23, 42, 0.12)",
    display: "flex",
    flexDirection: "column",
    gap: isPortrait ? "2.5vw" : "1vw",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
    overflow: "hidden",
  };

  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    top: isPortrait ? "2vw" : "0.8vw",
    right: isPortrait ? "2vw" : "0.8vw",
    padding: isPortrait ? "1vw 2vw" : "0.4vw 0.8vw",
    borderRadius: isPortrait ? "2vw" : "0.8vw",
    fontSize: isPortrait ? "2.5vw" : "0.75vw",
    fontWeight: 600,
    color: "#fff",
    background: color,
    zIndex: 10,
  };

  const getBadgeText = (): string => {
    switch (badge) {
      case "recommended":
        return t("recommended");
      case "newWords":
        return t("newWords");
      case "reviewDue":
        return t("reviewDue");
      default:
        return "";
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-0.5vh)";
        e.currentTarget.style.boxShadow = isPortrait
          ? "0 6vw 12vw rgba(0, 0, 0, 0.2)"
          : "0 2vw 4vw rgba(15, 23, 42, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isPortrait
          ? "0 4vw 8vw rgba(0, 0, 0, 0.15)"
          : "0 1.5vw 3vw rgba(15, 23, 42, 0.12)";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(-0.5vh)";
      }}
    >
      {badge && <div style={badgeStyle}>{getBadgeText()}</div>}

      {/* 图标 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: isPortrait ? "12vw" : "4vw",
          height: isPortrait ? "12vw" : "4vw",
          borderRadius: "50%",
          background: `${color}20`,
          color: color,
          marginBottom: isPortrait ? "1vw" : "0.5vw",
        }}
      >
        {icon}
      </div>

      {/* 标题 */}
      <div
        style={{
          fontSize: isPortrait ? "4.5vw" : "1.4vw",
          fontWeight: 700,
          color: isDark ? "#fff" : "#333",
        }}
      >
        {title}
      </div>

      {/* 描述 */}
      <div
        style={{
          fontSize: isPortrait ? "3vw" : "1vw",
          color: isDark ? "#999" : "#666",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>

      {/* 统计信息 */}
      {stats && (
        <div
          style={{
            fontSize: isPortrait ? "2.5vw" : "0.85vw",
            color: isDark ? "#999" : "#666",
            marginTop: "auto",
            paddingTop: isPortrait ? "2vw" : "0.8vw",
            borderTop: `1px solid ${
              isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
            }`,
          }}
        >
          {stats}
        </div>
      )}
    </div>
  );
}
