import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, useOrientation } from "../main";
import { useTranslation } from "react-i18next";
import { db, ensureDBOpen, StudyMode } from "../db";
import { usePWAInstallPrompt } from "../hooks/usePWAInstallPrompt";
import { useServiceWorkerUpdate } from "../hooks/useServiceWorkerUpdate";
import { useWordStore, useReviewStore, useDueReviewPlans } from "../store/hooks";
import { getUserSettings } from "../store/wordStore";
import { queryCache } from "../utils/queryCache";
import { handleErrorSync } from "../utils/errorHandler";
import HomeStatsCard from "../components/HomeStatsCard";
import StudyModeCard from "../components/StudyModeCard";
import ReviewNotificationCard from "../components/ReviewNotificationCard";
import LoadingIndicator from "../components/LoadingIndicator";
import type { ReviewPlan } from "../db";

export default function Home() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  const { t } = useTranslation();
  const {
    isInstallable,
    isPromptVisible,
    isInstalled,
    promptInstall,
    dismissPrompt,
  } = usePWAInstallPrompt();
  const { isUpdateAvailable, applyUpdate, dismissUpdate } =
    useServiceWorkerUpdate();
  const shouldShowInstallPrompt =
    isInstallable && !isInstalled && isPromptVisible;

  // 使用 Zustand Store
  const wordStore = useWordStore();
  const reviewStore = useReviewStore();
  const dueReviewPlans = useDueReviewPlans();

  // 统计数据
  const [stats, setStats] = useState({
    dailyGoal: 20,
    learnedToday: 0,
    currentStreak: 0,
    totalWords: 0,
    masteredWords: 0,
  });

  const [wordSetMap, setWordSetMap] = useState<Map<number, string>>(new Map());

  // 加载状态
  const [isLoading, setIsLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    loadHomeData().catch((error) => {
      handleErrorSync(error, { operation: "loadHomeData" });
    });

    // 监听窗口焦点，刷新数据
    const handleFocus = () => {
      loadHomeData().catch((error) => {
        handleErrorSync(error, { operation: "refreshHomeData" });
      });
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const loadHomeData = async () => {
    try {
      setIsLoading(true);
      await ensureDBOpen();

      // 1. 获取用户设置（不缓存，因为可能频繁变化）
      const userSettings = await getUserSettings();
      const dailyGoal = userSettings.dailyGoal || 20;
      const currentStreak = userSettings.currentStreak || 0;

      // 2. 获取今日统计（使用缓存，1 分钟过期）
      const today = new Date().toISOString().split("T")[0];
      const statsCacheKey = `home:stats:${today}`;
      const cachedStats = queryCache.get<{
        learnedToday: number;
        totalWords: number;
        masteredWords: number;
      }>(statsCacheKey);
      
      let learnedToday: number;
      let totalWords: number;
      let masteredWords: number;
      
      if (cachedStats !== null) {
        learnedToday = cachedStats.learnedToday;
        totalWords = cachedStats.totalWords;
        masteredWords = cachedStats.masteredWords;
      } else {
        const dailyStat = await db.dailyStats.get(today);
        learnedToday = dailyStat?.learnedCount || 0;

        // 3. 获取总单词数和已掌握单词数
        totalWords = await db.words.count();

        // 计算已掌握单词数（repetitions >= 3 或 correctStreak >= 3）
        const allProgress = await db.wordProgress.toArray();
        masteredWords = allProgress.filter(
          (p) => (p.repetitions >= 3 || p.correctStreak >= 3) && p.timesSeen > 0
        ).length;
        
        // 存入缓存（1 分钟过期）
        queryCache.set(
          statsCacheKey,
          { learnedToday, totalWords, masteredWords },
          1 * 60 * 1000
        );
      }

      setStats({
        dailyGoal,
        learnedToday,
        currentStreak,
        totalWords,
        masteredWords,
      });

      // 4. 加载到期复习计划（使用 Zustand Store）
      await reviewStore.loadDueReviewPlans();

      // 5. 加载单词集列表（使用 Zustand Store）
      await wordStore.loadWordSets();
      
      // 获取单词集映射（用于显示复习提醒中的单词集名称）
      const wordSets = wordStore.wordSets;
      const map = new Map<number, string>();
      wordSets.forEach((ws) => {
        map.set(ws.id!, ws.name);
      });
      // 添加默认单词集
      try {
        map.set(0, t("defaultWordSet"));
      } catch (error) {
        // 如果 i18n 未初始化，使用默认值
        console.warn("i18n 可能未初始化，使用默认值");
        map.set(0, "默认");
      }
      setWordSetMap(map);
    } catch (error) {
      handleErrorSync(error, { operation: "loadHomeData" });
    } finally {
      setIsLoading(false);
    }
  };

  // 处理学习模式卡片点击
  const handleModeClick = (mode: StudyMode) => {
    navigate("/study", { state: { mode } });
  };

  // 处理复习提醒点击
  const handleReviewClick = (reviewPlan: ReviewPlan) => {
    navigate("/study", {
      state: {
        mode: "review" as StudyMode,
        wordSetId: reviewPlan.wordSetId,
        reviewStage: reviewPlan.reviewStage,
      },
    });
  };

  // 判断推荐标签
  const getModeBadge = (
    mode: StudyMode
  ): "recommended" | "newWords" | "reviewDue" | null => {
    if (mode === "review" && dueReviewPlans.length > 0) {
      return "reviewDue";
    }
    // 可以根据其他条件判断 "recommended" 或 "newWords"
    return null;
  };

  // 获取模式统计信息
  const getModeStats = (mode: StudyMode): string | undefined => {
    switch (mode) {
      case "flashcard":
        return stats.learnedToday > 0
          ? t("studiedToday") + `: ${stats.learnedToday}`
          : undefined;
      case "test":
        // 可以添加测试统计
        return undefined;
      case "review":
        return dueReviewPlans.length > 0
          ? `${dueReviewPlans.length} ${t("reviewDue")}`
          : undefined;
      default:
        return undefined;
    }
  };

  // 容器样式
  const containerStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: isPortrait ? "4vw 2vw" : "2vw",
    gap: isPortrait ? "4vw" : "1.5vw",
    background: isDark
      ? "linear-gradient(180deg, #1c1c1e 0%, #2c2c2e 100%)"
      : "linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%)",
    paddingBottom: isPortrait ? "8vw" : "4vw",
  };

  // 模式卡片容器样式
  const modeCardsContainerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isPortrait ? "1fr" : "repeat(3, 1fr)",
    gap: isPortrait ? "3vw" : "1.5vw",
    width: "100%",
    maxWidth: isPortrait ? "90%" : "1200px",
  };

  // 复习提醒容器样式
  const reviewContainerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isPortrait ? "90%" : "800px",
    display: "flex",
    flexDirection: "column",
    gap: isPortrait ? "3vw" : "1.2vw",
  };

  // 图标组件
  const FlashcardIcon = () => (
    <svg
      width={isPortrait ? "6vw" : "2vw"}
      height={isPortrait ? "6vw" : "2vw"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  );

  const TestIcon = () => (
    <svg
      width={isPortrait ? "6vw" : "2vw"}
      height={isPortrait ? "6vw" : "2vw"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );

  const ReviewIcon = () => (
    <svg
      width={isPortrait ? "6vw" : "2vw"}
      height={isPortrait ? "6vw" : "2vw"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
    </svg>
  );

  // 如果正在加载，显示加载提示
  if (isLoading) {
    return (
      <div style={containerStyle}>
        <LoadingIndicator
          size="large"
          message={t("loading")}
          style={{
            height: "50vh",
          }}
        />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* PWA 更新提示 */}
      {isUpdateAvailable && (
        <div data-test-id="pwa-update-banner" style={updatePromptStyle}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: "0.5rem",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {t("updateAvailable")}
            </span>
            <span
              style={{
                color: "var(--langger-text-secondary, #555)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              {t("updateDescription")}
            </span>
          </div>
          <div
            data-test-id="home-div-test-1"
            style={{ display: "flex", columnGap: "0.75rem" }}
          >
            <button
              data-test-id="pwa-update-confirm"
              onClick={applyUpdate}
              style={updatePrimaryButtonStyle}
            >
              {t("refreshNow")}
            </button>
            <button
              data-test-id="pwa-update-dismiss"
              onClick={dismissUpdate}
              style={ghostButtonStyle}
            >
              {t("ignoreUpdate")}
            </button>
          </div>
        </div>
      )}

      {/* PWA 安装提示 */}
      {shouldShowInstallPrompt && (
        <div data-test-id="pwa-install-banner" style={installPromptStyle}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              rowGap: "0.5rem",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>
              {t("installLanggerToDesktop")}
            </span>
            <span
              style={{
                color: "var(--langger-text-secondary, #555)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              {t("addApplicationToDevice", { device: t("desktop") })}
            </span>
          </div>
          <div style={{ display: "flex", columnGap: "0.75rem" }}>
            <button
              data-test-id="pwa-install-confirm"
              onClick={() => {
                void promptInstall();
              }}
              style={primaryButtonStyle}
            >
              {t("installNow")}
            </button>
            <button
              data-test-id="pwa-install-dismiss"
              onClick={dismissPrompt}
              style={ghostButtonStyle}
            >
              {t("remindLater")}
            </button>
          </div>
        </div>
      )}

      {/* 欢迎标题 */}
      <h1
        data-test-id="h1-test"
        style={titleStyle}
        data-testid="today-progress-title"
      >
        {t("title1")}
      </h1>

      {/* 统计卡片 */}
      <HomeStatsCard
        dailyGoal={stats.dailyGoal}
        learnedToday={stats.learnedToday}
        currentStreak={stats.currentStreak}
        totalWords={stats.totalWords}
        masteredWords={stats.masteredWords}
        isDark={isDark}
        isPortrait={isPortrait}
      />

      {/* 学习模式卡片 */}
      <div style={modeCardsContainerStyle}>
        <StudyModeCard
          mode="flashcard"
          title={t("flashcardMode")}
          description={t("flashcardDesc")}
          icon={<FlashcardIcon />}
          badge={getModeBadge("flashcard")}
          stats={getModeStats("flashcard")}
          onClick={() => handleModeClick("flashcard")}
          isDark={isDark}
          isPortrait={isPortrait}
          color="#00b4ff"
        />
        <StudyModeCard
          mode="test"
          title={t("testMode")}
          description={t("testDesc")}
          icon={<TestIcon />}
          badge={getModeBadge("test")}
          stats={getModeStats("test")}
          onClick={() => handleModeClick("test")}
          isDark={isDark}
          isPortrait={isPortrait}
          color="#34c759"
        />
        <StudyModeCard
          mode="review"
          title={t("reviewMode")}
          description={t("reviewDesc")}
          icon={<ReviewIcon />}
          badge={getModeBadge("review")}
          stats={getModeStats("review")}
          onClick={() => handleModeClick("review")}
          isDark={isDark}
          isPortrait={isPortrait}
          color="#af52de"
        />
      </div>

      {/* 复习提醒区域 */}
      {dueReviewPlans.length > 0 && (
        <div style={reviewContainerStyle}>
          {dueReviewPlans.slice(0, 3).map((plan) => (
            <ReviewNotificationCard
              key={plan.id}
              reviewPlan={plan}
              wordSetName={wordSetMap.get(plan.wordSetId) || t("unknown")}
              onClick={() => handleReviewClick(plan)}
              isDark={isDark}
              isPortrait={isPortrait}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1200px",
  fontSize: "clamp(1.5rem, 4vw, 3rem)",
  fontWeight: 700,
  lineHeight: 1.5,
  textAlign: "left",
  paddingLeft: "clamp(2vw, 5%, 5%)",
  marginBottom: "clamp(1rem, 2vw, 2rem)",
};

const installPromptStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "90%",
  maxWidth: "960px",
  padding: "1.25rem 1.5rem",
  marginBottom: "1.5rem",
  borderRadius: "16px",
  background: "rgba(0, 180, 255, 0.12)",
  border: "1px solid rgba(0, 180, 255, 0.35)",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.08)",
  backdropFilter: "blur(6px)",
  gap: "1rem",
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1.4rem",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(135deg, #00b4ff 0%, #007bff 100%)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const updatePromptStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "90%",
  maxWidth: "960px",
  padding: "1rem 1.5rem",
  marginBottom: "1.25rem",
  borderRadius: "16px",
  background: "rgba(0, 180, 255, 0.08)",
  border: "1px solid rgba(0, 180, 255, 0.35)",
  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.06)",
  gap: "1rem",
  flexWrap: "wrap",
};

const updatePrimaryButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1.4rem",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(135deg, #00b4ff 0%, #007bff 100%)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1.4rem",
  borderRadius: "999px",
  border: "1px solid rgba(0, 0, 0, 0.15)",
  background: "transparent",
  color: "inherit",
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
