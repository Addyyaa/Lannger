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
import { scheduleTestWords } from "../algorithm";
import { updateWordProgress } from "../algorithm";
import CloseButton from "./CloseButton";
import { handleError, handleErrorSync } from "../utils/errorHandler";
import { performanceMonitor } from "../utils/performanceMonitor";
import {
  getThemeTokens,
  getContainerStyle,
  getCardStyle,
} from "../utils/themeTokens";
import LoadingIndicator from "./LoadingIndicator";

interface TestStudyProps {
  closePopup: () => void;
  wordSetId?: number;
  onSessionComplete?: (stats: {
    studiedCount: number;
    correctCount: number;
    wrongCount: number;
  }) => void;
}

/**
 * 测试题目类型
 */
type QuestionMode = "word-to-meaning" | "meaning-to-word";

/**
 * 测试选项
 */
interface TestOption {
  word: Word;
  isCorrect: boolean;
}

/**
 * 测试会话统计
 */
interface TestSessionStats {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  averageTime: number;
  wrongAnswers: Array<{
    wordId: number;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    questionMode: QuestionMode;
  }>;
  responseTimes: number[];
}

/**
 * 测试学习组件
 */
export default function TestStudy({
  closePopup,
  wordSetId,
  onSessionComplete,
}: TestStudyProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

  // 状态管理
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [wordIds, setWordIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questionMode, setQuestionMode] =
    useState<QuestionMode>("word-to-meaning");
  const [options, setOptions] = useState<TestOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30); // 默认30秒
  const [isPaused, setIsPaused] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState<TestSessionStats>({
    totalQuestions: 0,
    correctCount: 0,
    wrongCount: 0,
    averageTime: 0,
    wrongAnswers: [],
    responseTimes: [],
  });

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCompleteCalledRef = useRef(false);
  const hasInitializedRef = useRef(false);

  /**
   * 生成选项（4个选项：1个正确答案 + 3个干扰项）
   */
  const generateOptions = useCallback(
    async (correctWord: Word, allWords: Word[]): Promise<TestOption[]> => {
      try {
        // 从同一单词集中选择干扰项
        const sameSetWords = allWords.filter(
          (w) => w.id !== correctWord.id && w.setId === correctWord.setId
        );

        // 如果同一单词集的单词不足3个，从所有单词中补充
        let distractors: Word[] = [];
        if (sameSetWords.length >= 3) {
          // 随机选择3个干扰项
          const shuffled = [...sameSetWords].sort(() => Math.random() - 0.5);
          distractors = shuffled.slice(0, 3);
        } else {
          // 从同一单词集选择所有可用单词
          distractors = [...sameSetWords];
          // 从所有单词中补充
          const otherWords = allWords.filter(
            (w) =>
              w.id !== correctWord.id && !distractors.some((d) => d.id === w.id)
          );
          const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
          const needed = 3 - distractors.length;
          distractors.push(...shuffled.slice(0, needed));
        }

        // 确保有4个选项
        const allOptions: TestOption[] = [
          { word: correctWord, isCorrect: true },
          ...distractors
            .slice(0, 3)
            .map((w) => ({ word: w, isCorrect: false })),
        ];

        // 随机打乱选项顺序
        const shuffled = allOptions.sort(() => Math.random() - 0.5);

        return shuffled;
      } catch (error) {
        handleErrorSync(error, { operation: "generateOptions" });
        return [{ word: correctWord, isCorrect: true }];
      }
    },
    []
  );

  /**
   * 加载单词列表
   */
  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      const endMeasure = performanceMonitor.start("loadTestWords");

      // 根据掌握程度自动决定测试的单词和数量
      // 优先测试掌握程度中等的单词（0.2-0.8），这些单词最需要巩固
      // 也包含一些掌握程度低的单词（0-0.3），需要加强练习
      // 排除掌握程度很高的单词（> 0.9），除非单词数量不足
      // limit 不指定，让调度器根据掌握程度自动计算合适的数量
      const result = await scheduleTestWords({
        wordSetId,
        // limit 不指定，根据掌握程度自动计算（10-50题之间动态调整）
        masteryRange: [0, 0.95], // 允许测试掌握程度在 0-0.95 之间的单词
        excludeTooEasy: true, // 排除太简单的单词（掌握程度 > 0.9 且见过多次）
        excludeTooHard: false, // 不排除太难的单词，让用户有机会练习
      });

      endMeasure({ wordSetId, count: result.wordIds.length });

      if (result.wordIds.length === 0) {
        handleError(
          new Error(t("noWordsToTest") || "没有可测试的单词"),
          { operation: "loadTestWords", wordSetId },
          true
        );
        closePopup();
        return;
      }

      setWordIds(result.wordIds);
      setCurrentIndex(0);
      setSessionStats({
        totalQuestions: result.wordIds.length,
        correctCount: 0,
        wrongCount: 0,
        averageTime: 0,
        wrongAnswers: [],
        responseTimes: [],
      });
      // 重置完成标志（只在主动重新开始时重置，测试完成时不应重置）
      // 注意：不要在这里重置 testComplete，只有在 onRetry 时才重置
      if (!testComplete) {
        sessionCompleteCalledRef.current = false;
      }
    } catch (error) {
      handleErrorSync(error, { operation: "loadTestWords" });
    } finally {
      setLoading(false);
    }
  }, [wordSetId, closePopup]);

  /**
   * 加载当前题目
   */
  const loadCurrentQuestion = useCallback(async () => {
    if (currentIndex >= wordIds.length) {
      // 测试完成
      setTestComplete(true);
      return;
    }

    try {
      const wordId = wordIds[currentIndex];
      const word = await dbOperator.getWord(wordId);

      if (!word) {
        // 如果单词不存在，跳过
        if (currentIndex < wordIds.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setTestComplete(true);
        }
        return;
      }

      setCurrentWord(word);
      setSelectedOption(null);
      setShowResult(false);
      setTimeLeft(30);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      // 随机选择题目模式
      const mode: QuestionMode =
        Math.random() > 0.5 ? "word-to-meaning" : "meaning-to-word";
      setQuestionMode(mode);

      // 获取所有单词用于生成选项
      const allWords =
        wordSetId !== undefined
          ? await dbOperator.getWordsByWordSet(wordSetId)
          : await dbOperator.getAllWords();

      if (!allWords || allWords.length === 0) {
        console.warn("没有找到单词数据用于生成选项");
      }

      // 生成选项
      const generatedOptions = await generateOptions(word, allWords);
      setOptions(generatedOptions);
    } catch (error) {
      handleErrorSync(error, { operation: "loadCurrentQuestion" });
    }
  }, [currentIndex, wordIds, wordSetId, generateOptions]);

  /**
   * 倒计时效果
   */
  useEffect(() => {
    if (testComplete || loading || !currentWord || isPaused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timeLeft <= 0) {
      // 时间到，自动标记为错误
      handleTimeout();
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, testComplete, loading, currentWord, isPaused]);

  /**
   * 超时处理
   */
  const handleTimeout = useCallback(async () => {
    if (!currentWord) return;

    setIsPaused(true);
    setShowResult(true);
    setIsCorrect(false);
    setSelectedOption(null);

    // 记录错误答案
    const responseTime = 30000; // 超时时间
    const question =
      questionMode === "word-to-meaning"
        ? `${currentWord.kanji || currentWord.kana}`
        : currentWord.meaning;
    const correctAnswer =
      questionMode === "word-to-meaning"
        ? currentWord.meaning
        : `${currentWord.kanji || currentWord.kana}`;

    setSessionStats((prev) => {
      const newStats = {
        ...prev,
        wrongCount: prev.wrongCount + 1,
        wrongAnswers: [
          ...prev.wrongAnswers,
          {
            wordId: currentWord.id,
            question,
            userAnswer: t("timeout") || "超时",
            correctAnswer,
            questionMode,
          },
        ],
        responseTimes: [...prev.responseTimes, responseTime],
      };

      // 计算平均时间
      const totalTime = newStats.responseTimes.reduce((sum, t) => sum + t, 0);
      newStats.averageTime =
        newStats.responseTimes.length > 0
          ? Math.round(totalTime / newStats.responseTimes.length)
          : 0;

      return newStats;
    });

    // 更新单词进度
    await updateWordProgress(
      currentWord.id,
      "wrong",
      "test",
      undefined,
      responseTime
    );

    // 1秒后进入下一题
    setTimeout(() => {
      if (currentIndex < wordIds.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setTestComplete(true);
      }
    }, 1000);
  }, [currentWord, questionMode, currentIndex, wordIds.length]);

  /**
   * 处理选项选择
   */
  const handleSelectOption = useCallback(
    async (optionIndex: number) => {
      if (showResult || !currentWord) return;

      setIsPaused(true);
      setSelectedOption(optionIndex);
      setShowResult(true);

      const selectedOptionData = options[optionIndex];
      const correct = selectedOptionData.isCorrect;

      setIsCorrect(correct);

      const responseTime = Date.now() - startTimeRef.current;

      // 更新统计
      setSessionStats((prev) => {
        const newStats = {
          ...prev,
          // totalQuestions 不应该递增，应该在 loadWords 时设置
          correctCount: correct ? prev.correctCount + 1 : prev.correctCount,
          wrongCount: correct ? prev.wrongCount : prev.wrongCount + 1,
          responseTimes: [...prev.responseTimes, responseTime],
        };

        // 计算平均时间
        const totalTime = newStats.responseTimes.reduce((sum, t) => sum + t, 0);
        newStats.averageTime =
          newStats.responseTimes.length > 0
            ? Math.round(totalTime / newStats.responseTimes.length)
            : 0;

        // 记录错题
        if (!correct) {
          const question =
            questionMode === "word-to-meaning"
              ? `${currentWord.kanji || currentWord.kana}`
              : currentWord.meaning;
          const userAnswer =
            questionMode === "word-to-meaning"
              ? selectedOptionData.word.meaning
              : `${
                  selectedOptionData.word.kanji || selectedOptionData.word.kana
                }`;
          const correctAnswer =
            questionMode === "word-to-meaning"
              ? currentWord.meaning
              : `${currentWord.kanji || currentWord.kana}`;

          newStats.wrongAnswers = [
            ...prev.wrongAnswers,
            {
              wordId: currentWord.id,
              question,
              userAnswer,
              correctAnswer,
              questionMode,
            },
          ];
        }

        return newStats;
      });

      // 更新单词进度
      await updateWordProgress(
        currentWord.id,
        correct ? "correct" : "wrong",
        "test",
        undefined,
        responseTime
      );

      // 1秒后进入下一题
      setTimeout(() => {
        if (currentIndex < wordIds.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setTestComplete(true);
        }
      }, 1000);
    },
    [
      showResult,
      currentWord,
      options,
      questionMode,
      currentIndex,
      wordIds.length,
    ]
  );

  /**
   * 初始化加载（只在组件挂载时执行一次）
   */
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadWords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  /**
   * 当前题目变化时加载新题目
   */
  useEffect(() => {
    if (!loading && wordIds.length > 0) {
      loadCurrentQuestion();
    }
  }, [currentIndex, wordIds, loading, loadCurrentQuestion]);

  /**
   * 测试完成处理
   */
  useEffect(() => {
    if (
      testComplete &&
      sessionStats.totalQuestions > 0 &&
      !sessionCompleteCalledRef.current
    ) {
      sessionCompleteCalledRef.current = true;
      if (onSessionComplete) {
        onSessionComplete({
          studiedCount: sessionStats.totalQuestions,
          correctCount: sessionStats.correctCount,
          wrongCount: sessionStats.wrongCount,
        });
      }
    }
  }, [testComplete, sessionStats, onSessionComplete]);

  // 使用共享主题令牌（与 FlashcardStudy 和 ReviewStudy 保持一致）
  const themeTokens = useMemo(() => getThemeTokens(isDark), [isDark]);

  const containerStyle: React.CSSProperties = useMemo(
    () => getContainerStyle(themeTokens, isPortrait),
    [themeTokens, isPortrait]
  );

  const cardStyle: React.CSSProperties = useMemo(
    () => getCardStyle(themeTokens, isPortrait),
    [themeTokens, isPortrait]
  );

  // 如果测试完成，显示结果
  if (testComplete) {
    return (
      <TestResultModal
        stats={sessionStats}
        onRetry={() => {
          // 重置所有状态
          sessionCompleteCalledRef.current = false;
          hasInitializedRef.current = false;
          setTestComplete(false);
          setCurrentIndex(0);
          loadWords();
        }}
        onClose={closePopup}
        isDark={isDark}
        isPortrait={isPortrait}
        t={t}
      />
    );
  }

  // 加载中
  if (loading || !currentWord || options.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <LoadingIndicator
            size="medium"
            message={t("loading")}
            style={{
              padding: "4vh 4vw",
            }}
          />
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

        {/* 进度显示 */}
        <div
          style={{
            textAlign: "center",
            marginBottom: isPortrait ? "4vw" : "1.5vw",
            fontSize: isPortrait ? "3.5vw" : "1vw",
            color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
            fontWeight: 500,
          }}
        >
          {t("progress") || "进度"}: {currentIndex + 1} / {wordIds.length}
        </div>

        {/* 倒计时显示 */}
        <div
          style={{
            textAlign: "center",
            marginBottom: isPortrait ? "4vw" : "1.5vw",
          }}
        >
          <div
            style={{
              fontSize: isPortrait ? "6vw" : "2vw",
              fontWeight: "bold",
              color: timeLeft <= 10 ? "#ff4444" : "#00b4ff",
              transition: "color 0.3s ease",
            }}
          >
            ⏱️ {timeLeft}s
          </div>
          {/* 圆形进度条 */}
          <div
            style={{
              width: isPortrait ? "15vw" : "5vw",
              height: isPortrait ? "15vw" : "5vw",
              margin: `${isPortrait ? "2vw" : "0.5vw"} auto`,
              borderRadius: "50%",
              border: `${isPortrait ? "0.5vw" : "0.2vw"} solid ${
                timeLeft <= 10 ? "#ff4444" : "#00b4ff"
              }`,
              borderTopColor: "transparent",
              transform: `rotate(${((30 - timeLeft) / 30) * 360 - 90}deg)`,
              transition: "transform 0.3s ease, border-color 0.3s ease",
            }}
          />
        </div>

        {/* 题目显示 */}
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
          }}
        >
          <div
            style={{
              fontSize: isPortrait ? "4vw" : "1.2vw",
              fontWeight: 600,
              color: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
              marginBottom: isPortrait ? "2vw" : "1vw",
            }}
          >
            {questionMode === "word-to-meaning"
              ? t("selectMeaning") || "请选择对应的意思"
              : t("selectWord") || "请选择对应的单词"}
          </div>
          <div
            style={{
              fontSize: isPortrait ? "6vw" : "2.5vw",
              fontWeight: 700,
              color: "#00b4ff",
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {questionMode === "word-to-meaning"
              ? currentWord.kanji || currentWord.kana
              : currentWord.meaning}
          </div>
        </div>

        {/* 选项列表 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isPortrait ? "1fr" : "repeat(2, 1fr)",
            gap: isPortrait ? "3vw" : "1vw",
            marginBottom: isPortrait ? "4vw" : "1.5vw",
          }}
        >
          {options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrectOption = option.isCorrect;

            let optionBgColor = isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.02)";
            let optionBorderColor = isDark ? "#555" : "#e0e0e0";
            let optionColor = isDark ? "#fff" : "#333";

            if (showResult) {
              if (isCorrectOption) {
                optionBgColor = "rgba(0, 255, 0, 0.2)";
                optionBorderColor = "#00ff00";
              } else if (isSelected && !isCorrectOption) {
                optionBgColor = "rgba(255, 0, 0, 0.2)";
                optionBorderColor = "#ff4444";
              }
            } else if (isSelected) {
              optionBgColor = "rgba(0, 180, 255, 0.2)";
              optionBorderColor = "#00b4ff";
            }

            return (
              <button
                key={option.word.id}
                onClick={() => handleSelectOption(index)}
                disabled={showResult}
                style={{
                  padding: isPortrait ? "4vw 3vw" : "1.5vw 1.2vw",
                  background: optionBgColor,
                  border: `${
                    isPortrait ? "0.3vw" : "0.12vw"
                  } solid ${optionBorderColor}`,
                  borderRadius: isPortrait ? "2vw" : "0.6vw",
                  cursor: showResult ? "default" : "pointer",
                  fontSize: isPortrait ? "4vw" : "1.2vw",
                  color: optionColor,
                  fontWeight: 500,
                  textAlign: "center",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  opacity:
                    showResult && !isSelected && !isCorrectOption ? 0.5 : 1,
                  boxShadow:
                    isSelected && !showResult
                      ? isDark
                        ? "0 0.5vw 1.5vw rgba(0, 180, 255, 0.3)"
                        : "0 0.5vw 1.5vw rgba(0, 180, 255, 0.2)"
                      : "none",
                }}
                onMouseEnter={(e) => {
                  if (!showResult) {
                    e.currentTarget.style.transform =
                      "translateY(-2px) scale(1.02)";
                    e.currentTarget.style.boxShadow = isDark
                      ? "0 0.8vw 2vw rgba(0, 180, 255, 0.35)"
                      : "0 0.8vw 2vw rgba(0, 180, 255, 0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showResult) {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = isSelected
                      ? isDark
                        ? "0 0.5vw 1.5vw rgba(0, 180, 255, 0.3)"
                        : "0 0.5vw 1.5vw rgba(0, 180, 255, 0.2)"
                      : "none";
                  }
                }}
              >
                {questionMode === "word-to-meaning"
                  ? option.word.meaning
                  : option.word.kanji || option.word.kana}
                {showResult &&
                  (isCorrectOption || (isSelected && !isCorrectOption)) && (
                    <span style={{ marginLeft: isPortrait ? "2vw" : "0.5vw" }}>
                      {isCorrectOption ? "✅" : "❌"}
                    </span>
                  )}
              </button>
            );
          })}
        </div>

        {/* 结果显示 */}
        {showResult && (
          <div
            style={{
              textAlign: "center",
              fontSize: isPortrait ? "4.5vw" : "1.5vw",
              fontWeight: "bold",
              color: isCorrect ? "#00ff00" : "#ff4444",
              marginTop: isPortrait ? "4vw" : "1.5vw",
            }}
          >
            {isCorrect ? t("correct") || "✅ 正确！" : t("wrong") || "❌ 错误"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 测试结果弹窗组件
 */
function TestResultModal({
  stats,
  onRetry,
  onClose,
  isDark,
  isPortrait,
  t,
}: {
  stats: TestSessionStats;
  onRetry: () => void;
  onClose: () => void;
  isDark: boolean;
  isPortrait: boolean;
  t: (key: string) => string;
}) {
  const [showWrongAnswers, setShowWrongAnswers] = useState(false);

  const correctRate =
    stats.totalQuestions > 0
      ? Math.round((stats.correctCount / stats.totalQuestions) * 100)
      : 0;

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: isPortrait ? "5vw" : "2vw",
  };

  const modalStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    borderRadius: isPortrait ? "3vw" : "1vw",
    padding: isPortrait ? "6vw" : "3vw",
    maxWidth: isPortrait ? "90%" : "600px",
    width: "100%",
    maxHeight: isPortrait ? "80vh" : "80vh",
    overflowY: "auto",
    boxShadow: isDark
      ? "0 2vw 8vw rgba(0, 0, 0, 0.5)"
      : "0 1vw 4vw rgba(0, 0, 0, 0.1)",
    border: isDark ? "0.3vw solid #444" : "0.1vw solid #e0e0e0",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "5vw" : "2vw",
    fontWeight: "bold",
    color: "#00b4ff",
    marginBottom: isPortrait ? "4vw" : "1.5vw",
    textAlign: "center",
  };

  const statItemStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    padding: isPortrait ? "2.5vw" : "1vw",
    marginBottom: isPortrait ? "2vw" : "0.5vw",
    background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
    borderRadius: isPortrait ? "1.5vw" : "0.5vw",
    fontSize: isPortrait ? "3.5vw" : "1.2vw",
    color: isDark ? "#fff" : "#333",
  };

  const buttonStyle: React.CSSProperties = {
    padding: isPortrait ? "3vw 6vw" : "1vw 2vw",
    fontSize: isPortrait ? "4vw" : "1.2vw",
    backgroundColor: "#00b4ff",
    color: "#fff",
    border: "none",
    borderRadius: isPortrait ? "2vw" : "0.5vw",
    cursor: "pointer",
    fontWeight: "500",
    margin: isPortrait ? "2vw" : "0.5vw",
    transition: "all 0.3s ease",
  };

  return (
    <div style={containerStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>{t("sessionComplete") || "测试完成"}</h2>

        <div style={statItemStyle}>
          <span>{t("totalQuestions") || "总题数"}:</span>
          <span style={{ fontWeight: "bold" }}>{stats.totalQuestions}</span>
        </div>

        <div style={statItemStyle}>
          <span>{t("correctCount") || "答对"}:</span>
          <span style={{ fontWeight: "bold", color: "#00ff00" }}>
            {stats.correctCount}
          </span>
        </div>

        <div style={statItemStyle}>
          <span>{t("wrongCount") || "答错"}:</span>
          <span style={{ fontWeight: "bold", color: "#ff4444" }}>
            {stats.wrongCount}
          </span>
        </div>

        <div style={statItemStyle}>
          <span>{t("correctRate") || "正确率"}:</span>
          <span style={{ fontWeight: "bold", color: "#00b4ff" }}>
            {correctRate}%
          </span>
        </div>

        <div style={statItemStyle}>
          <span>{t("averageTime") || "平均答题时间"}:</span>
          <span style={{ fontWeight: "bold" }}>
            {Math.round(stats.averageTime / 1000)}s
          </span>
        </div>

        {stats.wrongAnswers.length > 0 && (
          <div style={{ marginTop: isPortrait ? "4vw" : "1.5vw" }}>
            <button
              onClick={() => setShowWrongAnswers(!showWrongAnswers)}
              style={{
                ...buttonStyle,
                backgroundColor: "transparent",
                border: `1px solid ${isDark ? "#555" : "#e0e0e0"}`,
                color: isDark ? "#fff" : "#333",
                width: "100%",
              }}
            >
              {showWrongAnswers
                ? t("hideWrongAnswers") || "隐藏错题"
                : t("showWrongAnswers") ||
                  `查看错题 (${stats.wrongAnswers.length})`}
            </button>

            {showWrongAnswers && (
              <div
                style={{
                  marginTop: isPortrait ? "3vw" : "1vw",
                  maxHeight: isPortrait ? "40vh" : "300px",
                  overflowY: "auto",
                }}
              >
                {stats.wrongAnswers.map((wrong, index) => (
                  <div
                    key={index}
                    style={{
                      padding: isPortrait ? "3vw" : "1.2vw",
                      marginBottom: isPortrait ? "2.5vw" : "0.8vw",
                      background: isDark
                        ? "rgba(255, 68, 68, 0.15)"
                        : "rgba(255, 68, 68, 0.08)",
                      borderRadius: isPortrait ? "2vw" : "0.6vw",
                      fontSize: isPortrait ? "3.2vw" : "1vw",
                      border: isDark
                        ? "1px solid rgba(255, 68, 68, 0.3)"
                        : "1px solid rgba(255, 68, 68, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: isPortrait ? "2vw" : "0.8vw",
                        color: isDark ? "#fff" : "#333",
                        fontSize: isPortrait ? "3.5vw" : "1.1vw",
                      }}
                    >
                      {t("question") || "题目"}: {wrong.question}
                    </div>
                    <div
                      style={{
                        color: "#ff4444",
                        marginBottom: isPortrait ? "1.5vw" : "0.6vw",
                        display: "flex",
                        alignItems: "center",
                        gap: isPortrait ? "1.5vw" : "0.5vw",
                      }}
                    >
                      <span style={{ fontSize: isPortrait ? "4vw" : "1.2vw" }}>
                        ❌
                      </span>
                      <span>
                        {t("yourAnswer") || "您的答案"}:{" "}
                        <strong>{wrong.userAnswer}</strong>
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#00b4ff",
                        display: "flex",
                        alignItems: "center",
                        gap: isPortrait ? "1.5vw" : "0.5vw",
                      }}
                    >
                      <span style={{ fontSize: isPortrait ? "4vw" : "1.2vw" }}>
                        ✅
                      </span>
                      <span>
                        {t("correctAnswer") || "正确答案"}:{" "}
                        <strong>{wrong.correctAnswer}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: isPortrait ? "5vw" : "2vw",
          }}
        >
          <button
            onClick={onRetry}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0096d4";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#00b4ff";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {t("retry") || "重新测试"}
          </button>
          <button
            onClick={onClose}
            style={{
              ...buttonStyle,
              backgroundColor: isDark ? "#555" : "#e0e0e0",
              color: isDark ? "#fff" : "#333",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? "#666"
                : "#d0d0d0";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? "#555"
                : "#e0e0e0";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {t("back") || "返回"}
          </button>
        </div>
      </div>
    </div>
  );
}
