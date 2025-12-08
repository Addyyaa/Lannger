import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import { ReviewPlan } from "../db";
import { useReviewStore, useWordStore } from "../store/hooks";
import { getReviewStageDescription } from "../utils/ebbinghausCurve";
import { canStartReview } from "../utils/reviewLock";
import { handleErrorSync } from "../utils/errorHandler";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
} from "../services/notificationService";
import { getReviewLock } from "../utils/reviewLock";
import { getFlashcardSessionState } from "../store/wordStore";
import { useUIStore } from "../store/hooks";
import LoadingIndicator from "./LoadingIndicator";
import { db, ensureDBOpen } from "../db";

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

  // 使用 Zustand Store
  const reviewStore = useReviewStore();
  const wordStore = useWordStore();

  // 使用 UI Store 管理加载状态
  const setUILoading = useUIStore((state) => state.setLoading);
  const isLoading = useUIStore(
    (state) => state.loading["reviewNotifications"] || false
  );

  const [notifications, setNotifications] = useState<
    Array<
      ReviewPlan & {
        wordSetName: string;
        actualDueWords: number;
        isCurrent?: boolean;
        isQueued?: boolean;
        canStart?: boolean;
      }
    >
  >([]);
  const lastNotificationTimeRef = useRef<Map<number, number>>(new Map()); // 记录上次发送通知的时间，避免重复通知

  /**
   * 检查复习通知
   */
  const checkNotifications = async () => {
    try {
      setUILoading("reviewNotifications", true);
      // 使用 Zustand Store 加载到期复习计划
      await reviewStore.loadDueReviewPlans();
      const duePlans = reviewStore.dueReviewPlans;

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
          // 从 Store 中获取单词集，如果不存在则从数据库查询
          let wordSet = wordStore.wordSets.find(
            (ws) => ws.id === plan.wordSetId
          );
          if (!wordSet) {
            await ensureDBOpen();
            wordSet = (await db.wordSets.get(plan.wordSetId)) || undefined;
          }
          const canReview = await canStartReview(plan.wordSetId);

          // 判断是否为当前需要复习的（第一个且未被锁定，或者被锁定的是这个）
          const isCurrent =
            index === 0 &&
            (canReview.allowed || currentLockedWordSetId === plan.wordSetId);

          // 计算实际到期的单词数
          const { scheduleReviewWords } = await import("../algorithm");
          const reviewResult = await scheduleReviewWords({
            wordSetId: plan.wordSetId,
            onlyDue: true,
            limit: 1000, // 获取所有到期的单词
          });
          const actualDueWords = reviewResult.dueCount;

          return {
            ...plan,
            wordSetName: wordSet?.name || `单词集 #${plan.wordSetId}`,
            isCurrent, // 是否为当前需要复习的
            isQueued: !isCurrent, // 是否为排队中的
            canStart: canReview.allowed && actualDueWords > 0, // 是否可以开始复习（需要实际有到期的单词）
            actualDueWords, // 实际到期的单词数
          };
        })
      );

      // 过滤掉没有到期单词的通知
      const validNotifications = notificationsWithNames.filter(
        (n) => n.actualDueWords > 0
      );

      setNotifications(validNotifications);

      // 发送系统通知（仅对当前可复习的通知）
      validNotifications.forEach((notification) => {
        if (notification.isCurrent && notification.canStart) {
          sendSystemNotification(notification);
        }
      });
    } catch (error) {
      handleErrorSync(error, { operation: "checkReviewNotifications" });
    } finally {
      setUILoading("reviewNotifications", false);
    }
  };

  /**
   * 检查是否正在学习（闪卡或复习模式）
   */
  const isCurrentlyStudying = async (): Promise<boolean> => {
    try {
      // 检查是否有复习锁定（如果有，说明正在复习）
      const reviewLock = await getReviewLock();
      if (reviewLock) {
        return true;
      }

      // 检查是否有闪卡会话状态（如果有，说明正在闪卡学习）
      const flashcardSession = await getFlashcardSessionState();
      if (flashcardSession && flashcardSession.wordIds.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      handleErrorSync(error, { operation: "isCurrentlyStudying" });
      // 如果检查失败，为了安全起见，不发送通知
      return true;
    }
  };

  /**
   * 发送系统通知
   */
  const sendSystemNotification = async (
    notification: ReviewPlan & {
      wordSetName: string;
      actualDueWords: number;
      isCurrent?: boolean;
    }
  ) => {
    // 检查是否支持通知
    if (!isNotificationSupported()) {
      return;
    }

    // 检查是否正在学习，如果正在学习则不发送通知
    const studying = await isCurrentlyStudying();
    if (studying) {
      console.log("正在学习中，跳过系统通知");
      return;
    }

    // 检查权限
    const permission = getNotificationPermission();
    if (permission !== "granted") {
      // 如果权限未授予，尝试请求权限（仅在第一次）
      if (permission === "default") {
        const granted = await requestNotificationPermission();
        if (!granted) {
          return;
        }
      } else {
        return;
      }
    }

    // 避免重复通知：同一单词集在 5 分钟内只通知一次
    const now = Date.now();
    const lastTime = lastNotificationTimeRef.current.get(
      notification.wordSetId
    );
    if (lastTime && now - lastTime < 5 * 60 * 1000) {
      return;
    }

    // 只对当前可复习的通知发送系统通知
    if (!notification.isCurrent) {
      return;
    }

    try {
      const stageDescription = getReviewStageDescription(
        notification.reviewStage,
        t
      );
      const title = t("reviewNotification") || "复习提醒";
      const body = `${notification.wordSetName} - ${stageDescription}\n${
        t("reviewWordsCount") || "需要复习的单词"
      }: ${notification.actualDueWords}`;

      await showNotification({
        title,
        body,
        tag: `review-${notification.wordSetId}-${notification.reviewStage}`, // 相同单词集和阶段的通知会被替换
        data: {
          wordSetId: notification.wordSetId,
          reviewStage: notification.reviewStage,
          url: "/study",
        },
      });

      // 记录通知时间
      lastNotificationTimeRef.current.set(notification.wordSetId, now);
    } catch (error) {
      handleErrorSync(error, { operation: "sendSystemNotification" });
    }
  };

  useEffect(() => {
    // 监听 Service Worker 消息（处理通知点击）
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK") {
        if (event.data.action === "startReview") {
          onStartReview(event.data.wordSetId, event.data.reviewStage);
          if (onDismiss) {
            onDismiss();
          }
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, [onStartReview, onDismiss]);

  useEffect(() => {
    // 初始检查
    checkNotifications();

    // 每分钟检查一次
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, []);

  // 如果正在加载，显示加载指示器
  if (isLoading) {
    return (
      <div
        style={{
          position: "fixed",
          top: isPortrait ? "10vw" : "2vw",
          right: isPortrait ? "5vw" : "2vw",
          zIndex: 10000,
        }}
      >
        <LoadingIndicator size="small" />
      </div>
    );
  }

  // 如果没有通知，不显示
  if (notifications.length === 0) {
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

  const getNotificationStyle = (
    isCurrent: boolean,
    isQueued: boolean
  ): React.CSSProperties => ({
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
              {getReviewStageDescription(notification.reviewStage, t)}
            </div>
            <div style={textStyle}>
              {t("reviewWordsCount") || "需要复习的单词"}:{" "}
              {notification.actualDueWords || 0}
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
