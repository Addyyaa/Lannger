import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import { ReviewPlan } from "../db";
import { getDueReviewPlans } from "../store/reviewStore";
import { getWordSet } from "../store/wordStore";
import { getReviewStageDescription } from "../utils/ebbinghausCurve";
import { canStartReview } from "../utils/reviewLock";
import ComponentAsModel from "../utils/componentAsModel";
import { handleError } from "../utils/errorHandler";

interface ReviewNotificationProps {
  onStartReview: (wordSetId: number, reviewStage: number) => void;
  onDismiss?: () => void;
}

/**
 * 复习通知组件
 * 显示到期的复习计划通知
 */
export default function ReviewNotification({
  onStartReview,
  onDismiss,
}: ReviewNotificationProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  const [notifications, setNotifications] = useState<
    Array<ReviewPlan & { wordSetName: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  /**
   * 检查复习通知
   */
  const checkNotifications = async () => {
    try {
      setLoading(true);
      const duePlans = await getDueReviewPlans();

      // 检查当前是否有复习锁定
      const firstPlan = duePlans[0];
      let currentLockedWordSetId: number | null = null;
      if (firstPlan) {
        const canReview = await canStartReview(firstPlan.wordSetId);
        if (!canReview.allowed && canReview.lockInfo) {
          currentLockedWordSetId = canReview.lockInfo.wordSetId;
        }
      }

      // 获取每个计划的单词集名称和队列状态
      const notificationsWithNames = await Promise.all(
        duePlans.map(async (plan, index) => {
          const wordSet = await getWordSet(plan.wordSetId);
          const canReview = await canStartReview(plan.wordSetId);
          
          // 判断是否为当前需要复习的（第一个且未被锁定，或者被锁定的是这个）
          const isCurrent = index === 0 && (canReview.allowed || currentLockedWordSetId === plan.wordSetId);
          
          return {
            ...plan,
            wordSetName: wordSet?.name || `单词集 #${plan.wordSetId}`,
            isCurrent, // 是否为当前需要复习的
            isQueued: !isCurrent, // 是否为排队中的
            canStart: canReview.allowed, // 是否可以开始复习
          };
        })
      );

      setNotifications(notificationsWithNames);
    } catch (error) {
      handleError(error, { operation: "checkReviewNotifications" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初始检查
    checkNotifications();

    // 每分钟检查一次
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, []);

  // 如果没有通知，不显示
  if (loading || notifications.length === 0) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: isPortrait ? "10vw" : "2vw",
    right: isPortrait ? "5vw" : "2vw",
    zIndex: 10000,
    maxWidth: isPortrait ? "90%" : "400px",
    width: "100%",
  };

  const getNotificationStyle = (isCurrent: boolean, isQueued: boolean): React.CSSProperties => ({
    background: isCurrent
      ? isDark
        ? "linear-gradient(135deg, rgba(0, 180, 255, 0.15) 0%, rgba(0, 150, 212, 0.1) 100%)"
        : "linear-gradient(135deg, rgba(0, 180, 255, 0.1) 0%, rgba(0, 150, 212, 0.05) 100%)"
      : isDark
      ? "linear-gradient(135deg, rgba(44, 44, 46, 0.7) 0%, rgba(30, 30, 32, 0.7) 100%)"
      : "linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 249, 255, 0.7) 100%)",
    borderRadius: isPortrait ? "3vw" : "1vw",
    padding: isPortrait ? "4vw" : "1.5vw",
    marginBottom: isPortrait ? "3vw" : "1vw",
    boxShadow: isCurrent
      ? isDark
        ? "0 2vw 8vw rgba(0, 180, 255, 0.3)"
        : "0 1vw 4vw rgba(0, 180, 255, 0.2)"
      : isDark
      ? "0 2vw 8vw rgba(0, 0, 0, 0.3)"
      : "0 1vw 4vw rgba(0, 0, 0, 0.1)",
    border: isCurrent
      ? `${isPortrait ? "0.4vw" : "0.15vw"} solid #00b4ff`
      : isDark
      ? "0.3vw solid #444"
      : "0.1vw solid #e0e0e0",
    backdropFilter: "blur(10px)",
    opacity: isQueued ? 0.7 : 1,
  });

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "4vw" : "1.2vw",
    fontWeight: "bold",
    color: "#00b4ff",
    marginBottom: isPortrait ? "2vw" : "0.5vw",
  };

  const textStyle: React.CSSProperties = {
    fontSize: isPortrait ? "3.5vw" : "1vw",
    color: isDark ? "#ccc" : "#666",
    marginBottom: isPortrait ? "2vw" : "0.5vw",
    lineHeight: 1.5,
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: isPortrait ? "2vw" : "0.5vw",
    marginTop: isPortrait ? "3vw" : "1vw",
  };

  const buttonStyle: React.CSSProperties = {
    flex: 1,
    padding: isPortrait ? "2.5vw 4vw" : "0.75vw 1.5vw",
    fontSize: isPortrait ? "3.5vw" : "1vw",
    border: "none",
    borderRadius: isPortrait ? "2vw" : "0.5vw",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.3s ease",
  };

  return (
    <div style={containerStyle}>
      {notifications.map((notification) => {
        const isCurrent = notification.isCurrent || false;
        const isQueued = notification.isQueued || false;
        const canStart = notification.canStart || false;

        return (
          <div
            key={notification.id}
            style={getNotificationStyle(isCurrent, isQueued)}
          >
            <div style={titleStyle}>
              {isCurrent ? "🔔" : "⏳"}{" "}
              {isCurrent
                ? t("reviewNotification") || "复习提醒"
                : t("reviewQueued") || "排队中"}
            </div>
            <div style={textStyle}>
              <strong>{notification.wordSetName}</strong>
            </div>
            <div style={textStyle}>
              {getReviewStageDescription(notification.reviewStage)}
            </div>
            <div style={textStyle}>
              {t("reviewWordsCount") || "需要复习的单词"}:{" "}
              {notification.totalWords}
            </div>
            {isQueued && (
              <div
                style={{
                  ...textStyle,
                  fontSize: isPortrait ? "3vw" : "0.9vw",
                  color: isDark ? "#888" : "#999",
                  fontStyle: "italic",
                }}
              >
                {t("waitingForPreviousReview") || "等待前面的复习完成"}
              </div>
            )}
            <div style={buttonContainerStyle}>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: canStart ? "#00b4ff" : "#888",
                  color: "#fff",
                  cursor: canStart ? "pointer" : "not-allowed",
                }}
                disabled={!canStart}
                onClick={() => {
                  if (canStart) {
                    onStartReview(
                      notification.wordSetId,
                      notification.reviewStage
                    );
                    if (onDismiss) {
                      onDismiss();
                    }
                  }
                }}
                onMouseEnter={(e) => {
                  if (canStart) {
                    e.currentTarget.style.backgroundColor = "#0096d4";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (canStart) {
                    e.currentTarget.style.backgroundColor = "#00b4ff";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                {isCurrent
                  ? t("startReview") || "开始复习"
                  : t("inQueue") || "排队中"}
              </button>
              {isCurrent && (
                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: "transparent",
                    border: `1px solid ${isDark ? "#555" : "#e0e0e0"}`,
                    color: isDark ? "#fff" : "#333",
                  }}
                  onClick={() => {
                    if (onDismiss) {
                      onDismiss();
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {t("remindLater") || "稍后提醒"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

