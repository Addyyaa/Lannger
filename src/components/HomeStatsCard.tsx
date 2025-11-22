/**
 * 首页统计卡片组件
 * 显示今日学习目标、连续学习天数、总学习单词数
 */

import React from "react";
import { useTranslation } from "react-i18next";

interface HomeStatsCardProps {
  dailyGoal: number;
  learnedToday: number;
  currentStreak: number;
  totalWords: number;
  masteredWords: number;
  isDark: boolean;
  isPortrait: boolean;
}

export default function HomeStatsCard({
  dailyGoal,
  learnedToday,
  currentStreak,
  totalWords,
  masteredWords,
  isDark,
  isPortrait,
}: HomeStatsCardProps) {
  const { t } = useTranslation();

  // 计算今日目标进度百分比
  const goalProgress = Math.min(
    100,
    Math.round((learnedToday / dailyGoal) * 100)
  );

  // 计算掌握度百分比
  const masteryProgress =
    totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  // 根据完成度确定颜色
  const getProgressColor = (progress: number): string => {
    if (progress < 50) return "#ff3b30"; // 红色
    if (progress < 80) return "#ff9500"; // 黄色
    return "#34c759"; // 绿色
  };

  const goalColor = getProgressColor(goalProgress);

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
    gap: isPortrait ? "3vw" : "1.2vw",
    width: "100%",
    maxWidth: isPortrait ? "90%" : "800px",
  };

  const statItemStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: isPortrait ? "1.5vw" : "0.6vw",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: isPortrait ? "3vw" : "0.9vw",
    color: isDark ? "#999" : "#666",
    fontWeight: 500,
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: isPortrait ? "5vw" : "1.8vw",
    fontWeight: 700,
    color: isDark ? "#fff" : "#333",
  };

  const progressBarContainerStyle: React.CSSProperties = {
    width: "100%",
    height: isPortrait ? "2vw" : "0.8vw",
    background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    borderRadius: isPortrait ? "1vw" : "0.4vw",
    overflow: "hidden",
    position: "relative",
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: "100%",
    width: `${goalProgress}%`,
    background: goalColor,
    borderRadius: isPortrait ? "1vw" : "0.4vw",
    transition: "width 0.5s ease",
    boxShadow: `0 0 ${isPortrait ? "1vw" : "0.4vw"} ${goalColor}40`,
  };

  return (
    <div style={cardStyle}>
      {/* 今日学习目标 */}
      <div style={statItemStyle}>
        <div style={statLabelStyle}>{t("todayLearningGoal")}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isPortrait ? "2vw" : "0.8vw",
          }}
        >
          <div style={statValueStyle}>
            {learnedToday} / {dailyGoal}
          </div>
          <div
            style={{
              fontSize: isPortrait ? "3.5vw" : "1.2vw",
              fontWeight: 600,
              color: goalColor,
            }}
          >
            {goalProgress}%
          </div>
        </div>
        <div style={progressBarContainerStyle}>
          <div style={progressBarFillStyle} />
        </div>
      </div>

      {/* 连续学习天数 */}
      <div style={statItemStyle}>
        <div style={statLabelStyle}>{t("currentStreak")}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isPortrait ? "2vw" : "0.8vw",
          }}
        >
          <div style={statValueStyle}>{currentStreak}</div>
          <div style={{ fontSize: isPortrait ? "4vw" : "1.5vw" }}>🔥</div>
        </div>
        {currentStreak > 0 && (
          <div
            style={{
              fontSize: isPortrait ? "2.5vw" : "0.8vw",
              color: isDark ? "#999" : "#666",
            }}
          >
            {t("keepGoing", { days: currentStreak })}
          </div>
        )}
      </div>

      {/* 总学习单词数 */}
      <div style={statItemStyle}>
        <div style={statLabelStyle}>{t("totalWordsLearned")}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isPortrait ? "1.5vw" : "0.6vw",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isPortrait ? "2vw" : "0.8vw",
            }}
          >
            <div style={statValueStyle}>{totalWords}</div>
            {totalWords > 0 && (
              <div
                style={{
                  fontSize: isPortrait ? "3vw" : "1vw",
                  color: isDark ? "#999" : "#666",
                }}
              >
                {t("word")}
              </div>
            )}
          </div>
          {/* 始终显示已掌握单词数，即使为 0 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isPortrait ? "2vw" : "0.8vw",
              paddingTop: isPortrait ? "1vw" : "0.4vw",
              borderTop: `1px solid ${
                isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
              }`,
            }}
          >
            <div
              style={{
                fontSize: isPortrait ? "4vw" : "1.5vw",
                fontWeight: 700,
                color: masteredWords > 0 ? "#34c759" : isDark ? "#999" : "#666", // 有已掌握单词时显示绿色，否则显示灰色
              }}
            >
              {masteredWords}
            </div>
            <div
              style={{
                fontSize: isPortrait ? "3vw" : "1vw",
                color: isDark ? "#999" : "#666",
              }}
            >
              {t("mastered")}
            </div>
            {totalWords > 0 && (
              <div
                style={{
                  fontSize: isPortrait ? "2.5vw" : "0.85vw",
                  color:
                    masteredWords > 0 ? "#34c759" : isDark ? "#999" : "#666",
                  fontWeight: 600,
                  marginLeft: "auto",
                }}
              >
                {masteryProgress}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
