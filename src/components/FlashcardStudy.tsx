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
import { scheduleFlashcardWords } from "../algorithm";
import { updateWordProgress } from "../algorithm";
import CloseButton from "./CloseButton";
import { getThemeTokens } from "../utils/themeTokens";
import LoadingIndicator from "./LoadingIndicator";
import { handleErrorSync } from "../utils/errorHandler";

interface FlashcardStudyProps {
  closePopup: () => void;
  wordSetId?: number;
  onSessionComplete?: (stats: {
    studiedCount: number;
    correctCount: number;
    wrongCount: number;
    masteredWordIds?: number[]; // 本次会话中标记为掌握的单词ID列表
  }) => void;
}

type CardFrontMode = "writing" | "meaning";

/**
 * 闪卡学习组件
 */
export default function FlashcardStudy({
  closePopup,
  wordSetId,
  onSessionComplete,
}: FlashcardStudyProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  /**
   * 使用共享主题令牌，确保与 TestStudy 和 ReviewStudy 风格统一
   */
  const themeTokens = useMemo(() => getThemeTokens(isDark), [isDark]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [wordIds, setWordIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardFrontMode, setCardFrontMode] = useState<CardFrontMode>("writing");
  const [loading, setLoading] = useState(true);
  const createInitialStats = () => ({
    studiedCount: 0,
    correctCount: 0,
    wrongCount: 0,
  });
  const [sessionStats, setSessionStats] = useState(createInitialStats);
  // 跟踪本次会话中标记为"掌握"的单词ID列表
  const [masteredWordIds, setMasteredWordIds] = useState<number[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const shouldPersistRef = useRef(true);
  const highlightAnimationTimeoutRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);
  const sessionCompleteCalledRef = useRef(false);
  const [highlightAnimationClass, setHighlightAnimationClass] = useState("");

  const clearPersistedSessionState = useCallback(async () => {
    try {
      await dbOperator.clearFlashcardSessionState();
    } catch (error) {
      handleErrorSync(error, { operation: "clearFlashcardSessionState" });
    }
  }, []);

  const resolveSessionLimit = useCallback(async () => {
    try {
      const settings = await dbOperator.getUserSettings();
      const parsed = Number.parseInt(String(settings.dailyGoal ?? 20), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    } catch (error) {
      handleErrorSync(error, { operation: "resolveSessionLimit" });
      return 20;
    }
  }, []);

  useEffect(() => {
    if (wordIds.length > 0 && currentIndex < wordIds.length) {
      loadCurrentWord();
    }
  }, [wordIds, currentIndex]);

  const loadWords = useCallback(
    async (limitOverride?: number) => {
      try {
        shouldPersistRef.current = false;
        setLoading(true);
        setSessionStats(createInitialStats());
        setShowAnswer(false);
        setResetFeedback(null);
        setCurrentWord(null);
        setMasteredWordIds([]); // 重置已掌握的单词ID列表
        sessionCompleteCalledRef.current = false; // 重置完成标志
        await clearPersistedSessionState();
        const limit = limitOverride ?? (await resolveSessionLimit());
        // 每次加载单词时都重新调用 scheduleFlashcardWords，确保按照最新的掌握度排序
        const result = await scheduleFlashcardWords({
          wordSetId,
          limit,
          includeNewWords: true,
          includeReviewWords: true,
          masteryThreshold: 0.9, // 只过滤掉掌握程度非常高的单词
        });
        setWordIds(result.wordIds);
        setCurrentIndex(0);
      } catch (error) {
        handleErrorSync(error, { operation: "loadWords" });
      } finally {
        startTimeRef.current = Date.now();
        setLoading(false);
        shouldPersistRef.current = true;
      }
    },
    [wordSetId, clearPersistedSessionState, resolveSessionLimit]
  );

  useEffect(() => {
    let cancelled = false;

    const restoreOrLoad = async () => {
      try {
        const sessionLimit = await resolveSessionLimit();
        const persisted = await dbOperator.getFlashcardSessionState();
        if (cancelled) {
          return;
        }

        const normalizedWordSetId = wordSetId ?? null;
        const persistedWordSetId = persisted?.wordSetId ?? null;

        if (
          persisted &&
          Array.isArray(persisted.wordIds) &&
          persisted.wordIds.length > 0 &&
          normalizedWordSetId === persistedWordSetId
        ) {
          const wordRecords = await Promise.all(
            persisted.wordIds.map((id) => dbOperator.getWord(id))
          );

          if (cancelled) {
            return;
          }

          const validWordIds: number[] = [];
          wordRecords.forEach((word, index) => {
            if (word) {
              validWordIds.push(persisted.wordIds[index]);
            }
          });

          const limitedWordIds = validWordIds.slice(0, sessionLimit);

          if (limitedWordIds.length > 0) {
            if (cancelled) {
              return;
            }
            const nextIndex = Math.min(
              Math.max(persisted.currentIndex ?? 0, 0),
              limitedWordIds.length - 1
            );

            setWordIds(limitedWordIds);
            setCurrentIndex(nextIndex);
            setSessionStats(
              persisted.sessionStats
                ? {
                    studiedCount: persisted.sessionStats.studiedCount ?? 0,
                    correctCount: persisted.sessionStats.correctCount ?? 0,
                    wrongCount: persisted.sessionStats.wrongCount ?? 0,
                  }
                : createInitialStats()
            );
            setShowAnswer(Boolean(persisted.showAnswer));
            startTimeRef.current = Date.now();
            shouldPersistRef.current = true;
            setLoading(false);
            return;
          }
        }

        await loadWords(sessionLimit);
      } catch (error) {
        handleErrorSync(error, { operation: "restoreFlashcardSession" });
        const fallbackLimit = await resolveSessionLimit();
        await loadWords(fallbackLimit);
      }
    };

    restoreOrLoad();

    return () => {
      cancelled = true;
    };
  }, [wordSetId, loadWords, resolveSessionLimit]);

  useEffect(() => {
    if (loading) return;
    if (!wordIds || wordIds.length === 0) return;
    if (currentIndex < 0 || currentIndex >= wordIds.length) return;
    if (!shouldPersistRef.current) return;

    const state = {
      wordSetId,
      wordIds,
      currentIndex,
      sessionStats,
      showAnswer,
      currentWordId: wordIds[currentIndex],
    };

    dbOperator.saveFlashcardSessionState(state).catch((error) => {
      handleErrorSync(error, { operation: "saveFlashcardSessionState" });
    });
  }, [wordIds, currentIndex, sessionStats, showAnswer, wordSetId, loading]);

  const loadCurrentWord = async () => {
    if (currentIndex >= wordIds.length) {
      // 学习完成 - 这种情况不应该发生，因为 handleResult 会处理最后一个单词
      // 但如果确实发生了（比如直接关闭），使用当前统计
      if (!sessionCompleteCalledRef.current) {
        sessionCompleteCalledRef.current = true;
        shouldPersistRef.current = false;
        await clearPersistedSessionState();
        if (onSessionComplete) {
          onSessionComplete(sessionStats);
        }
      }
      closePopup();
      return;
    }

    const wordId = wordIds[currentIndex];
    const word = await dbOperator.getWord(wordId);
    setCurrentWord(word || null);
    setShowAnswer(false);
    startTimeRef.current = Date.now();
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleChangeFrontMode = useCallback((mode: CardFrontMode) => {
    setCardFrontMode((prev) => {
      if (prev === mode) {
        return prev;
      }
      return mode;
    });
    setShowAnswer(false);
  }, []);

  const handleResult = async (result: "correct" | "wrong" | "skip") => {
    if (!currentWord) return;

    const responseTime = Date.now() - startTimeRef.current;
    await updateWordProgress(
      currentWord.id,
      result,
      "flashcard",
      undefined,
      responseTime
    );

    // 更新统计，使用函数式更新确保获取最新值
    // 先计算新的统计值，确保 finalStats 不为 null
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

    // 如果标记为"掌握"，添加到已掌握列表
    if (result === "correct" && currentWord.id) {
      setMasteredWordIds((prev) => {
        if (!prev.includes(currentWord.id)) {
          return [...prev, currentWord.id];
        }
        return prev;
      });
    }

    // 移动到下一个单词
    if (currentIndex < wordIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 学习完成 - 使用计算好的统计值
      if (!sessionCompleteCalledRef.current) {
        sessionCompleteCalledRef.current = true;
        shouldPersistRef.current = false;
        await clearPersistedSessionState();
        if (onSessionComplete) {
          // 确保使用最新的 masteredWordIds（包含当前单词，如果它是"correct"）
          // 直接计算最终的 masteredWordIds，确保包含当前单词（如果它是"correct"）
          const finalMasteredIds =
            result === "correct" && currentWord.id
              ? masteredWordIds.includes(currentWord.id)
                ? masteredWordIds
                : [...masteredWordIds, currentWord.id]
              : masteredWordIds;

          console.log("闪卡学习完成，调用 onSessionComplete", {
            ...newStats,
            masteredWordIds: finalMasteredIds,
            currentWordId: currentWord.id,
            currentResult: result,
            originalMasteredWordIds: masteredWordIds,
            finalMasteredWordIds: finalMasteredIds,
          });
          await onSessionComplete({
            ...newStats,
            masteredWordIds: finalMasteredIds,
          });
        }
        // 等待更长时间确保数据库更新和统计刷新完成，然后再关闭
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      closePopup();
    }
  };

  const handleResetProgress = async () => {
    if (isResetting) return;

    try {
      setIsResetting(true);
      setResetFeedback(null);
      const resetCount = await dbOperator.resetWordProgress(wordSetId);

      if (resetCount === 0) {
        setResetFeedback(t("resetProgressEmpty"));
        return;
      }

      shouldPersistRef.current = false;
      await clearPersistedSessionState();
      const limit = await resolveSessionLimit();
      await loadWords(limit);
      window.alert(t("resetProgressSuccess", { count: resetCount }));
    } catch (error) {
      handleErrorSync(error, { operation: "resetProgress" });
      setResetFeedback(t("resetProgressError"));
    } finally {
      setIsResetting(false);
    }
  };

  // 外层容器（不翻转，包含 perspective）
  const outerContainerStyle: React.CSSProperties = {
    background: themeTokens.containerGradient,
    borderRadius: isPortrait ? "4vw" : "1.5vw",
    width: isPortrait ? "85vw" : "60vw",
    height: isPortrait ? "75vh" : "auto",
    aspectRatio: isPortrait ? undefined : "1/0.63",
    maxHeight: isPortrait ? "75vh" : "none",
    boxShadow: isPortrait
      ? themeTokens.containerShadowPortrait
      : themeTokens.containerShadowLandscape,
    border: isPortrait
      ? `0.4vw solid ${themeTokens.containerBorderColor}`
      : `0.15vw solid ${themeTokens.containerBorderColor}`,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden", // 防止内容溢出
  };

  // 卡片容器包装（提供 perspective）
  const cardWrapperStyle: React.CSSProperties = {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    position: "relative",
    perspective: isPortrait ? "200vw" : "100vw",
    WebkitPerspective: isPortrait ? "200vw" : "100vw",
    // 注意：不要设置 overflow: hidden，因为它会破坏 3D transform 效果
    minHeight: 0, // 允许 flex 子元素缩小
  };

  // 追踪翻转动画状态
  const [isFlipping, setIsFlipping] = useState(false);
  const flipTimeoutRef = useRef<number | null>(null);

  // 3D卡片容器 - 简化实现，不使用 3D 翻转
  const card3DContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
  };

  // 监听 showAnswer 变化来触发翻转动画
  useEffect(() => {
    if (flipTimeoutRef.current) {
      window.clearTimeout(flipTimeoutRef.current);
    }
    setIsFlipping(true);
    flipTimeoutRef.current = window.setTimeout(() => {
      setIsFlipping(false);
    }, 700);
    return () => {
      if (flipTimeoutRef.current) {
        window.clearTimeout(flipTimeoutRef.current);
      }
    };
  }, [showAnswer]);

  // 卡片正面和背面的共同样式 - 完全无边框，与按钮区域无缝融合
  const cardFaceBaseStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    // 使用透明背景，让容器背景透出
    background: "transparent",
    borderRadius: 0,
    border: "none",
    boxShadow: "none",
  };

  const cardFaceStyle: React.CSSProperties = {
    ...cardFaceBaseStyle,
    display: showAnswer ? "none" : "flex", // 显示答案时隐藏正面
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "default",
  };

  const cardFaceContentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: isPortrait ? "2.4vh" : "1.6vh",
    width: "100%",
    height: "100%",
    padding: isPortrait ? "12vh 8vw 10vh" : "6vh 5vw 5vh",
    boxSizing: "border-box",
    textAlign: "center",
  };

  const frontMeaningTextStyle: React.CSSProperties = {
    fontSize: isPortrait ? "calc(3vw + 3vh)" : "calc(1.6vw + 1.6vh)",
    fontWeight: 600,
    color: isDark ? "#f5f5f5" : "#333",
    lineHeight: 1.6,
    wordBreak: "break-word",
  };

  const cardBackStyle: React.CSSProperties = {
    ...cardFaceBaseStyle,
    display: showAnswer ? "flex" : "none", // 显示答案时显示背面
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
    cursor: "default",
    alignItems: "center",
    height: "100%",
    width: "100%",
    justifyContent: "flex-start",
    top: 0,
    boxSizing: "border-box",
    scrollbarWidth: "none", // Firefox: 隐藏滚动条
    msOverflowStyle: "none", // IE/Edge: 隐藏滚动条
    paddingBottom: isPortrait ? "12vh" : "8vh", // 预留底部空间，避免内容被按钮遮挡
  };

  // 卡片背面内容的样式 - 不设置 height: 100%，让内容自然撑开以支持滚动
  const cardBackContentStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const isMeaningFront = cardFrontMode === "meaning";

  const frontModeToggleContainerStyle: React.CSSProperties = {
    position: "absolute",
    top: isPortrait ? "4%" : "6%",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 25,
  };

  const frontModeToggleWrapperStyle: React.CSSProperties = {
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
  };

  const frontModeToggleHighlightStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "100%",
    borderRadius: isPortrait ? "7vw" : "3vw",
    background: themeTokens.glassHighlightBackground,
    boxShadow: themeTokens.glassHighlightShadow,
    zIndex: 0,
    ["--mode-fluid-color" as any]: themeTokens.highlightFluidColor,
    ["--mode-fluid-sheen" as any]: themeTokens.highlightFluidSheen,
    ["--mode-fluid-halo" as any]: themeTokens.highlightHaloShadow,
  };

  const frontModeToggleIconStyle: React.CSSProperties = {
    width: "auto",
    height: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: isPortrait ? "calc(1.4vw + 1.4vh)" : "calc(0.7vw + 0.7vh)",
    color: isDark ? "#999" : "#666",
    textAlign: "center",
    width: "100%",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: isPortrait ? "0.2vw" : "0.12vw",
  };

  const wordTextStyle: React.CSSProperties = {
    fontSize: isPortrait ? "calc(5vw + 5vh)" : "calc(2.5vw + 2vh)",
    fontWeight: "bold",
    color: isDark ? "#fff" : "#333",
    textAlign: "center",
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    width: "100%",
    height: "auto",
    gap: isPortrait ? "2.5vw" : "2vw",
    justifyContent: "center",
    alignItems: "center",
    padding: isPortrait ? "2.5vh 4vw 3vh" : "1.8vh 3vw 2vh",
    boxSizing: "border-box",
    flexShrink: 0,
    // 无边框无背景，与容器融合
    background: "transparent",
    borderRadius: 0,
    border: "none",
  };

  const buttonStyle: React.CSSProperties = {
    borderRadius: isPortrait ? "2vh" : "1vh",
    border: "none",
    fontSize: isPortrait
      ? "clamp(3vw, 1.2rem, 4vw)"
      : "clamp(0.8vw, 0.8rem, 1.2vw)",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    padding: isPortrait ? "2.4vh 4.8vw" : "1.2vh 2.4vw",
    minHeight: isPortrait ? "6vh" : "4.4vh",
    flex: "0 1 auto",
  };

  const resetButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: isDark
      ? "linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)"
      : "linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: isPortrait ? "2.8vh 6vw" : "1.4vh 3vw",
    minWidth: isPortrait ? "40vw" : "18vw",
  };

  const emptyStateContentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: isPortrait ? "4vh" : "2vh",
    height: "100%",
    padding: isPortrait ? "8vh 12vw" : "4vh 6vw",
    textAlign: "center",
    color: isDark ? "#ccc" : "#666",
  };

  const emptyStateTitleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "calc(3vw + 3vh)" : "calc(1.1vw + 1.1vh)",
    fontWeight: 600,
    color: isDark ? "#f0f0f0" : "#333",
    lineHeight: 1.6,
  };

  const resetFeedbackStyle: React.CSSProperties = {
    fontSize: isPortrait ? "calc(2.4vw + 2.4vh)" : "calc(0.8vw + 0.8vh)",
    color: isDark ? "#8E8E93" : "#666",
    maxWidth: isPortrait ? "70vw" : "28vw",
    lineHeight: 1.6,
  };

  const optionalContentStyle: React.CSSProperties = {
    display: "flex",
    width: "100%",
    paddingTop: "2%",
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };

  const buttonGroupItemStyle: React.CSSProperties = {
    ...buttonStyle,
    flex: isPortrait ? "1 1 0" : "0 0 auto",
    padding: isPortrait ? "2.2vh 0" : "1.2vh 2.4vw",
    width: "auto",
    minWidth: isPortrait ? 0 : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    ...(isPortrait
      ? {
          aspectRatio: "2.6 / 1",
        }
      : {}),
  };
  const switchModeItemButtonStyle: React.CSSProperties = {
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
  };
  const switchModeButtonClassName = "flashcard-mode-button";

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (highlightAnimationTimeoutRef.current) {
      window.clearTimeout(highlightAnimationTimeoutRef.current);
    }
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
  }, [isMeaningFront]);

  if (loading) {
    return (
      <div style={outerContainerStyle}>
        <CloseButton
          onClick={closePopup}
          iconColor={isDark ? "#fff" : "#333"}
        />
        <LoadingIndicator
          size="medium"
          message={t("loading")}
          style={{
            padding: "4vh 4vw",
          }}
        />
      </div>
    );
  }

  if (!currentWord || wordIds.length === 0) {
    return (
      <div data-test-id="div-test-25" style={outerContainerStyle}>
        <CloseButton
          data-test-id="closebutton-test-1"
          onClick={closePopup}
          iconColor={isDark ? "#fff" : "#333"}
        />
        <div data-test-id="div-test-24" style={emptyStateContentStyle}>
          <div data-test-id="div-test-23" style={emptyStateTitleStyle}>
            {t("allWordsMastered")}
          </div>
          {resetFeedback && (
            <div data-test-id="div-test-22" style={resetFeedbackStyle}>
              {resetFeedback}
            </div>
          )}
          <button
            data-test-id="button-test-5"
            style={{
              ...resetButtonStyle,
              opacity: isResetting ? 0.6 : 1,
              cursor: isResetting
                ? "not-allowed"
                : resetButtonStyle.cursor ?? "pointer",
            }}
            onClick={handleResetProgress}
            disabled={isResetting}
            onMouseEnter={(e) => {
              if (isResetting) return;
              e.currentTarget.style.transform = "translateY(-0.2vh)";
              e.currentTarget.style.boxShadow = isDark
                ? "0 0.4vh 1.2vh rgba(88, 86, 214, 0.45)"
                : "0 0.4vh 1.2vh rgba(90, 200, 250, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {isResetting ? t("resetting") : t("resetProgress")}
          </button>
        </div>
      </div>
    );
  }

  const hasMark = Boolean(currentWord.mark);
  const hasExample = Boolean(currentWord.example);
  const frontDisplayText = isMeaningFront
    ? (currentWord.meaning ? currentWord.meaning.trim() : "") || t("meaning")
    : (currentWord.kanji ? currentWord.kanji.trim() : "") ||
      (currentWord.kana ? currentWord.kana.trim() : "") ||
      t("word");
  const frontDisplayStyle: React.CSSProperties = isMeaningFront
    ? frontMeaningTextStyle
    : wordTextStyle;

  return (
    <div
      data-test-id="div-test-21"
      className="flashcard-container"
      style={outerContainerStyle}
      data-testid="FlashcardStudy-0"
    >
      <div
        data-test-id="div-test-20"
        style={{
          position: "absolute",
          top: isPortrait ? "1.5vh" : "1vh",
          right: isPortrait ? "4vw" : "2vw",
          zIndex: 10,
        }}
        data-testid="FlashcardStudy-1"
      >
        <CloseButton
          data-test-id="closebutton-test"
          onClick={closePopup}
          iconColor={isDark ? "#fff" : "#333"}
          size={isPortrait ? "6.7vw" : 40}
        />
      </div>
      <div
        data-test-id="div-test-19"
        className="flashcard-progress"
        style={{
          position: "absolute",
          top: isPortrait ? "1.5vh" : "1vh",
          left: isPortrait ? "4vw" : "2vw",
          zIndex: 10,
          fontSize: isPortrait ? "calc(1.8vw + 1.8vh)" : "calc(0.7vw + 0.7vh)",
        }}
        data-testid="FlashcardStudy-2"
      >
        <span style={{ opacity: 0.7 }}>📚</span>
        {currentIndex + 1} / {wordIds.length}
      </div>
      {/* 卡片容器包装 */}
      <div data-test-id="div-test-18" style={cardWrapperStyle}>
        <div
          data-test-id="flashcard-study-div-test-9"
          style={frontModeToggleContainerStyle}
        >
          <div
            data-test-id="flashcard-study-div-test-8"
            className="flashcard-mode-toggle-wrapper"
            style={frontModeToggleWrapperStyle}
            data-testid="FlashcardStudy-toggleMode"
          >
            <div
              data-test-id="flashcard-study-div-highlight"
              style={frontModeToggleHighlightStyle}
              className={`flashcard-mode-highlight ${
                isMeaningFront
                  ? "flashcard-mode-highlight--left"
                  : "flashcard-mode-highlight--right"
              } ${highlightAnimationClass}`}
              aria-hidden="true"
            />
            <button
              data-test-id="flashcard-study-button-test-1"
              type="button"
              className={switchModeButtonClassName}
              style={{
                ...switchModeItemButtonStyle,
                backgroundColor: "transparent",
                background: "transparent",
              }}
              onClick={() => handleChangeFrontMode("meaning")}
              title={t("flashcardFrontToggleToMeaning")}
              aria-pressed={isMeaningFront}
              aria-label={t("flashcardFrontToggleToMeaning")}
            >
              <div
                data-test-id="flashcard-study-div-test-6"
                style={frontModeToggleIconStyle}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={isPortrait ? "8vw" : "2vw"}
                  height={isPortrait ? "8vw" : "2vw"}
                  viewBox="0 0 24 24"
                >
                  <path
                    fill={
                      isMeaningFront
                        ? themeTokens.lightbulbActivePrimary
                        : themeTokens.lightbulbInactivePrimary
                    }
                    d="M14 20a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1zm1-3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-2c-1.8-1.18-3-3.2-3-5.5A6.5 6.5 0 0 1 11.5 3A6.5 6.5 0 0 1 18 9.5c0 2.3-1.2 4.32-3 5.5zm-6 0a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-2.6c1.78-.9 3-2.76 3-4.9A5.5 5.5 0 0 0 11.5 4A5.5 5.5 0 0 0 6 9.5c0 2.14 1.22 4 3 4.9z"
                  />
                  <path
                    fill={
                      isMeaningFront
                        ? themeTokens.lightbulbActiveAccent
                        : themeTokens.lightbulbInactiveAccent
                    }
                    d="M8.13 10.12l2.37-2.37l2 2L14.25 8l.71.71l-2.46 2.45l-2-2l-1.66 1.67z"
                  />
                </svg>
              </div>
            </button>
            <button
              data-test-id="flashcard-study-button-test"
              type="button"
              className={switchModeButtonClassName}
              style={{
                ...switchModeItemButtonStyle,
                backgroundColor: "transparent",
                background: "transparent",
              }}
              onClick={() => handleChangeFrontMode("writing")}
              title={t("flashcardFrontToggleToWriting")}
              aria-pressed={!isMeaningFront}
              aria-label={t("flashcardFrontToggleToWriting")}
            >
              <div
                data-test-id="flashcard-study-div-test-5"
                style={{
                  ...frontModeToggleIconStyle,
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
                      isMeaningFront
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
        {/* 3D卡片容器 */}
        <div
          data-test-id="div-test-17"
          style={card3DContainerStyle}
          className={`flashcard-3d-container ${showAnswer ? "flipped" : ""} ${
            isFlipping ? "flipping" : ""
          }`}
        >
          {/* 卡片正面（问题面） */}
          <div
            data-test-id="div-test-16"
            style={cardFaceStyle}
            className="flashcard-face-front flashcard-card"
            data-testid="FlashcardStudy-5"
          >
            <div
              data-test-id="div-test-15"
              style={{
                ...cardFaceContentStyle,
                gap: isMeaningFront
                  ? isPortrait
                    ? "1.6vh"
                    : "1.1vh"
                  : cardFaceContentStyle.gap,
                padding: isMeaningFront
                  ? isPortrait
                    ? "16vh 6vw 14vh"
                    : "8vh 5vw 6vh"
                  : isPortrait
                  ? "12vh 8vw 10vh"
                  : "6vh 5vw 5vh",
              }}
              data-testid="FlashcardStudy-6"
            >
              <div
                data-test-id={
                  isMeaningFront
                    ? "flashcard-study-div-test-4"
                    : "flashcard-study-div-test-2"
                }
                className="flashcard-word-main"
                style={frontDisplayStyle}
              >
                {frontDisplayText}
              </div>
            </div>
          </div>

          {/* 卡片背面（答案面） */}
          {(() => {
            // 固定高度的内容项样式（用于 kanji、kana、meaning）
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

            const showOptionalContent =
              !isMeaningFront && (hasExample || hasMark);
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
              marginTop: isPortrait ? "12%" : "8%", // 为切换按钮预留空间
            };

            // 可滚动的例句容器样式
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
              // 隐藏滚动条但保持滚动功能
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE/Edge
            };

            // 例句内容样式
            const exampleContentStyle: React.CSSProperties = {
              fontSize: isPortrait
                ? "calc(1.4vw + 1.4vh)"
                : "calc(0.6vw + 0.6vh)",
              color: isDark ? "#ccc" : "#666",
              fontStyle: "italic",
              lineHeight: "1.8",
              textAlign: "center",
              padding: isPortrait ? "0 4vw" : "0 2vw",
              width: "100%",
              boxSizing: "border-box",
              whiteSpace: "pre-line", // 保留换行符，自动换行
            };

            return (
              <div
                data-test-id="div-test-14"
                className="flashcard-back-container flashcard-face-back"
                style={{
                  ...cardBackStyle,
                  justifyContent: showOptionalContent ? "flex-start" : "center",
                }}
                data-testid="FlashcardStudy-answer"
              >
                {/* 内容包装器 - 防止内容被镜像 */}
                <div style={cardBackContentStyle}>
                  {/* 固定内容区域 */}
                  <div
                    data-test-id="div-test-13"
                    style={fixedContentContainerStyle}
                  >
                    {currentWord.kanji && (
                      <div
                        data-test-id="div-test-12"
                        style={fixedContentItemStyle}
                      >
                        <div data-test-id="div-test-11" style={labelStyle}>
                          {t("kanji")}
                        </div>
                        <div
                          data-test-id="div-test-10"
                          style={{
                            fontSize: isPortrait
                              ? "calc(2.2vw + 2.2vh)"
                              : "calc(2.3vw + 2vh)",
                            fontWeight: "bold",
                            color: isDark ? "#fff" : "#333",
                            marginTop: isPortrait ? 0 : "0.5vh",
                            wordBreak: "break-all",
                          }}
                        >
                          {currentWord.kanji}
                        </div>
                      </div>
                    )}
                    <div
                      data-test-id="div-test-9"
                      style={fixedContentItemStyle}
                    >
                      <div data-test-id="div-test-8" style={labelStyle}>
                        {t("kana")}
                      </div>
                      <div
                        data-test-id="div-test-7"
                        style={{
                          fontSize: isPortrait
                            ? "calc(2.2vw + 2.2vh)"
                            : "calc(1.6vw + 1.6vh)",
                          color: isDark ? "#fff" : "#333",
                          fontWeight: "500",
                          marginTop: isPortrait ? 0 : "0.5vh",
                          wordBreak: "break-all",
                        }}
                      >
                        {currentWord.kana}
                      </div>
                    </div>
                    {!isMeaningFront && (
                      <div
                        data-test-id="div-test-6"
                        style={fixedContentItemStyle}
                      >
                        <div data-test-id="div-test-5" style={labelStyle}>
                          {t("meaning")}
                        </div>
                        <div
                          data-test-id="div-test-4"
                          style={{
                            fontSize: isPortrait
                              ? "calc(1.2vw + 1.2vh)"
                              : "calc(1.1vw + 1.1vh)",
                            color: isDark ? "#ccc" : "#666",
                            marginTop: isPortrait ? 0 : "0.5vh",
                            lineHeight: "1.5",
                            textAlign: "center",
                            padding: isPortrait ? "0 3vw" : "0 2vw",
                            wordBreak: "break-word",
                          }}
                        >
                          {currentWord.meaning}
                        </div>
                      </div>
                    )}
                  </div>
                  {showOptionalContent && (
                    <div
                      data-test-id="flashcard-study-div-test"
                      style={optionalContentStyle}
                    >
                      {currentWord.example && (
                        <div
                          data-test-id="div-test-2"
                          style={{ ...labelStyle, margin: 0 }}
                        >
                          {t("example")}
                        </div>
                      )}
                      {/* 可滚动的例句区域 */}
                      {currentWord.example && (
                        <div
                          data-test-id="div-test-3"
                          style={exampleContainerStyle}
                          className="example-scroll-container"
                        >
                          <div
                            data-test-id="div-test-1"
                            style={exampleContentStyle}
                          >
                            {currentWord.example}
                          </div>
                        </div>
                      )}
                      {currentWord.mark && (
                        <div
                          data-test-id="div-test-mark"
                          style={fixedContentItemStyle}
                        >
                          <div
                            data-test-id="div-test-mark-label"
                            style={labelStyle}
                          >
                            {t("mark")}
                          </div>
                          <div
                            data-test-id="div-test-mark-content"
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
                            {currentWord.mark}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 按钮组 - 根据 showAnswer 状态显示不同按钮 */}
      <div
        data-test-id="div-test"
        className="flashcard-btn-group"
        style={buttonGroupStyle}
        data-testid="FlashcardStudy-buttonGroup"
      >
        {!showAnswer ? (
          <>
            <button
              data-test-id="button-test-4"
              className="flashcard-action-btn flashcard-action-btn--correct"
              style={buttonGroupItemStyle}
              onClick={() => handleResult("correct")}
              aria-label={t("learned") || "已掌握"}
              data-testid="FlashcardStudy-learned"
            >
              {t("learned")}
            </button>
            <button
              data-test-id="button-test-3"
              className="flashcard-action-btn flashcard-action-btn--show"
              style={buttonGroupItemStyle}
              onClick={handleShowAnswer}
              aria-label={t("showAnswer") || "显示答案"}
              aria-expanded={showAnswer}
              data-testid="FlashcardStudy-showAnswer"
            >
              {t("showAnswer")}
            </button>
          </>
        ) : (
          <>
            <button
              data-test-id="button-test-2"
              className="flashcard-action-btn flashcard-action-btn--correct"
              style={buttonGroupItemStyle}
              onClick={() => handleResult("correct")}
              aria-label={t("correct") || "正确"}
              data-testid="FlashcardStudy-22"
            >
              {t("correct")}
            </button>
            <button
              data-test-id="button-test-1"
              className="flashcard-action-btn flashcard-action-btn--wrong"
              style={buttonGroupItemStyle}
              onClick={() => handleResult("wrong")}
              aria-label={t("wrong") || "错误"}
              data-testid="FlashcardStudy-23"
            >
              {t("wrong")}
            </button>
            <button
              data-test-id="button-test"
              className="flashcard-action-btn flashcard-action-btn--skip"
              style={buttonGroupItemStyle}
              onClick={() => handleResult("skip")}
              aria-label={t("skip") || "跳过"}
              data-testid="FlashcardStudy-24"
            >
              {t("skip")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
