import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import { db, StudyMode, UserSettings, DailyStat, ensureDBOpen } from "../db";
import ComponentAsModel from "../utils/componentAsModel";
import WordSetSelector from "../components/WordSetSelector";
import FlashcardStudy from "../components/FlashcardStudy";
import TestStudy from "../components/TestStudy";
import ReviewStudy from "../components/ReviewStudy";
import ReviewNotification from "../components/ReviewNotification";
import { canStartReview } from "../utils/reviewLock";
import { getReviewPlan } from "../store/reviewStore";

export default function Study() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  const [studyStats, setStudyStats] = useState({
    totalWords: 0,
    studiedToday: 0,
    currentStreak: 0,
    dailyGoal: 20,
    goalProgress: 0,
  });
  const [showWordSetSelector, setShowWordSetSelector] = useState(false);
  const [showFlashcardStudy, setShowFlashcardStudy] = useState(false);
  const [showTestStudy, setShowTestStudy] = useState(false);
  const [showReviewStudy, setShowReviewStudy] = useState(false);
  const [showReviewNotification, setShowReviewNotification] = useState(true);
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null);
  const [selectedWordSetId, setSelectedWordSetId] = useState<
    number | undefined
  >(undefined);
  const [selectedReviewStage, setSelectedReviewStage] = useState<
    number | undefined
  >(undefined);

  useEffect(() => {
    loadStudyStats();
    checkReviewNotificationsOnStart();

    // 监听窗口焦点，刷新统计数据并检查复习通知
    const handleFocus = () => {
      loadStudyStats();
      checkReviewNotificationsOnStart();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  /**
   * 应用启动时检查复习通知
   */
  const checkReviewNotificationsOnStart = async () => {
    try {
      const { getDueReviewPlans } = await import("../store/reviewStore");
      const { canStartReview } = await import("../utils/reviewLock");

      const duePlans = await getDueReviewPlans();
      if (duePlans.length > 0) {
        // 检查是否有可以开始的复习（没有锁定或锁定的就是第一个）
        const firstPlan = duePlans[0];
        const canReview = await canStartReview(firstPlan.wordSetId);

        // 如果有可以开始的复习，或者当前锁定的就是第一个，则显示通知
        if (
          canReview.allowed ||
          (canReview.lockInfo &&
            canReview.lockInfo.wordSetId === firstPlan.wordSetId)
        ) {
          setShowReviewNotification(true);
        }
      }
    } catch (error) {
      console.error("检查复习通知失败:", error);
    }
  };

  const loadStudyStats = async () => {
    try {
      // 确保数据库已打开
      await ensureDBOpen();
      // 获取单词总数
      const totalWords = await db.words.count();

      // 获取用户设置
      let userSettings = await db.userSettings.get(1);
      if (!userSettings) {
        // 如果不存在，创建默认设置
        userSettings = {
          id: 1,
          currentMode: "flashcard",
          dailyGoal: 20,
          currentStreak: 0,
          longestStreak: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as UserSettings;
        await db.userSettings.put(userSettings);
      }

      // 获取今日统计
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      let dailyStat = await db.dailyStats.get(today);
      if (!dailyStat) {
        dailyStat = {
          date: today,
          learnedCount: 0,
          reviewedCount: 0,
          testedCount: 0,
          correctCount: 0,
          goal: userSettings.dailyGoal,
          updatedAt: new Date().toISOString(),
        } as DailyStat;
        await db.dailyStats.put(dailyStat);
      }

      // 计算目标进度：只统计今日首次掌握的单词，不包含复习和测试
      const goalProgress = Math.min(
        100,
        Math.round((dailyStat.learnedCount / userSettings.dailyGoal) * 100)
      );

      // 确保 totalWords 是数字类型，防止类型错误
      const safeTotalWords = typeof totalWords === "number" ? totalWords : 0;

      // 确保统计值是有效的数字，并限制最大值（防止异常数据）
      const safeLearnedCount = Math.max(
        0,
        Math.min(Number(dailyStat.learnedCount) || 0, 10000)
      );
      // 注意：reviewedCount 和 testedCount 不再用于计算 studiedToday
      // 但保留它们用于其他可能的用途（如显示详细统计）

      // 只统计今日首次掌握的单词（learnedCount），不包含复习和测试
      // 因为复习和测试是重复学习，不应该计入"今日学习"
      const studiedToday = safeLearnedCount;

      // 如果发现异常大的值，记录警告并重置
      if (studiedToday > 10000) {
        console.warn("检测到异常大的学习统计值，重置为0", {
          learnedCount: dailyStat.learnedCount,
          reviewedCount: dailyStat.reviewedCount,
          testedCount: dailyStat.testedCount,
        });
        // 重置异常数据
        dailyStat.learnedCount = 0;
        dailyStat.reviewedCount = 0;
        dailyStat.testedCount = 0;
        dailyStat.updatedAt = new Date().toISOString();
        await db.dailyStats.put(dailyStat);
      }

      setStudyStats({
        totalWords: safeTotalWords,
        studiedToday: studiedToday > 10000 ? 0 : studiedToday, // 如果仍然异常，显示0
        currentStreak: userSettings.currentStreak || 0,
        dailyGoal: userSettings.dailyGoal || 20,
        goalProgress,
      });
    } catch (error) {
      console.error("加载学习统计失败:", error);
    }
  };

  const handleSelectMode = (mode: StudyMode) => {
    setSelectedMode(mode);
    setShowWordSetSelector(true);
  };

  const handleSelectWordSet = async (wordSetId: number | undefined) => {
    setSelectedWordSetId(wordSetId);
    setShowWordSetSelector(false);

    // 重置 sessionCompleteRef，允许新的学习会话
    sessionCompleteRef.current = false;

    // 根据选择的模式显示对应的学习组件
    if (selectedMode === "flashcard") {
      setShowFlashcardStudy(true);
    } else if (selectedMode === "test") {
      setShowTestStudy(true);
    } else if (selectedMode === "review") {
      // 检查复习锁定
      if (wordSetId !== undefined) {
        const canReview = await canStartReview(wordSetId);
        if (!canReview.allowed && canReview.lockInfo) {
          // 显示锁定提示
          const lockMessage = `必须完成课程 ${canReview.lockInfo.wordSetName} 第 ${canReview.lockInfo.reviewStage} 次复习`;
          alert(lockMessage);
          return;
        }

        // 获取复习计划，确定复习阶段
        const plan = await getReviewPlan(wordSetId);
        if (plan) {
          setSelectedReviewStage(plan.reviewStage);
          setShowReviewStudy(true);
        } else {
          alert("该单词集还没有复习计划");
        }
      }
    }
  };

  const handleStartReview = async (wordSetId: number, reviewStage: number) => {
    setSelectedWordSetId(wordSetId);
    setSelectedReviewStage(reviewStage);
    setShowReviewNotification(false);
    setShowReviewStudy(true);
  };

  // 防止重复调用的标志
  const sessionCompleteRef = useRef(false);

  const handleSessionComplete = async (stats: {
    studiedCount: number;
    correctCount: number;
    wrongCount: number;
    masteredWordIds?: number[]; // 本次会话中标记为掌握的单词ID列表
  }) => {
    // 防止重复调用
    if (sessionCompleteRef.current) {
      console.warn("handleSessionComplete 已被调用，忽略重复调用");
      return;
    }
    sessionCompleteRef.current = true;

    try {
      // 确保统计值是有效的数字，并限制最大值（防止异常数据）
      const safeStudiedCount = Math.max(
        0,
        Math.min(Number(stats.studiedCount) || 0, 1000)
      );
      const safeCorrectCount = Math.max(
        0,
        Math.min(Number(stats.correctCount) || 0, 1000)
      );
      const safeWrongCount = Math.max(
        0,
        Math.min(Number(stats.wrongCount) || 0, 1000)
      );

      // 记录调试信息
      console.log("handleSessionComplete 被调用", {
        mode: selectedMode,
        stats,
        safeStudiedCount,
        safeCorrectCount,
        safeWrongCount,
      });

      // 更新每日统计
      const today = new Date().toISOString().split("T")[0];
      let dailyStat = await db.dailyStats.get(today);
      if (!dailyStat) {
        dailyStat = {
          date: today,
          learnedCount: 0,
          reviewedCount: 0,
          testedCount: 0,
          correctCount: 0,
          learnedWordIds: [], // 初始化今日已学习的单词ID列表
          updatedAt: new Date().toISOString(),
        } as DailyStat;
      }

      // 初始化 learnedWordIds（如果不存在）
      if (!dailyStat.learnedWordIds) {
        dailyStat.learnedWordIds = [];
      }

      // 根据模式更新对应的统计
      // 注意：如果 selectedMode 为 null，尝试从 stats 中推断模式
      // 或者使用默认的 flashcard 模式（因为闪卡是最常用的）
      const mode = selectedMode || "flashcard";

      if (mode === "flashcard") {
        // 只统计本次会话中标记为"掌握"的单词，且不在今日已学习列表中的单词
        const masteredWordIds = stats.masteredWordIds || [];
        const newLearnedWordIds = masteredWordIds.filter(
          (wordId) => !dailyStat.learnedWordIds!.includes(wordId)
        );

        // 只统计新掌握的单词数量
        const newLearnedCount = newLearnedWordIds.length;
        dailyStat.learnedCount += newLearnedCount;

        // 更新今日已学习的单词ID列表
        dailyStat.learnedWordIds = [
          ...dailyStat.learnedWordIds!,
          ...newLearnedWordIds,
        ];

        console.log("闪卡学习统计", {
          masteredWordIds,
          newLearnedWordIds,
          newLearnedCount,
          totalLearnedCount: dailyStat.learnedCount,
        });

        // 闪卡学习完成后，为新学习的单词创建独立的复习计划
        if (selectedWordSetId !== undefined && newLearnedWordIds.length > 0) {
          try {
            const { getOrCreateReviewPlan } = await import(
              "../store/reviewStore"
            );
            // 获取单词集的总单词数
            const wordSet = await db.wordSets.get(selectedWordSetId);
            if (wordSet) {
              // 为新学习的单词创建独立的复习计划
              await getOrCreateReviewPlan(
                selectedWordSetId,
                newLearnedWordIds.length,
                newLearnedWordIds
              );
              console.log("闪卡学习完成，已为新学习的单词创建复习计划", {
                wordSetId: selectedWordSetId,
                learnedWordIds: newLearnedWordIds,
                count: newLearnedWordIds.length,
              });
            }
          } catch (error) {
            console.error("创建复习计划失败:", error);
            // 不阻止主流程，只记录错误
          }
        }
      } else if (mode === "test") {
        // 测试模式：统计测试的单词数（不去重，因为测试可能重复测试）
        dailyStat.testedCount += safeStudiedCount;
      } else if (mode === "review") {
        // 复习模式：不统计到 learnedCount，只统计到 reviewedCount
        dailyStat.reviewedCount += safeStudiedCount;

        // 复习完成后，检查是否有下一个复习通知
        const { getDueReviewPlans } = await import("../store/reviewStore");
        const nextDuePlans = await getDueReviewPlans();
        if (nextDuePlans.length > 0) {
          // 有下一个复习通知，自动显示
          setShowReviewNotification(true);
        }
      } else {
        // 如果模式未知，默认使用 flashcard 模式
        console.warn("未知的学习模式，使用默认的 flashcard 模式", {
          mode,
          selectedMode,
        });
        // 对于未知模式，也使用去重逻辑
        const masteredWordIds = stats.masteredWordIds || [];
        const newLearnedWordIds = masteredWordIds.filter(
          (wordId) => !dailyStat.learnedWordIds!.includes(wordId)
        );
        dailyStat.learnedCount += newLearnedWordIds.length;
        dailyStat.learnedWordIds = [
          ...dailyStat.learnedWordIds!,
          ...newLearnedWordIds,
        ];
      }

      // correctCount 仍然累加所有答对的次数（包括复习）
      dailyStat.correctCount += safeCorrectCount;
      dailyStat.updatedAt = new Date().toISOString();

      // 记录更新前的值
      console.log(
        "更新数据库前的 dailyStat:",
        JSON.parse(JSON.stringify(dailyStat))
      );

      await db.dailyStats.put(dailyStat);

      // 验证更新是否成功
      const updatedStat = await db.dailyStats.get(today);
      console.log(
        "更新数据库后的 dailyStat:",
        JSON.parse(JSON.stringify(updatedStat))
      );

      // 检查是否完成每日目标
      const userSettings = await db.userSettings.get(1);
      if (userSettings) {
        const totalStudied =
          dailyStat.learnedCount +
          dailyStat.reviewedCount +
          dailyStat.testedCount;
        if (
          totalStudied >= userSettings.dailyGoal &&
          userSettings.currentStreak === 0
        ) {
          // 更新连续天数
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
          const yesterdayStat = await db.dailyStats.get(yesterdayStr);

          if (yesterdayStat) {
            const yesterdayTotal =
              yesterdayStat.learnedCount +
              yesterdayStat.reviewedCount +
              yesterdayStat.testedCount;
            if (yesterdayTotal >= userSettings.dailyGoal) {
              // 连续完成目标
              userSettings.currentStreak += 1;
              if (userSettings.currentStreak > userSettings.longestStreak) {
                userSettings.longestStreak = userSettings.currentStreak;
              }
            } else {
              // 重新开始
              userSettings.currentStreak = 1;
            }
          } else {
            // 第一天
            userSettings.currentStreak = 1;
          }
          userSettings.updatedAt = new Date().toISOString();
          await db.userSettings.put(userSettings);
        }
      }

      // 刷新统计（延迟执行，确保数据库更新完成）
      setTimeout(async () => {
        await loadStudyStats();
      }, 200);
    } finally {
      // 延迟重置标志，确保统计更新完成
      setTimeout(() => {
        sessionCompleteRef.current = false;
      }, 500);
    }
  };

  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isPortrait ? "100%" : "75vw",
    margin: "0 auto",
    padding: isPortrait ? "3vw" : "1.25vw",
  };

  const cardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    borderRadius: isPortrait ? "2vw" : "0.75vw",
    padding: isPortrait ? "4vw" : "1.5vw",
    marginBottom: isPortrait ? "3vw" : "1.25vw",
    boxShadow: isDark
      ? isPortrait
        ? "0 1vw 5vw rgba(0, 0, 0, 0.3)"
        : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.3)"
      : isPortrait
      ? "0 1vw 5vw rgba(0, 0, 0, 0.1)"
      : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.1)",
    border: isDark
      ? `${isPortrait ? "0.3vw" : "0.06vw"} solid #444`
      : `${isPortrait ? "0.3vw" : "0.06vw"} solid #e0e0e0`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "5.5vw" : "1.75vw",
    fontWeight: "bold",
    color: "#00b4ff",
    marginBottom: isPortrait ? "5vw" : "1.875vw",
    textAlign: "center",
  };

  const statsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isPortrait
      ? "repeat(2, 1fr)"
      : "repeat(auto-fit, minmax(12.5vw, 1fr))",
    gap: isPortrait ? "3vw" : "1.25vw",
    marginBottom: isPortrait ? "5vw" : "1.875vw",
  };

  const statItemStyle: React.CSSProperties = {
    textAlign: "center",
    padding: isPortrait ? "3vw" : "1.25vw",
    background: isDark ? "rgba(0, 180, 255, 0.1)" : "rgba(0, 180, 255, 0.05)",
    borderRadius: isPortrait ? "1.5vw" : "0.5vw",
    border: `${isPortrait ? "0.3vw" : "0.06vw"} solid rgba(0, 180, 255, 0.2)`,
  };

  const statNumberStyle: React.CSSProperties = {
    fontSize: isPortrait ? "6vw" : "2.25vw",
    fontWeight: "bold",
    color: "#00b4ff",
    marginBottom: isPortrait ? "1.5vw" : "0.5vw",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: isPortrait ? "3vw" : "0.875vw",
    color: isDark ? "#ccc" : "#666",
    textTransform: "uppercase",
    letterSpacing: isPortrait ? "0.125vw" : "0.03vw",
  };

  const progressBarStyle: React.CSSProperties = {
    width: "100%",
    height: isPortrait ? "2vw" : "0.5vw",
    background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    borderRadius: isPortrait ? "1vw" : "0.25vw",
    overflow: "hidden",
    marginTop: isPortrait ? "2vw" : "0.5vw",
  };

  const progressFillStyle: React.CSSProperties = {
    height: "100%",
    background: "linear-gradient(90deg, #00b4ff 0%, #0096d4 100%)",
    borderRadius: isPortrait ? "1vw" : "0.25vw",
    transition: "width 0.3s ease",
    width: `${studyStats.goalProgress}%`,
  };

  return (
    <>
      <div data-test-id="div-test-20" style={containerStyle}>
        <h1 data-test-id="h1-test" style={titleStyle}>
          {t("study")}
        </h1>

        <div data-test-id="div-test-19" style={cardStyle}>
          <h2
            data-test-id="h2-test-1"
            style={{
              marginBottom: isPortrait ? "4vw" : "1.25vw",
              fontSize: isPortrait ? "4.5vw" : "1.25vw",
              color: isDark ? "#fff" : "#333",
            }}
          >
            {t("studyStats")}
          </h2>
          <div data-test-id="div-test-18" style={statsGridStyle}>
            <div data-test-id="div-test-17" style={statItemStyle}>
              <div data-test-id="div-test-16" style={statNumberStyle}>
                {studyStats.totalWords}
              </div>
              <div data-test-id="div-test-15" style={statLabelStyle}>
                {t("totalWords")}
              </div>
            </div>
            <div data-test-id="div-test-14" style={statItemStyle}>
              <div data-test-id="div-test-13" style={statNumberStyle}>
                {studyStats.studiedToday}
              </div>
              <div data-test-id="div-test-12" style={statLabelStyle}>
                {t("studiedToday")}
              </div>
            </div>
            <div data-test-id="div-test-11" style={statItemStyle}>
              <div data-test-id="div-test-10" style={statNumberStyle}>
                {studyStats.currentStreak}
              </div>
              <div data-test-id="div-test-9" style={statLabelStyle}>
                {t("currentStreak")}
              </div>
            </div>
            <div data-test-id="div-test-8" style={statItemStyle}>
              <div data-test-id="div-test-7" style={statNumberStyle}>
                {studyStats.studiedToday} / {studyStats.dailyGoal}
              </div>
              <div data-test-id="div-test-6" style={statLabelStyle}>
                {t("dailyGoalProgress")}
              </div>
              <div data-test-id="div-test-5" style={progressBarStyle}>
                <div data-test-id="div-test-4" style={progressFillStyle}></div>
              </div>
            </div>
          </div>
        </div>

        <div data-test-id="div-test-3" style={cardStyle}>
          <h2
            data-test-id="h2-test"
            style={{
              marginBottom: isPortrait ? "4vw" : "1.25vw",
              fontSize: isPortrait ? "4.5vw" : "1.25vw",
              color: isDark ? "#fff" : "#333",
            }}
          >
            {t("studyModes")}
          </h2>
          <div
            data-test-id="div-test-2"
            style={{
              display: "grid",
              gridTemplateColumns: isPortrait
                ? "1fr"
                : "repeat(auto-fit, minmax(15.625vw, 1fr))",
              gap: isPortrait ? "3vw" : "1vw",
            }}
          >
            {[
              {
                mode: "flashcard" as StudyMode,
                title: t("flashcardMode"),
                desc: t("flashcardDesc"),
                icon: "🎴",
              },
              {
                mode: "test" as StudyMode,
                title: t("testMode"),
                desc: t("testDesc"),
                icon: "📝",
              },
              {
                mode: "review" as StudyMode,
                title: t("reviewMode"),
                desc: t("reviewDesc"),
                icon: "🔄",
              },
            ].map((modeItem) => (
              <div
                data-test-id="div-test-1"
                key={modeItem.mode}
                style={{
                  padding: isPortrait ? "4vw" : "1.25vw",
                  background: isDark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderRadius: isPortrait ? "1.5vw" : "0.5vw",
                  border: isDark
                    ? `${isPortrait ? "0.3vw" : "0.06vw"} solid #555`
                    : `${isPortrait ? "0.3vw" : "0.06vw"} solid #e0e0e0`,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onClick={() => handleSelectMode(modeItem.mode)}
                onMouseEnter={(e) => {
                  if (!isPortrait) {
                    e.currentTarget.style.transform = "translateY(-0.25vw)";
                    e.currentTarget.style.boxShadow = isDark
                      ? "0 0.5vw 1.5vw rgba(0, 0, 0, 0.5)"
                      : "0 0.5vw 1.5vw rgba(0, 180, 255, 0.2)";
                    e.currentTarget.style.borderColor = "#00b4ff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPortrait) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = isDark
                      ? "#555"
                      : "#e0e0e0";
                  }
                }}
              >
                <div
                  data-test-id="div-test"
                  style={{
                    fontSize: isPortrait ? "5vw" : "1.5vw",
                    marginBottom: isPortrait ? "1.5vw" : "0.5vw",
                  }}
                >
                  {modeItem.icon}
                </div>
                <h3
                  data-test-id="h3-test"
                  style={{
                    margin: `0 0 ${isPortrait ? "2vw" : "0.5vw"} 0`,
                    color: isDark ? "#fff" : "#333",
                    fontSize: isPortrait ? "3.75vw" : "1vw",
                  }}
                >
                  {modeItem.title}
                </h3>
                <p
                  data-test-id="p-test"
                  style={{
                    margin: 0,
                    color: isDark ? "#ccc" : "#666",
                    fontSize: isPortrait ? "3.25vw" : "0.875vw",
                  }}
                >
                  {modeItem.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showWordSetSelector &&
        ComponentAsModel(
          <WordSetSelector
            data-test-id="wordsetselector-test"
            closePopup={() => setShowWordSetSelector(false)}
            onSelectWordSet={handleSelectWordSet}
          />
        )}

      {showFlashcardStudy &&
        ComponentAsModel(
          <FlashcardStudy
            data-test-id="flashcardstudy-test"
            closePopup={() => {
              setShowFlashcardStudy(false);
              setSelectedMode(null);
              setSelectedWordSetId(undefined);
            }}
            wordSetId={selectedWordSetId}
            onSessionComplete={handleSessionComplete}
          />
        )}

      {showTestStudy &&
        ComponentAsModel(
          <TestStudy
            data-test-id="teststudy-test"
            closePopup={() => {
              setShowTestStudy(false);
              setSelectedMode(null);
              setSelectedWordSetId(undefined);
            }}
            wordSetId={selectedWordSetId}
            onSessionComplete={handleSessionComplete}
          />
        )}

      {showReviewStudy &&
        ComponentAsModel(
          <ReviewStudy
            data-test-id="reviewstudy-test"
            closePopup={() => {
              setShowReviewStudy(false);
              setSelectedMode(null);
              setSelectedWordSetId(undefined);
              setSelectedReviewStage(undefined);
              setShowReviewNotification(true); // 重新显示通知
            }}
            wordSetId={selectedWordSetId}
            reviewStage={selectedReviewStage}
            onSessionComplete={handleSessionComplete}
          />
        )}

      {showReviewNotification && (
        <ReviewNotification
          onStartReview={handleStartReview}
          onDismiss={() => setShowReviewNotification(false)}
        />
      )}
    </>
  );
}
