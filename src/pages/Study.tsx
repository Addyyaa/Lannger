import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import { db, StudyMode, UserSettings, DailyStat, ensureDBOpen } from "../db";
import ComponentAsModel from "../utils/componentAsModel";
import WordSetSelector from "../components/WordSetSelector";
import FlashcardStudy from "../components/FlashcardStudy";

export default function Study() {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const [studyStats, setStudyStats] = useState({
        totalWords: 0,
        studiedToday: 0,
        currentStreak: 0,
        dailyGoal: 20,
        goalProgress: 0,
    });
    const [showWordSetSelector, setShowWordSetSelector] = useState(false);
    const [showFlashcardStudy, setShowFlashcardStudy] = useState(false);
    const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null);
    const [selectedWordSetId, setSelectedWordSetId] = useState<number | undefined>(undefined);

    useEffect(() => {
        loadStudyStats();
        // 监听窗口焦点，刷新统计数据
        const handleFocus = () => {
            loadStudyStats();
        };
        window.addEventListener("focus", handleFocus);
        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

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

            // 计算目标进度
            const goalProgress = Math.min(
                100,
                Math.round(
                    ((dailyStat.learnedCount + dailyStat.reviewedCount + dailyStat.testedCount) /
                        userSettings.dailyGoal) *
                    100
                )
            );

            setStudyStats({
                totalWords,
                studiedToday:
                    dailyStat.learnedCount + dailyStat.reviewedCount + dailyStat.testedCount,
                currentStreak: userSettings.currentStreak,
                dailyGoal: userSettings.dailyGoal,
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

    const handleSelectWordSet = (wordSetId: number | undefined) => {
        setSelectedWordSetId(wordSetId);
        setShowWordSetSelector(false);
        // 根据选择的模式显示对应的学习组件
        if (selectedMode === "flashcard") {
            setShowFlashcardStudy(true);
        }
        // TODO: 添加测试和复习模式的处理
    };

    const handleSessionComplete = async (stats: {
        studiedCount: number;
        correctCount: number;
        wrongCount: number;
    }) => {
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
                updatedAt: new Date().toISOString(),
            } as DailyStat;
        }

        // 根据模式更新对应的统计
        if (selectedMode === "flashcard") {
            dailyStat.learnedCount += stats.studiedCount;
        } else if (selectedMode === "test") {
            dailyStat.testedCount += stats.studiedCount;
        } else if (selectedMode === "review") {
            dailyStat.reviewedCount += stats.studiedCount;
        }

        dailyStat.correctCount += stats.correctCount;
        dailyStat.updatedAt = new Date().toISOString();
        await db.dailyStats.put(dailyStat);

        // 检查是否完成每日目标
        const userSettings = await db.userSettings.get(1);
        if (userSettings) {
            const totalStudied =
                dailyStat.learnedCount + dailyStat.reviewedCount + dailyStat.testedCount;
            if (totalStudied >= userSettings.dailyGoal && userSettings.currentStreak === 0) {
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

        // 刷新统计
        await loadStudyStats();
    };

    const containerStyle: React.CSSProperties = {
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px",
    };

    const cardStyle: React.CSSProperties = {
        background: isDark
            ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "20px",
        boxShadow: isDark
            ? "0 4px 20px rgba(0, 0, 0, 0.3)"
            : "0 4px 20px rgba(0, 0, 0, 0.1)",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
    };

    const titleStyle: React.CSSProperties = {
        fontSize: "28px",
        fontWeight: "bold",
        color: "#00b4ff",
        marginBottom: "30px",
        textAlign: "center",
    };

    const statsGridStyle: React.CSSProperties = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "30px",
    };

    const statItemStyle: React.CSSProperties = {
        textAlign: "center",
        padding: "20px",
        background: isDark ? "rgba(0, 180, 255, 0.1)" : "rgba(0, 180, 255, 0.05)",
        borderRadius: "8px",
        border: "1px solid rgba(0, 180, 255, 0.2)",
    };

    const statNumberStyle: React.CSSProperties = {
        fontSize: "36px",
        fontWeight: "bold",
        color: "#00b4ff",
        marginBottom: "8px",
    };

    const statLabelStyle: React.CSSProperties = {
        fontSize: "14px",
        color: isDark ? "#ccc" : "#666",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    };

    const progressBarStyle: React.CSSProperties = {
        width: "100%",
        height: "8px",
        background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        borderRadius: "4px",
        overflow: "hidden",
        marginTop: "8px",
    };

    const progressFillStyle: React.CSSProperties = {
        height: "100%",
        background: "linear-gradient(90deg, #00b4ff 0%, #0096d4 100%)",
        borderRadius: "4px",
        transition: "width 0.3s ease",
        width: `${studyStats.goalProgress}%`,
    };


    return (
        <>
            <div style={containerStyle}>
                <h1 style={titleStyle}>{t("study")}</h1>

                <div style={cardStyle}>
                    <h2 style={{ marginBottom: "20px", color: isDark ? "#fff" : "#333" }}>
                        {t("studyStats")}
                    </h2>
                    <div style={statsGridStyle}>
                        <div style={statItemStyle}>
                            <div style={statNumberStyle}>{studyStats.totalWords}</div>
                            <div style={statLabelStyle}>{t("totalWords")}</div>
                        </div>
                        <div style={statItemStyle}>
                            <div style={statNumberStyle}>{studyStats.studiedToday}</div>
                            <div style={statLabelStyle}>{t("studiedToday")}</div>
                        </div>
                        <div style={statItemStyle}>
                            <div style={statNumberStyle}>{studyStats.currentStreak}</div>
                            <div style={statLabelStyle}>{t("currentStreak")}</div>
                        </div>
                        <div style={statItemStyle}>
                            <div style={statNumberStyle}>
                                {studyStats.studiedToday} / {studyStats.dailyGoal}
                            </div>
                            <div style={statLabelStyle}>{t("dailyGoalProgress")}</div>
                            <div style={progressBarStyle}>
                                <div style={progressFillStyle}></div>
                            </div>
                        </div>
                    </div>
                </div>


                <div style={cardStyle}>
                    <h2 style={{ marginBottom: "20px", color: isDark ? "#fff" : "#333" }}>
                        {t("studyModes")}
                    </h2>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "16px",
                        }}
                    >
                        {[
                            { mode: "flashcard" as StudyMode, title: t("flashcardMode"), desc: t("flashcardDesc"), icon: "🎴" },
                            { mode: "test" as StudyMode, title: t("testMode"), desc: t("testDesc"), icon: "📝" },
                            { mode: "review" as StudyMode, title: t("reviewMode"), desc: t("reviewDesc"), icon: "🔄" },
                        ].map((modeItem) => (
                            <div
                                key={modeItem.mode}
                                style={{
                                    padding: "20px",
                                    background: isDark
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "rgba(0, 0, 0, 0.02)",
                                    borderRadius: "8px",
                                    border: isDark ? "1px solid #555" : "1px solid #e0e0e0",
                                    cursor: "pointer",
                                    transition: "all 0.3s ease",
                                }}
                                onClick={() => handleSelectMode(modeItem.mode)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-4px)";
                                    e.currentTarget.style.boxShadow = isDark
                                        ? "0 8px 24px rgba(0, 0, 0, 0.5)"
                                        : "0 8px 24px rgba(0, 180, 255, 0.2)";
                                    e.currentTarget.style.borderColor = "#00b4ff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.borderColor = isDark ? "#555" : "#e0e0e0";
                                }}
                            >
                                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{modeItem.icon}</div>
                                <h3
                                    style={{
                                        margin: "0 0 8px 0",
                                        color: isDark ? "#fff" : "#333",
                                        fontSize: "16px",
                                    }}
                                >
                                    {modeItem.title}
                                </h3>
                                <p
                                    style={{
                                        margin: 0,
                                        color: isDark ? "#ccc" : "#666",
                                        fontSize: "14px",
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
                        closePopup={() => setShowWordSetSelector(false)}
                        onSelectWordSet={handleSelectWordSet}
                    />
                )}

            {showFlashcardStudy &&
                ComponentAsModel(
                    <FlashcardStudy
                        closePopup={() => {
                            setShowFlashcardStudy(false);
                            setSelectedMode(null);
                            setSelectedWordSetId(undefined);
                        }}
                        wordSetId={selectedWordSetId}
                        onSessionComplete={handleSessionComplete}
                    />
                )}
        </>
    );
}
