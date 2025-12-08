/**
 * 闪卡模式切换组件
 * 用于切换卡片正面显示模式（单词/意思）
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../../main";
import { ThemeTokens } from "../../utils/themeTokens";

interface FlashcardModeToggleProps {
  cardFrontMode: "writing" | "meaning";
  onModeChange: (mode: "writing" | "meaning") => void;
  themeTokens: ThemeTokens;
  isDark: boolean;
  isPortrait: boolean;
}

/**
 * FlashcardModeToggle 组件
 * 切换卡片正面显示模式
 */
export default function FlashcardModeToggle({
  cardFrontMode,
  onModeChange,
  themeTokens,
  isDark,
  isPortrait,
}: FlashcardModeToggleProps) {
  const { t } = useTranslation();

  const containerStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: isPortrait ? "30%" : "12%",
    aspectRatio: isPortrait ? "3/1.2" : "3/1",
    borderRadius: isPortrait ? "7vw" : "3vw",
    background: themeTokens.glassBackground,
    border: themeTokens.glassBorder,
    boxShadow: themeTokens.glassShadow,
    backdropFilter: "blur(22px) saturate(135%)",
    WebkitBackdropFilter: "blur(22px) saturate(135%)",
    backgroundClip: "padding-box",
    transition:
      "background 0.35s ease, border 0.35s ease, box-shadow 0.35s ease",
    overflow: "hidden",
  };

  const highlightStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: cardFrontMode === "writing" ? 0 : "50%",
    width: "50%",
    height: "100%",
    borderRadius: isPortrait ? "7vw" : "3vw",
    background: themeTokens.glassHighlightBackground,
    boxShadow: themeTokens.glassHighlightShadow,
    zIndex: 0,
    transition: "transform 0.52s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  const buttonStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    flex: 1,
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: isPortrait ? "3vw" : "1vw",
    fontWeight: "600",
    color: isDark ? "#fff" : "#333",
    transition: "color 0.2s ease",
  };

  return (
    <div style={containerStyle}>
      <div style={highlightStyle} />
      <button
        style={buttonStyle}
        onClick={() => onModeChange("writing")}
        aria-label={t("word") || "单词"}
        aria-pressed={cardFrontMode === "writing"}
      >
        {t("word")}
      </button>
      <button
        style={buttonStyle}
        onClick={() => onModeChange("meaning")}
        aria-label={t("meaning") || "意思"}
        aria-pressed={cardFrontMode === "meaning"}
      >
        {t("meaning")}
      </button>
    </div>
  );
}

