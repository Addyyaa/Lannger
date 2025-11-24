/**
 * 复习提醒卡片组件
 * 显示到期复习的提醒信息
 */

import React from "react";
import { useTranslation } from "react-i18next";
import type { ReviewPlan } from "../db";

interface ReviewNotificationCardProps {
  reviewPlan: ReviewPlan;
  wordSetName: string;
  onClick: () => void;
  onDismiss?: () => void;
  isDark: boolean;
  isPortrait: boolean;
}

export default function ReviewNotificationCard({
  reviewPlan,
  wordSetName,
  onClick,
  onDismiss,
  isDark,
  isPortrait,
}: ReviewNotificationCardProps) {
  const { t } = useTranslation();

  const cardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.12) 100%)"
      : "linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.15) 100%)",
    borderRadius: isPortrait ? "3vw" : "1.2vw",
    padding: isPortrait ? "4vw" : "1.5vw",
    border: isPortrait
      ? `0.3vw solid ${
          isDark ? "rgba(255, 193, 7, 0.5)" : "rgba(255, 152, 0, 0.4)"
        }`
      : `0.12vw solid ${
          isDark ? "rgba(255, 193, 7, 0.5)" : "rgba(255, 152, 0, 0.4)"
        }`,
    boxShadow: isPortrait
      ? "0 4vw 8vw rgba(255, 152, 0, 0.2)"
      : "0 1.5vw 3vw rgba(255, 152, 0, 0.15)",
    display: "flex",
    flexDirection: "column",
    gap: isPortrait ? "2.5vw" : "1vw",
    width: "100%",
    maxWidth: isPortrait ? "90%" : "800px",
    position: "relative",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "4.5vw" : "1.4vw",
    fontWeight: 700,
    color: isDark ? "#fff" : "#333",
    display: "flex",
    alignItems: "center",
    gap: isPortrait ? "2vw" : "0.8vw",
  };

  const infoStyle: React.CSSProperties = {
    fontSize: isPortrait ? "3vw" : "1vw",
    color: isDark ? "#ccc" : "#666",
    lineHeight: 1.5,
  };

  const buttonStyle: React.CSSProperties = {
    padding: isPortrait ? "2.5vw 5vw" : "0.8vw 1.6vw",
    borderRadius: isPortrait ? "2vw" : "0.8vw",
    border: "none",
    background: isDark
      ? "linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)"
      : "linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)",
    color: "#fff",
    fontSize: isPortrait ? "3.5vw" : "1.1vw",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    alignSelf: "flex-start",
    marginTop: isPortrait ? "1vw" : "0.5vw",
  };

  const dismissButtonStyle: React.CSSProperties = {
    position: "absolute",
    top: isPortrait ? "2vw" : "0.8vw",
    right: isPortrait ? "2vw" : "0.8vw",
    width: isPortrait ? "6vw" : "2vw",
    height: isPortrait ? "6vw" : "2vw",
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: isDark ? "#999" : "#666",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: isPortrait ? "4vw" : "1.2vw",
  };

  return (
    <div style={cardStyle}>
      {onDismiss && (
        <button
          style={dismissButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label={t("dismiss")}
        >
          ×
        </button>
      )}

      <div style={titleStyle}>
        <span>📚</span>
        <span>{t("reviewReminder")}</span>
      </div>

      <div style={infoStyle}>
        <div>
          <strong>{wordSetName}</strong>
        </div>
        <div>
          {t("reviewStage")}: {reviewPlan.reviewStage}
        </div>
        {reviewPlan.totalWords > 0 && (
          <div>
            {t("wordsToReview")}: {reviewPlan.totalWords}
          </div>
        )}
      </div>

      <button
        style={buttonStyle}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 152, 0, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {t("startReview")}
      </button>
    </div>
  );
}
