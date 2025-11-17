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
import { handleError } from "../utils/errorHandler";
import { performanceMonitor } from "../utils/performanceMonitor";

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

  // 状态管理
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [wordIds, setWordIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardFrontMode, setCardFrontMode] = useState<CardFrontMode>("writing");
  const [loading, setLoading] = useState(true);
  const currentReviewStage = reviewStage || 1;

  const createInitialStats = () => ({
    studiedCount: 0,
    correctCount: 0,
    wrongCount: 0,
  });

  const [sessionStats, setSessionStats] = useState(createInitialStats);
  const startTimeRef = useRef<number>(Date.now());

  /**
   * 加载复习单词列表
   */
  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      const endMeasure = performanceMonitor.start("loadReviewWords");

      const result = await scheduleReviewWords({
        wordSetId,
        limit: 50, // 复习模式默认50个单词
        onlyDue: true, // 只返回到期的单词
      });

      endMeasure({ wordSetId, count: result.wordIds.length });

      if (result.wordIds.length === 0) {
        handleError(
          new Error("没有需要复习的单词"),
          { operation: "loadReviewWords", wordSetId },
          true
        );
        closePopup();
        return;
      }

      setWordIds(result.wordIds);
      setCurrentIndex(0);

      // 设置复习锁定
      if (wordSetId !== undefined) {
        await setReviewLock(wordSetId, currentReviewStage);
      }
    } catch (error) {
      handleError(error, { operation: "loadReviewWords" });
    } finally {
      setLoading(false);
    }
  }, [wordSetId, currentReviewStage, closePopup]);

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
   * 处理复习完成
   */
  const handleReviewComplete = async () => {
    try {
      // 完成当前复习阶段
      if (wordSetId !== undefined) {
        await completeReviewStage(wordSetId);
      }

      // 解除复习锁定
      await clearReviewLock();

      // 调用完成回调
      if (onSessionComplete) {
        onSessionComplete(sessionStats);
      }

      closePopup();
    } catch (error) {
      handleError(error, { operation: "handleReviewComplete" });
    }
  };

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

    // 更新统计
    setSessionStats((prev) => ({
      studiedCount: prev.studiedCount + 1,
      correctCount:
        result === "correct" ? prev.correctCount + 1 : prev.correctCount,
      wrongCount: result === "wrong" ? prev.wrongCount + 1 : prev.wrongCount,
    }));

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
   * 初始化加载
   */
  useEffect(() => {
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

  // 样式定义（与 FlashcardStudy 保持一致）
  const themeTokens = useMemo(() => {
    if (isDark) {
      return {
        containerGradient:
          "linear-gradient(135deg, rgba(28, 28, 30, 0.96) 0%, rgba(44, 44, 46, 0.92) 100%)",
        containerBorderColor: "rgba(118, 118, 128, 0.35)",
        containerShadowPortrait: "0 4vw 8vw rgba(0, 0, 0, 0.55)",
        containerShadowLandscape: "0 1.5vw 3vw rgba(0, 0, 0, 0.55)",
        cardSurface:
          "linear-gradient(160deg, rgba(50, 50, 52, 0.7) 0%, rgba(30, 30, 32, 0.5) 100%)",
        cardBorderColor: "rgba(255, 255, 255, 0.08)",
        cardShadowPortrait: "0 2.5vw 6vw rgba(0, 0, 0, 0.45)",
        cardShadowLandscape: "0 1vw 2.5vw rgba(0, 0, 0, 0.45)",
      };
    }
    return {
      containerGradient:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(243, 246, 255, 0.92) 100%)",
      containerBorderColor: "rgba(141, 153, 174, 0.25)",
      containerShadowPortrait: "0 4vw 8vw rgba(15, 23, 42, 0.15)",
      containerShadowLandscape: "0 1.5vw 3vw rgba(15, 23, 42, 0.12)",
      cardSurface:
        "linear-gradient(160deg, rgba(255, 255, 255, 0.88) 0%, rgba(235, 242, 255, 0.6) 100%)",
      cardBorderColor: "rgba(120, 144, 156, 0.16)",
      cardShadowPortrait: "0 2.5vw 6vw rgba(15, 23, 42, 0.12)",
      cardShadowLandscape: "0 1vw 2.5vw rgba(15, 23, 42, 0.1)",
    };
  }, [isDark]);

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: themeTokens.containerGradient,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: isPortrait ? "5vw" : "2vw",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    background: themeTokens.cardSurface,
    borderRadius: isPortrait ? "4vw" : "1.5vw",
    padding: isPortrait ? "8vw" : "3vw",
    maxWidth: isPortrait ? "90%" : "700px",
    width: "100%",
    boxShadow: isPortrait
      ? themeTokens.cardShadowPortrait
      : themeTokens.cardShadowLandscape,
    border: `${isPortrait ? "0.3vw" : "0.1vw"} solid ${themeTokens.cardBorderColor}`,
    position: "relative",
    minHeight: isPortrait ? "60vh" : "400px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  };

  // 加载中
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

        {/* 复习阶段显示 */}
        <div
          style={{
            textAlign: "center",
            marginBottom: isPortrait ? "4vw" : "1.5vw",
            fontSize: isPortrait ? "3.5vw" : "1vw",
            color: "#00b4ff",
            fontWeight: "bold",
          }}
        >
          {getReviewStageDescription(currentReviewStage)}
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
            border: `${isPortrait ? "0.2vw" : "0.08vw"} solid ${themeTokens.cardBorderColor}`,
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

        {/* 操作按钮（与 FlashcardStudy 保持一致） */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            width: "100%",
            height: "auto",
            bottom: 0,
            gap: isPortrait ? "2.5vw" : "2vw",
            justifyContent: "center",
            alignItems: "center",
            padding: isPortrait ? "0 2vw 2vh 2vw" : "0 0 1% 0",
            zIndex: 20,
            boxSizing: "border-box",
          }}
        >
          {!showAnswer ? (
            <>
              <button
                onClick={() => setShowAnswer(true)}
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
              <button
                onClick={() =>
                  handleChangeFrontMode(
                    cardFrontMode === "writing" ? "meaning" : "writing"
                  )
                }
                style={{
                  borderRadius: isPortrait ? "2vh" : "1vh",
                  border: `1px solid ${isDark ? "#555" : "#e0e0e0"}`,
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
                  backgroundColor: "transparent",
                  color: isDark ? "#fff" : "#333",
                  ...(isPortrait ? { aspectRatio: "2.6 / 1" } : {}),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-0.2vh)";
                  e.currentTarget.style.backgroundColor = isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {cardFrontMode === "writing"
                  ? t("flashcardFrontToggleToMeaning") || "切换为意思提示"
                  : t("flashcardFrontToggleToWriting") || "切换为汉字提示"}
              </button>
            </>
          ) : (
            <>
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
                  border: `1px solid ${isDark ? "#555" : "#e0e0e0"}`,
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
                  backgroundColor: "transparent",
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

