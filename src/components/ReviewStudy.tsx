import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import { Word } from "../db";
import * as dbOperator from "../store/wordStore";
import { scheduleReviewWords } from "../algorithm";
import { updateWordProgress } from "../algorithm";
import { completeReviewStage } from "../store/reviewStore";
import { setReviewLock, clearReviewLock } from "../utils/reviewLock";
import { getReviewStageDescription } from "../utils/ebbinghausCurve";
import CloseButton from "./CloseButton";
import { handleErrorSync } from "../utils/errorHandler";
import { performanceMonitor } from "../utils/performanceMonitor";
import {
  getThemeTokens,
  getContainerStyle,
  getCardStyle,
} from "../utils/themeTokens";

// 复习会话状态存储 key
const REVIEW_SESSION_STORAGE_KEY = "lannger:reviewSession";

// 复习会话状态接口
interface ReviewSessionState {
  wordSetId?: number;
  reviewStage: number;
  wordIds: number[];
  currentIndex: number;
  sessionStats: {
    studiedCount: number;
    correctCount: number;
    wrongCount: number;
  };
  reviewResults: Record<number, "correct" | "wrong" | "skip">;
  savedAt: string;
}

/**
 * 获取保存的复习会话状态
 */
function getReviewSessionState(
  wordSetId?: number,
  reviewStage?: number
): ReviewSessionState | null {
  try {
    const stored = localStorage.getItem(REVIEW_SESSION_STORAGE_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as ReviewSessionState;

    // 检查是否是同一个复习计划
    if (
      session.wordSetId !== wordSetId ||
      session.reviewStage !== reviewStage
    ) {
      return null;
    }

    // 检查会话是否过期（超过 24 小时）
    const savedTime = new Date(session.savedAt).getTime();
    const now = Date.now();
    if (now - savedTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(REVIEW_SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * 保存复习会话状态
 */
function saveReviewSessionState(state: ReviewSessionState): void {
  try {
    localStorage.setItem(REVIEW_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 忽略存储错误
  }
}

/**
 * 清除复习会话状态
 */
function clearReviewSessionState(): void {
  try {
    localStorage.removeItem(REVIEW_SESSION_STORAGE_KEY);
  } catch {
    // 忽略错误
  }
}

interface ReviewStudyProps {
  closePopup: () => void;
  wordSetId?: number;
  reviewStage?: number;
  onSessionComplete?: (stats: {
    studiedCount: number;
    correctCount: number;
    wrongCount: number;
  }) => void;
}

type CardFrontMode = "writing" | "meaning";

/**
 * 复习学习组件
 * 基于艾宾浩斯遗忘曲线的复习模式
 */
export default function ReviewStudy({
  closePopup,
  wordSetId,
  reviewStage,
  onSessionComplete,
}: ReviewStudyProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

  /**
   * 使用共享主题令牌，确保与 FlashcardStudy 和 TestStudy 风格统一
   */
  const themeTokens = useMemo(() => getThemeTokens(isDark), [isDark]);

  // 状态管理
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [wordIds, setWordIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardFrontMode, setCardFrontMode] = useState<CardFrontMode>("writing");
  const [loading, setLoading] = useState(true);
  const currentReviewStage = reviewStage || 1;

  // 切换按钮高亮动画状态
  const [highlightAnimationClass, setHighlightAnimationClass] = useState("");
  const highlightAnimationTimeoutRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  const createInitialStats = () => ({
    studiedCount: 0,
    correctCount: 0,
    wrongCount: 0,
  });

  const [sessionStats, setSessionStats] = useState(createInitialStats);
  const startTimeRef = useRef<number>(Date.now());
  // 跟踪每个单词的复习结果（用于判断是否全部掌握）
  const reviewResultsRef = useRef<Map<number, "correct" | "wrong" | "skip">>(
    new Map()
  );

  // 当前复习计划 ID（用于推进阶段）
  const currentReviewPlanIdRef = useRef<number | undefined>(undefined);

  // 提示信息状态（用于显示未掌握提示）
  const [notificationMessage, setNotificationMessage] = useState<string | null>(
    null
  );

  // 是否全部掌握（用于显示选择按钮：重新复习 vs 进入下一阶段）
  const [allMastered, setAllMastered] = useState(false);

  // 标记是否正在重新复习（防止 useEffect 重复调用 loadWords）
  const isRestartingRef = useRef(false);

  /**
   * 加载复习单词列表
   */
  const loadWords = useCallback(
    async (forceReload = false) => {
      try {
        setLoading(true);

        // 尝试恢复之前的会话状态（除非强制重新加载）
        if (!forceReload) {
          const savedSession = getReviewSessionState(
            wordSetId,
            currentReviewStage
          );
          if (savedSession && savedSession.wordIds.length > 0) {
            console.log("恢复复习会话状态", savedSession);

            // 验证保存的单词ID是否仍然有效
            const validWordIds: number[] = [];
            for (const wordId of savedSession.wordIds) {
              const word = await dbOperator.getWord(wordId);
              if (word) {
                validWordIds.push(wordId);
              }
            }

            if (validWordIds.length > 0) {
              setWordIds(validWordIds);
              // 确保 currentIndex 不超出范围
              const safeIndex = Math.min(
                savedSession.currentIndex,
                validWordIds.length - 1
              );
              setCurrentIndex(Math.max(0, safeIndex));
              setSessionStats(savedSession.sessionStats);

              // 恢复复习结果
              reviewResultsRef.current.clear();
              for (const [wordIdStr, result] of Object.entries(
                savedSession.reviewResults
              )) {
                reviewResultsRef.current.set(Number(wordIdStr), result);
              }

              // 设置复习锁定
              if (wordSetId !== undefined) {
                await setReviewLock(wordSetId, currentReviewStage);
              }

              setLoading(false);
              return;
            }
          }
        }

        const endMeasure = performanceMonitor.start("loadReviewWords");

        const result = await scheduleReviewWords({
          wordSetId,
          limit: 50, // 复习模式默认50个单词
          onlyDue: true, // 只返回到期的单词和未掌握的单词
        });

        endMeasure({ wordSetId, count: result.wordIds.length });

        if (result.wordIds.length === 0) {
          handleErrorSync(
            new Error(t("noWordsToReview") || "没有需要复习的单词"),
            { operation: "loadReviewWords", wordSetId },
            false
          );
          closePopup();
          return;
        }

        setWordIds(result.wordIds);
        setCurrentIndex(0);
        // 重置复习结果跟踪
        reviewResultsRef.current.clear();
        // 重置全部掌握状态
        setAllMastered(false);

        // 查找对应的复习计划（如果有多个，找到包含当前单词的复习计划）
        if (wordSetId !== undefined) {
          const { db } = await import("../db");
          const { isReviewDue } = await import("../utils/ebbinghausCurve");
          const allPlans = await db.reviewPlans
            .where("wordSetId")
            .equals(wordSetId)
            .toArray();

          // 如果只有一个复习计划，使用它
          if (allPlans.length === 1) {
            currentReviewPlanIdRef.current = allPlans[0].id;
          } else if (allPlans.length > 1) {
            // 如果有多个复习计划，找到包含当前单词的复习计划
            const matchingPlan = allPlans.find((plan) => {
              if (!plan.learnedWordIds || plan.learnedWordIds.length === 0) {
                // 如果没有 learnedWordIds，可能是旧的复习计划，跳过
                return false;
              }
              // 检查当前单词是否在该计划的 learnedWordIds 中
              const planWordSet = new Set(plan.learnedWordIds);
              return result.wordIds.some((wordId) => planWordSet.has(wordId));
            });

            if (matchingPlan) {
              currentReviewPlanIdRef.current = matchingPlan.id;
            } else {
              // 如果没有找到匹配的计划，使用第一个到期的计划
              const duePlans = allPlans.filter((plan) => isReviewDue(plan));
              if (duePlans.length > 0) {
                currentReviewPlanIdRef.current = duePlans[0].id;
              } else {
                currentReviewPlanIdRef.current = allPlans[0].id;
              }
            }
          }

          // 设置复习锁定
          await setReviewLock(wordSetId, currentReviewStage);
        }
      } catch (error) {
        handleErrorSync(error, { operation: "loadReviewWords" });
      } finally {
        setLoading(false);
      }
    },
    [wordSetId, currentReviewStage, closePopup]
  );

  /**
   * 加载当前单词
   */
  const loadCurrentWord = useCallback(async () => {
    if (currentIndex >= wordIds.length) {
      // 复习完成
      await handleReviewComplete();
      return;
    }

    const wordId = wordIds[currentIndex];
    const word = await dbOperator.getWord(wordId);
    setCurrentWord(word || null);
    setShowAnswer(false);
    startTimeRef.current = Date.now();
  }, [currentIndex, wordIds]);

  /**
   * 检查是否所有单词都已掌握
   */
  const checkAllWordsMastered = async (): Promise<{
    allMastered: boolean;
    unmasteredWordIds: number[];
  }> => {
    const unmasteredWordIds: number[] = [];

    for (const wordId of wordIds) {
      const result = reviewResultsRef.current.get(wordId);
      // 如果单词未复习，或结果为 wrong/skip，视为未掌握
      if (!result || result !== "correct") {
        unmasteredWordIds.push(wordId);
      }
    }

    return {
      allMastered: unmasteredWordIds.length === 0,
      unmasteredWordIds,
    };
  };

  /**
   * 获取当前复习阶段对应的所有单词ID
   */
  const getCurrentStageWords = async (): Promise<number[]> => {
    if (wordSetId === undefined) {
      console.warn("getCurrentStageWords: wordSetId 未定义");
      return [];
    }

    const { db } = await import("../db");

    // 获取当前复习计划
    let plan: import("../db").ReviewPlan | undefined;
    if (currentReviewPlanIdRef.current !== undefined) {
      plan = await db.reviewPlans.get(currentReviewPlanIdRef.current);
      console.log(
        "getCurrentStageWords: 使用当前计划ID",
        currentReviewPlanIdRef.current,
        plan
      );
    } else {
      // 如果没有当前计划ID，尝试查找
      const allPlans = await db.reviewPlans
        .where("wordSetId")
        .equals(wordSetId)
        .toArray();

      console.log("getCurrentStageWords: 查找所有计划", {
        wordSetId,
        currentReviewStage,
        allPlansCount: allPlans.length,
        allPlans: allPlans.map((p) => ({
          id: p.id,
          reviewStage: p.reviewStage,
          learnedWordIdsCount: p.learnedWordIds?.length || 0,
        })),
      });

      // 找到当前阶段的计划
      plan = allPlans.find((p) => p.reviewStage === currentReviewStage);
      if (!plan && allPlans.length > 0) {
        plan = allPlans[0];
        console.log(
          "getCurrentStageWords: 未找到当前阶段的计划，使用第一个计划",
          plan
        );
      }
    }

    if (plan?.learnedWordIds && plan.learnedWordIds.length > 0) {
      // 如果有 learnedWordIds，使用它
      console.log(
        "getCurrentStageWords: 使用 learnedWordIds",
        plan.learnedWordIds
      );
      return plan.learnedWordIds;
    } else {
      // 否则，使用单词集的所有单词
      const words = await db.words.where("setId").equals(wordSetId).toArray();
      const wordIds = words.map((w) => w.id);
      console.log("getCurrentStageWords: 使用单词集的所有单词", {
        wordSetId,
        wordsCount: words.length,
        wordIds,
      });
      return wordIds;
    }
  };

  /**
   * 重新复习当前阶段
   */
  const handleRestartCurrentStage = async () => {
    if (wordSetId === undefined) {
      return;
    }

    // 确认对话框
    const confirmed = window.confirm(
      t("confirmRestartReview", {
        stage: currentReviewStage,
      })
    );

    if (!confirmed) {
      return;
    }

    try {
      // 设置重新复习标记，防止 useEffect 重复调用 loadWords
      isRestartingRef.current = true;

      // 获取当前阶段的所有单词
      const wordIds = await getCurrentStageWords();

      console.log("重新复习：获取到的单词ID列表", wordIds);

      if (wordIds.length === 0) {
        isRestartingRef.current = false; // 重置标记
        handleErrorSync(
          new Error(t("currentStageNoWords") || "当前阶段没有单词"),
          { operation: "restartCurrentStage" },
          true
        );
        return;
      }

      // 重置复习状态
      setLoading(true); // 先设置加载状态
      setAllMastered(false); // 先重置全部掌握状态，隐藏选择按钮
      setWordIds(wordIds);
      setCurrentIndex(0);
      reviewResultsRef.current.clear();
      setSessionStats(createInitialStats());
      setShowAnswer(false);

      // 确保加载第一个单词
      if (wordIds.length > 0) {
        const wordId = wordIds[0];
        const word = await dbOperator.getWord(wordId);
        console.log("重新复习：加载第一个单词", word);
        setCurrentWord(word || null);
        setShowAnswer(false);
        startTimeRef.current = Date.now();
      }

      // 重新设置复习锁定（确保锁定状态正确）
      if (wordSetId !== undefined) {
        await setReviewLock(wordSetId, currentReviewStage);
      }

      // 设置加载完成
      setLoading(false);

      console.log("重新复习：状态重置完成", {
        wordIdsCount: wordIds.length,
        currentIndex: 0,
        allMastered: false,
        loading: false,
      });

      // 显示提示
      const message = t("restartReviewStarted", { count: wordIds.length });
      setNotificationMessage(message);
      setTimeout(() => {
        setNotificationMessage(null);
      }, 3000);
    } catch (error) {
      console.error("重新复习失败:", error);
      isRestartingRef.current = false; // 重置标记
      handleErrorSync(error, { operation: "restartCurrentStage" });
      // 确保即使出错也重置加载状态
      setLoading(false);
      setAllMastered(false);
    }
  };

  /**
   * 继续到下一阶段
   */
  const handleContinueToNextStage = async () => {
    try {
      // 完成当前复习阶段并推进到下一阶段
      if (wordSetId !== undefined) {
        await completeReviewStage(
          wordSetId,
          undefined,
          currentReviewPlanIdRef.current
        );
      }

      // 解除复习锁定
      await clearReviewLock();

      // 清除会话状态（复习完成）
      clearReviewSessionState();

      // 调用完成回调
      if (onSessionComplete) {
        onSessionComplete(sessionStats);
      }

      closePopup();
    } catch (error) {
      handleErrorSync(error, { operation: "handleContinueToNextStage" });
    }
  };

  /**
   * 处理复习完成
   */
  const handleReviewComplete = async () => {
    try {
      // 检查是否所有单词都已掌握
      const { allMastered: isAllMastered, unmasteredWordIds } =
        await checkAllWordsMastered();

      if (!isAllMastered) {
        // 未全部掌握，继续复习未掌握的单词
        setWordIds(unmasteredWordIds);
        setCurrentIndex(0);
        setAllMastered(false);
        // 显示提示信息
        const message = t("reviewNotAllMastered", {
          count: unmasteredWordIds.length,
        });
        setNotificationMessage(message);
        console.log(message);
        // 3秒后自动隐藏提示
        setTimeout(() => {
          setNotificationMessage(null);
        }, 3000);
        return;
      }

      // 全部掌握，显示成功提示并显示选择按钮
      setAllMastered(true);
      const successMessage = t("reviewAllMastered");
      setNotificationMessage(successMessage);
      setTimeout(() => {
        setNotificationMessage(null);
      }, 2000);
    } catch (error) {
      handleErrorSync(error, { operation: "handleReviewComplete" });
    }
  };

  /**
   * 显示答案
   */
  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  /**
   * 保存当前会话状态
   */
  const saveCurrentSessionState = useCallback(() => {
    if (wordIds.length === 0) return;

    // 将 Map 转换为普通对象
    const reviewResultsObj: Record<number, "correct" | "wrong" | "skip"> = {};
    reviewResultsRef.current.forEach((value, key) => {
      reviewResultsObj[key] = value;
    });

    const state: ReviewSessionState = {
      wordSetId,
      reviewStage: currentReviewStage,
      wordIds,
      currentIndex,
      sessionStats,
      reviewResults: reviewResultsObj,
      savedAt: new Date().toISOString(),
    };

    saveReviewSessionState(state);
  }, [wordSetId, currentReviewStage, wordIds, currentIndex, sessionStats]);

  // 当状态变化时自动保存
  useEffect(() => {
    if (!loading && wordIds.length > 0) {
      saveCurrentSessionState();
    }
  }, [loading, wordIds, currentIndex, sessionStats, saveCurrentSessionState]);

  /**
   * 处理学习结果
   */
  const handleResult = async (result: "correct" | "wrong" | "skip") => {
    if (!currentWord) return;

    const responseTime = Date.now() - startTimeRef.current;
    await updateWordProgress(
      currentWord.id,
      result,
      "review",
      undefined,
      responseTime
    );

    // 记录复习结果
    reviewResultsRef.current.set(currentWord.id, result);

    // 更新统计
    const newStats = {
      studiedCount: sessionStats.studiedCount + 1,
      correctCount:
        result === "correct"
          ? sessionStats.correctCount + 1
          : sessionStats.correctCount,
      wrongCount:
        result === "wrong"
          ? sessionStats.wrongCount + 1
          : sessionStats.wrongCount,
    };
    setSessionStats(newStats);

    // 移动到下一个单词
    if (currentIndex < wordIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 复习完成
      await handleReviewComplete();
    }
  };

  /**
   * 切换卡片正面模式
   */
  const handleChangeFrontMode = useCallback((mode: CardFrontMode) => {
    setCardFrontMode((prev) => {
      if (prev === mode) {
        return prev;
      }
      return mode;
    });
    setShowAnswer(false);
  }, []);

  /**
   * 切换按钮高亮动画效果
   */
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (highlightAnimationTimeoutRef.current) {
      window.clearTimeout(highlightAnimationTimeoutRef.current);
    }
    const isMeaningFront = cardFrontMode === "meaning";
    const nextAnimationClass = isMeaningFront
      ? "flashcard-mode-highlight--animate-left"
      : "flashcard-mode-highlight--animate-right";
    setHighlightAnimationClass(nextAnimationClass);
    highlightAnimationTimeoutRef.current = window.setTimeout(() => {
      setHighlightAnimationClass("");
    }, 520);
    return () => {
      if (highlightAnimationTimeoutRef.current) {
        window.clearTimeout(highlightAnimationTimeoutRef.current);
      }
    };
  }, [cardFrontMode]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    // 如果正在重新复习，不调用 loadWords（避免重复加载）
    if (isRestartingRef.current) {
      isRestartingRef.current = false; // 重置标记
      return;
    }
    loadWords();
  }, [loadWords]);

  /**
   * 当前单词变化时加载
   */
  useEffect(() => {
    if (!loading && wordIds.length > 0) {
      loadCurrentWord();
    }
  }, [currentIndex, wordIds, loading, loadCurrentWord]);

  /**
   * 组件卸载时清理锁定（如果用户直接关闭）
   */
  useEffect(() => {
    return () => {
      // 如果组件卸载时还有单词未完成，保持锁定状态
      // 如果所有单词都完成了，锁定会在 handleReviewComplete 中清除
    };
  }, []);

  // ========================================
  // 所有 Hooks 必须在这里定义完成
  // 早期返回必须在所有 Hooks 之后
  // ========================================

  // 使用共享样式工具函数（与 FlashcardStudy 和 TestStudy 保持一致）
  const containerStyle: React.CSSProperties = useMemo(
    () => getContainerStyle(themeTokens, isPortrait),
    [themeTokens, isPortrait]
  );

  const cardStyle: React.CSSProperties = useMemo(
    () => getCardStyle(themeTokens, isPortrait),
    [themeTokens, isPortrait]
  );

  // 内容区域样式（可滚动）- 必须在早期返回之前定义，遵守 Hooks 规则
  // 注意：即使早期返回不使用此样式，也必须调用此 Hook，以确保 Hooks 调用顺序一致
  const contentAreaStyle: React.CSSProperties = useMemo(
    () => ({
      flex: 1,
      width: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      paddingBottom: isPortrait ? "12vh" : "8vh", // 预留底部空间，避免内容被按钮遮挡
      minHeight: 0, // 允许 flex 子元素缩小
    }),
    [isPortrait]
  );

  // ========================================
  // 早期返回 - 必须在所有 Hooks 之后
  // ========================================
  if (loading || !currentWord) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div
            style={{
              textAlign: "center",
              fontSize: isPortrait ? "4vw" : "1.5vw",
              color: isDark ? "#ccc" : "#666",
            }}
          >
            {t("loading")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <CloseButton
          onClick={closePopup}
          style={{
            position: "absolute",
            top: isPortrait ? "3vw" : "1vw",
            right: isPortrait ? "3vw" : "1vw",
            zIndex: 10,
          }}
          iconColor={isDark ? "#fff" : "#333"}
        />

        {/* 提示信息显示 */}
        {notificationMessage && (
          <div
            style={{
              position: "absolute",
              top: isPortrait ? "8vw" : "3vw",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: isDark
                ? "rgba(255, 193, 7, 0.9)"
                : "rgba(255, 193, 7, 0.95)",
              color: isDark ? "#000" : "#333",
              padding: isPortrait ? "2vw 4vw" : "0.8vw 1.5vw",
              borderRadius: isPortrait ? "2vw" : "0.5vw",
              fontSize: isPortrait ? "3.5vw" : "1vw",
              fontWeight: "500",
              boxShadow: isDark
                ? "0 2vw 6vw rgba(0, 0, 0, 0.3)"
                : "0 1vw 3vw rgba(0, 0, 0, 0.2)",
              maxWidth: isPortrait ? "85%" : "60%",
              textAlign: "center",
              transition: "opacity 0.3s ease-out",
            }}
          >
            {notificationMessage}
          </div>
        )}

        {/* 全部掌握后的选择按钮 */}
        {allMastered && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 2000,
              background: isDark
                ? "rgba(45, 45, 45, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
              borderRadius: isPortrait ? "3vw" : "1vw",
              padding: isPortrait ? "5vw" : "2vw",
              boxShadow: isDark
                ? "0 2vw 8vw rgba(0, 0, 0, 0.5)"
                : "0 1vw 4vw rgba(0, 0, 0, 0.1)",
              border: isDark ? "0.3vw solid #444" : "0.1vw solid #e0e0e0",
              minWidth: isPortrait ? "70%" : "400px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: isPortrait ? "4vw" : "1.2vw",
                color: isDark ? "#fff" : "#333",
                marginBottom: isPortrait ? "4vw" : "1.5vw",
                fontWeight: "500",
              }}
            >
              {t("reviewAllMastered")}
            </div>
            <div
              style={{
                display: "flex",
                gap: isPortrait ? "3vw" : "1.5vw",
                justifyContent: "center",
                flexDirection: isPortrait ? "column" : "row",
              }}
            >
              <button
                onClick={handleRestartCurrentStage}
                style={{
                  padding: isPortrait ? "3vw 6vw" : "1vw 2vw",
                  fontSize: isPortrait ? "3.5vw" : "1vw",
                  backgroundColor: "#00b4ff",
                  color: "#fff",
                  border: "none",
                  borderRadius: isPortrait ? "2vw" : "0.5vw",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                  flex: isPortrait ? "1" : "0 0 auto",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#0096d4";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#00b4ff";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {t("restartCurrentStage")}
              </button>
              <button
                onClick={handleContinueToNextStage}
                style={{
                  padding: isPortrait ? "3vw 6vw" : "1vw 2vw",
                  fontSize: isPortrait ? "3.5vw" : "1vw",
                  backgroundColor: "#34c759",
                  color: "#fff",
                  border: "none",
                  borderRadius: isPortrait ? "2vw" : "0.5vw",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                  flex: isPortrait ? "1" : "0 0 auto",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2fb04a";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#34c759";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {t("continueToNextStage")}
              </button>
            </div>
          </div>
        )}

        {/* 内容区域（可滚动） */}
        <div style={contentAreaStyle}>
          {/* 复习阶段显示 */}
          <div
            style={{
              textAlign: "center",
              marginBottom: isPortrait ? "4vw" : "1.5vw",
              marginTop: notificationMessage ? (isPortrait ? "8vw" : "3vw") : 0,
              fontSize: isPortrait ? "3.5vw" : "1vw",
              color: "#00b4ff",
              fontWeight: "bold",
              transition: "margin-top 0.3s ease-out",
              opacity: allMastered ? 0.3 : 1, // 全部掌握后降低不透明度
            }}
          >
            {getReviewStageDescription(currentReviewStage, t)}
          </div>

          {/* 进度显示 */}
          <div
            style={{
              textAlign: "center",
              marginBottom: isPortrait ? "4vw" : "1.5vw",
              fontSize: isPortrait ? "3.5vw" : "1vw",
              color: isDark ? "#ccc" : "#666",
            }}
          >
            {t("progress")}: {currentIndex + 1} / {wordIds.length}
          </div>

          {/* 切换按钮（参考 FlashcardStudy 的样式） */}
          <div
            style={{
              position: "absolute",
              top: isPortrait ? "4%" : "6%",
              width: "100%",
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 25,
            }}
          >
            <div
              style={{
                pointerEvents: "auto",
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
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "50%",
                  height: "100%",
                  borderRadius: isPortrait ? "7vw" : "3vw",
                  background: themeTokens.glassHighlightBackground,
                  boxShadow: themeTokens.glassHighlightShadow,
                  zIndex: 0,
                  ["--mode-fluid-color" as any]:
                    themeTokens.highlightFluidColor,
                  ["--mode-fluid-sheen" as any]:
                    themeTokens.highlightFluidSheen,
                  ["--mode-fluid-halo" as any]: themeTokens.highlightHaloShadow,
                }}
                className={`flashcard-mode-highlight ${
                  cardFrontMode === "meaning"
                    ? "flashcard-mode-highlight--left"
                    : "flashcard-mode-highlight--right"
                } ${highlightAnimationClass}`}
                aria-hidden="true"
              />
              <button
                type="button"
                className="flashcard-mode-button"
                style={{
                  width: "50%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  borderRadius: "0",
                  position: "relative",
                  zIndex: 1,
                  transition: "background-color 0.35s ease",
                  color: isDark ? "#f5f5f7" : "#202022",
                  outline: "none",
                  boxShadow: "none",
                  backgroundColor: "transparent",
                }}
                onClick={() => handleChangeFrontMode("meaning")}
                title={t("flashcardFrontToggleToMeaning")}
                aria-pressed={cardFrontMode === "meaning"}
                aria-label={t("flashcardFrontToggleToMeaning")}
              >
                <div
                  style={{
                    width: "auto",
                    height: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={isPortrait ? "8vw" : "2vw"}
                    height={isPortrait ? "8vw" : "2vw"}
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill={
                        cardFrontMode === "meaning"
                          ? themeTokens.lightbulbActivePrimary
                          : themeTokens.lightbulbInactivePrimary
                      }
                      d="M14 20a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1zm1-3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-2c-1.8-1.18-3-3.2-3-5.5A6.5 6.5 0 0 1 11.5 3A6.5 6.5 0 0 1 18 9.5c0 2.3-1.2 4.32-3 5.5zm-6 0a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-2.6c1.78-.9 3-2.76 3-4.9A5.5 5.5 0 0 0 11.5 4A5.5 5.5 0 0 0 6 9.5c0 2.14 1.22 4 3 4.9z"
                    />
                    <path
                      fill={
                        cardFrontMode === "meaning"
                          ? themeTokens.lightbulbActiveAccent
                          : themeTokens.lightbulbInactiveAccent
                      }
                      d="M8.13 10.12l2.37-2.37l2 2L14.25 8l.71.71l-2.46 2.45l-2-2l-1.66 1.67z"
                    />
                  </svg>
                </div>
              </button>
              <button
                type="button"
                className="flashcard-mode-button"
                style={{
                  width: "50%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  borderRadius: "0",
                  position: "relative",
                  zIndex: 1,
                  transition: "background-color 0.35s ease",
                  color: isDark ? "#f5f5f7" : "#202022",
                  outline: "none",
                  boxShadow: "none",
                  backgroundColor: "transparent",
                }}
                onClick={() => handleChangeFrontMode("writing")}
                title={t("flashcardFrontToggleToWriting")}
                aria-pressed={cardFrontMode === "writing"}
                aria-label={t("flashcardFrontToggleToWriting")}
              >
                <div
                  style={{
                    width: "auto",
                    height: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingRight: isPortrait ? "0" : "10%",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={isPortrait ? "8vw" : "2vw"}
                    height={isPortrait ? "8vw" : "2vw"}
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill={
                        cardFrontMode === "meaning"
                          ? themeTokens.wandInactivePrimary
                          : themeTokens.wandActivePrimary
                      }
                      d="M16.15 13.05L14 16.5q-.275.425-.762.35t-.613-.575l-.7-2.8L5.1 20.3q-.275.275-.687.288T3.7 20.3q-.275-.275-.275-.7t.275-.7l6.825-6.85l-2.8-.7q-.5-.125-.575-.612t.35-.763l3.45-2.125l-.3-4.075q-.05-.5.4-.725t.825.1L15 5.775l3.775-1.525q.475-.2.825.15t.15.825L18.225 9l2.625 3.1q.325.375.1.825t-.725.4zm-12.8-6.7Q3.2 6.2 3.2 6t.15-.35l1.3-1.3Q4.8 4.2 5 4.2t.35.15l1.3 1.3q.15.15.15.35t-.15.35l-1.3 1.3Q5.2 7.8 5 7.8t-.35-.15zm14.3 14.3l-1.3-1.3q-.15-.15-.15-.35t.15-.35l1.3-1.3q.15-.15.35-.15t.35.15l1.3 1.3q.15.15.15.35t-.15.35l-1.3 1.3q-.15.15-.35.15t-.35-.15"
                    />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* 卡片正面 */}
          <div
            style={{
              textAlign: "center",
              marginBottom: isPortrait ? "6vw" : "2vw",
              padding: isPortrait ? "4vw" : "2vw",
              background: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              borderRadius: isPortrait ? "2vw" : "0.5vw",
              border: `${isPortrait ? "0.2vw" : "0.08vw"} solid ${
                themeTokens.cardBorderColor
              }`,
              minHeight: isPortrait ? "30vh" : "200px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {cardFrontMode === "writing" ? (
              <div>
                <div
                  style={{
                    fontSize: isPortrait ? "6vw" : "2.5vw",
                    fontWeight: "bold",
                    color: "#00b4ff",
                    marginBottom: isPortrait ? "3vw" : "1vw",
                  }}
                >
                  {currentWord.kanji || currentWord.kana}
                </div>
                {currentWord.kana && currentWord.kanji && (
                  <div
                    style={{
                      fontSize: isPortrait ? "4vw" : "1.5vw",
                      color: isDark ? "#999" : "#666",
                    }}
                  >
                    {currentWord.kana}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  fontSize: isPortrait ? "5vw" : "2vw",
                  fontWeight: "bold",
                  color: "#00b4ff",
                }}
              >
                {currentWord.meaning}
              </div>
            )}
          </div>

          {/* 显示答案区域 */}
          {showAnswer && (
            <div
              className="answer-reveal"
              style={{
                textAlign: "center",
                marginBottom: isPortrait ? "4vw" : "1.5vw",
                padding: isPortrait ? "3vw" : "1.5vw",
                background: isDark
                  ? "rgba(0, 180, 255, 0.1)"
                  : "rgba(0, 180, 255, 0.05)",
                borderRadius: isPortrait ? "2vw" : "0.5vw",
              }}
            >
              {cardFrontMode === "writing" ? (
                <div
                  style={{
                    fontSize: isPortrait ? "4.5vw" : "1.8vw",
                    color: isDark ? "#fff" : "#333",
                  }}
                >
                  {currentWord.meaning}
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: isPortrait ? "5vw" : "2vw",
                      fontWeight: "bold",
                      color: "#00b4ff",
                      marginBottom: isPortrait ? "2vw" : "0.5vw",
                    }}
                  >
                    {currentWord.kanji || currentWord.kana}
                  </div>
                  {currentWord.kana && currentWord.kanji && (
                    <div
                      style={{
                        fontSize: isPortrait ? "4vw" : "1.5vw",
                        color: isDark ? "#999" : "#666",
                      }}
                    >
                      {currentWord.kana}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮（与 FlashcardStudy 保持一致） */}
        <div
          style={{
            display: allMastered ? "none" : "flex", // 全部掌握后隐藏操作按钮
            width: "100%",
            height: "auto",
            gap: isPortrait ? "2.5vw" : "2vw",
            justifyContent: "center",
            alignItems: "center",
            padding: isPortrait ? "2vh 2vw" : "1vh 2vw",
            boxSizing: "border-box",
            flexShrink: 0, // 防止按钮区域被压缩
          }}
        >
          {!showAnswer ? (
            <>
              {/* 未显示答案时：显示"已学会"和"显示答案"两个按钮（与闪卡学习保持一致） */}
              <button
                onClick={() => handleResult("correct")}
                style={{
                  borderRadius: isPortrait ? "2vh" : "1vh",
                  border: "none",
                  fontSize: isPortrait
                    ? "clamp(3vw, 1.2rem, 4vw)"
                    : "clamp(0.8vw, 0.8rem, 1.2vw)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  padding: isPortrait ? "2.2vh 0" : "1.2vh 2.4vw",
                  minHeight: isPortrait ? "6vh" : "4.4vh",
                  flex: isPortrait ? "1 1 0" : "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgb(52, 199, 89)",
                  color: "#fff",
                  ...(isPortrait ? { aspectRatio: "2.6 / 1" } : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-0.2vh)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 0.4vh 1.2vh rgba(52, 199, 89, 0.5)"
                    : "0 0.4vh 1.2vh rgba(76, 175, 80, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {t("learned")}
              </button>
              <button
                onClick={handleShowAnswer}
                style={{
                  borderRadius: isPortrait ? "2vh" : "1vh",
                  border: "none",
                  fontSize: isPortrait
                    ? "clamp(3vw, 1.2rem, 4vw)"
                    : "clamp(0.8vw, 0.8rem, 1.2vw)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  padding: isPortrait ? "2.2vh 0" : "1.2vh 2.4vw",
                  minHeight: isPortrait ? "6vh" : "4.4vh",
                  flex: isPortrait ? "1 1 0" : "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgb(197, 150, 241)",
                  color: "#fff",
                  ...(isPortrait ? { aspectRatio: "2.6 / 1" } : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-0.2vh)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 0.4vh 1.2vh rgba(10, 132, 255, 0.5)"
                    : "0 0.4vh 1.2vh rgba(0, 180, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {t("showAnswer")}
              </button>
            </>
          ) : (
            <>
              {/* 显示答案后：显示"正确"、"错误"、"跳过"三个按钮（与闪卡学习保持一致） */}
              <button
                onClick={() => handleResult("correct")}
                style={{
                  borderRadius: isPortrait ? "2vh" : "1vh",
                  border: "none",
                  fontSize: isPortrait
                    ? "clamp(3vw, 1.2rem, 4vw)"
                    : "clamp(0.8vw, 0.8rem, 1.2vw)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  padding: isPortrait ? "2.2vh 0" : "1.2vh 2.4vw",
                  minHeight: isPortrait ? "6vh" : "4.4vh",
                  flex: isPortrait ? "1 1 0" : "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgb(52, 199, 89)",
                  color: "#fff",
                  ...(isPortrait ? { aspectRatio: "2.6 / 1" } : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-0.2vh)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 0.4vh 1.2vh rgba(52, 199, 89, 0.5)"
                    : "0 0.4vh 1.2vh rgba(76, 175, 80, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {t("correct")}
              </button>
              <button
                onClick={() => handleResult("wrong")}
                style={{
                  borderRadius: isPortrait ? "2vh" : "1vh",
                  border: "none",
                  fontSize: isPortrait
                    ? "clamp(3vw, 1.2rem, 4vw)"
                    : "clamp(0.8vw, 0.8rem, 1.2vw)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  padding: isPortrait ? "2.2vh 0" : "1.2vh 2.4vw",
                  minHeight: isPortrait ? "6vh" : "4.4vh",
                  flex: isPortrait ? "1 1 0" : "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgb(255, 59, 48)",
                  color: "#fff",
                  ...(isPortrait ? { aspectRatio: "2.6 / 1" } : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-0.2vh)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 0.4vh 1.2vh rgba(255, 59, 48, 0.5)"
                    : "0 0.4vh 1.2vh rgba(244, 67, 54, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {t("wrong")}
              </button>
              <button
                onClick={() => handleResult("skip")}
                style={{
                  borderRadius: isPortrait ? "2vh" : "1vh",
                  border: "none",
                  fontSize: isPortrait
                    ? "clamp(3vw, 1.2rem, 4vw)"
                    : "clamp(0.8vw, 0.8rem, 1.2vw)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  padding: isPortrait ? "2.2vh 0" : "1.2vh 2.4vw",
                  minHeight: isPortrait ? "6vh" : "4.4vh",
                  flex: isPortrait ? "1 1 0" : "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark
                    ? "rgba(142, 142, 147, 0.3)"
                    : "rgba(0, 0, 0, 0.1)",
                  color: isDark ? "#fff" : "#333",
                  ...(isPortrait ? { aspectRatio: "2.6 / 1" } : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-0.2vh)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 0.4vh 1.2vh rgba(0, 0, 0, 0.3)"
                    : "0 0.4vh 1.2vh rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {t("skip")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
