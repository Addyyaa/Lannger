/**
 * 闪卡卡片组件
 * 显示单词卡片的正面和背面
 */

import React from "react";
import { Word } from "../../db";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../../main";
import { ThemeTokens } from "../../utils/themeTokens";

interface FlashcardCardProps {
  word: Word;
  showAnswer: boolean;
  cardFrontMode: "writing" | "meaning";
  themeTokens: ThemeTokens;
  isDark: boolean;
  isPortrait: boolean;
}

/**
 * FlashcardCard 组件
 * 显示闪卡的正反面内容
 */
export default function FlashcardCard({
  word,
  showAnswer,
  cardFrontMode,
  themeTokens,
  isDark,
  isPortrait,
}: FlashcardCardProps) {
  const { t } = useTranslation();

  const hasMark = Boolean(word.mark);
  const hasExample = Boolean(word.example);
  const frontDisplayText = cardFrontMode === "meaning"
    ? (word.meaning ? word.meaning.trim() : "") || t("meaning")
    : (word.kanji ? word.kanji.trim() : "") ||
      (word.kana ? word.kana.trim() : "") ||
      t("word");
  const frontDisplayStyle: React.CSSProperties = cardFrontMode === "meaning"
    ? {
        fontSize: isPortrait ? "calc(3vw + 3vh)" : "calc(1.5vw + 1.5vh)",
        fontWeight: "600",
        color: isDark ? "#fff" : "#333",
        textAlign: "center",
        padding: isPortrait ? "0 5vw" : "0 3vw",
        lineHeight: "1.6",
        wordBreak: "break-word",
      }
    : {
        fontSize: isPortrait ? "calc(4vw + 4vh)" : "calc(2vw + 2vh)",
        fontWeight: "700",
        color: isDark ? "#fff" : "#333",
        textAlign: "center",
        padding: isPortrait ? "0 5vw" : "0 3vw",
        lineHeight: "1.4",
        wordBreak: "break-word",
      };

  // 3D卡片容器
  const card3DContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
    transform: showAnswer ? "rotateY(180deg)" : "rotateY(0deg)",
    overflow: "visible",
  };

  // 卡片正面和背面的共同样式
  const cardFaceBaseStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    background: themeTokens.cardSurface,
    borderRadius: isPortrait ? "3.5vw" : "1.4vw",
    border: isPortrait
      ? `0.3vw solid ${themeTokens.cardBorderColor}`
      : `0.12vw solid ${themeTokens.cardBorderColor}`,
    boxShadow: isPortrait
      ? themeTokens.cardShadowPortrait
      : themeTokens.cardShadowLandscape,
  };

  const cardFaceStyle: React.CSSProperties = {
    ...cardFaceBaseStyle,
    display: "flex",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "default",
    transform: "rotateY(0deg)",
  };

  const cardBackStyle: React.CSSProperties = {
    ...cardFaceBaseStyle,
    display: "flex",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    cursor: "default",
    transform: "rotateY(180deg)",
    overflowY: "auto",
    overflowX: "hidden",
    padding: isPortrait ? "5vw" : "2vw",
    boxSizing: "border-box",
  };

  const showOptionalContent = !cardFrontMode && (hasExample || hasMark);
  const fixedContentContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: showOptionalContent
      ? isPortrait
        ? "auto"
        : "70%"
      : "auto",
    width: "100%",
    flexShrink: 0,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: isPortrait ? "1vh" : "0.5vh",
    boxSizing: "border-box",
    marginTop: isPortrait ? "12%" : "0",
  };

  const exampleContainerStyle: React.CSSProperties = {
    width: "100%",
    flex: isPortrait ? "1 1 auto" : "0 0 0.73",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    overflowY: "auto",
    overflowX: "hidden",
    minHeight: 0,
    padding: isPortrait ? "0vh 0" : "0.5vh 0",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  };

  const exampleContentStyle: React.CSSProperties = {
    fontSize: isPortrait ? "calc(2.5vw + 2.5vh)" : "calc(1.2vw + 1.2vh)",
    color: isDark ? "#aaa" : "#777",
    textAlign: "center",
    lineHeight: "1.8",
    padding: isPortrait ? "0 4vw" : "0 2vw",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: isPortrait ? "calc(2vw + 2vh)" : "calc(0.9vw + 0.9vh)",
    color: isDark ? "#999" : "#666",
    fontWeight: "600",
    marginBottom: isPortrait ? "1.5vw" : "0.5vw",
    textAlign: "center",
  };

  const fixedContentItemStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    flexShrink: 0,
    minHeight: "fit-content",
    padding: isPortrait ? "0 0" : "0.75vh 0",
  };

  return (
    <div style={card3DContainerStyle}>
      {/* 卡片正面 */}
      <div style={cardFaceStyle}>
        <div style={frontDisplayStyle}>{frontDisplayText}</div>
      </div>

      {/* 卡片背面（答案面） */}
      <div style={cardBackStyle} className="flashcard-back-container">
        <div style={fixedContentContainerStyle}>
          {cardFrontMode === "writing" && (
            <div style={fixedContentItemStyle}>
              <div style={labelStyle}>{t("meaning")}</div>
              <div
                style={{
                  fontSize: isPortrait
                    ? "calc(3vw + 3vh)"
                    : "calc(1.5vw + 1.5vh)",
                  fontWeight: "600",
                  color: isDark ? "#fff" : "#333",
                  textAlign: "center",
                  padding: isPortrait ? "0 5vw" : "0 3vw",
                  lineHeight: "1.6",
                  wordBreak: "break-word",
                }}
              >
                {word.meaning}
              </div>
            </div>
          )}

          {cardFrontMode === "meaning" && (
            <div style={fixedContentItemStyle}>
              <div style={labelStyle}>{t("word")}</div>
              <div
                style={{
                  fontSize: isPortrait
                    ? "calc(4vw + 4vh)"
                    : "calc(2vw + 2vh)",
                  fontWeight: "700",
                  color: isDark ? "#fff" : "#333",
                  textAlign: "center",
                  padding: isPortrait ? "0 5vw" : "0 3vw",
                  lineHeight: "1.4",
                  wordBreak: "break-word",
                }}
              >
                {word.kanji || word.kana || t("word")}
              </div>
            </div>
          )}

          {showOptionalContent && (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: isPortrait ? "2vh" : "1vh",
                marginTop: isPortrait ? "2vh" : "1vh",
              }}
            >
              {word.example && (
                <div style={fixedContentItemStyle}>
                  <div style={{ ...labelStyle, margin: 0 }}>{t("example")}</div>
                  <div style={exampleContainerStyle} className="example-scroll-container">
                    <div style={exampleContentStyle}>{word.example}</div>
                  </div>
                </div>
              )}

              {word.mark && (
                <div style={fixedContentItemStyle}>
                  <div style={labelStyle}>{t("mark")}</div>
                  <div
                    style={{
                      fontSize: isPortrait
                        ? "calc(2vw + 2vh)"
                        : "calc(1vw + 1vh)",
                      color: isDark ? "#aaa" : "#777",
                      marginTop: isPortrait ? 0 : "0.5vh",
                      lineHeight: "1.5",
                      textAlign: "center",
                      padding: isPortrait ? "0 3vw" : "0 2vw",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {word.mark}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

