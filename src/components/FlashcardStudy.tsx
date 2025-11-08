import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import { Word } from "../db";
import * as dbOperator from "../store/wordStore";
import { scheduleFlashcardWords } from "../algorithm";
import { updateWordProgress } from "../algorithm";
import CloseButton from "./CloseButton";

interface FlashcardStudyProps {
    closePopup: () => void;
    wordSetId?: number;
    onSessionComplete?: (stats: {
        studiedCount: number;
        correctCount: number;
        wrongCount: number;
    }) => void;
}

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
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [wordIds, setWordIds] = useState<number[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const createInitialStats = () => ({
        studiedCount: 0,
        correctCount: 0,
        wrongCount: 0,
    });
    const [sessionStats, setSessionStats] = useState(createInitialStats);
    const startTimeRef = useRef<number>(Date.now());
    const [isResetting, setIsResetting] = useState(false);
    const [resetFeedback, setResetFeedback] = useState<string | null>(null);
    const shouldPersistRef = useRef(true);

    const clearPersistedSessionState = useCallback(async () => {
        try {
            await dbOperator.clearFlashcardSessionState();
        } catch (error) {
            console.error("清除闪卡会话失败:", error);
        }
    }, []);

    useEffect(() => {
        if (wordIds.length > 0 && currentIndex < wordIds.length) {
            loadCurrentWord();
        }
    }, [wordIds, currentIndex]);

    const loadWords = useCallback(async () => {
        try {
            shouldPersistRef.current = false;
            setLoading(true);
            setSessionStats(createInitialStats());
            setShowAnswer(false);
            setResetFeedback(null);
            setCurrentWord(null);
            await clearPersistedSessionState();
            const result = await scheduleFlashcardWords({
                wordSetId,
                limit: 50,
            });
            setWordIds(result.wordIds);
            setCurrentIndex(0);
        } catch (error) {
            console.error("加载单词失败:", error);
        } finally {
            startTimeRef.current = Date.now();
            setLoading(false);
            shouldPersistRef.current = true;
        }
    }, [wordSetId, clearPersistedSessionState]);

    useEffect(() => {
        let cancelled = false;

        const restoreOrLoad = async () => {
            try {
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

                    if (validWordIds.length > 0) {
                        if (cancelled) {
                            return;
                        }
                        const nextIndex = Math.min(
                            Math.max(persisted.currentIndex ?? 0, 0),
                            validWordIds.length - 1
                        );

                        setWordIds(validWordIds);
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

                await loadWords();
            } catch (error) {
                console.error("恢复闪卡会话失败:", error);
                await loadWords();
            }
        };

        restoreOrLoad();

        return () => {
            cancelled = true;
        };
    }, [wordSetId, loadWords]);

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
            console.error("保存闪卡会话失败:", error);
        });
    }, [wordIds, currentIndex, sessionStats, showAnswer, wordSetId, loading]);

    const loadCurrentWord = async () => {
        if (currentIndex >= wordIds.length) {
            // 学习完成
            shouldPersistRef.current = false;
            await clearPersistedSessionState();
            if (onSessionComplete) {
                onSessionComplete(sessionStats);
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

        // 更新统计
        setSessionStats((prev) => ({
            studiedCount: prev.studiedCount + 1,
            correctCount: result === "correct" ? prev.correctCount + 1 : prev.correctCount,
            wrongCount: result === "wrong" ? prev.wrongCount + 1 : prev.wrongCount,
        }));

        // 移动到下一个单词
        if (currentIndex < wordIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // 学习完成
            shouldPersistRef.current = false;
            await clearPersistedSessionState();
            if (onSessionComplete) {
                onSessionComplete({
                    ...sessionStats,
                    studiedCount: sessionStats.studiedCount + 1,
                    correctCount: result === "correct" ? sessionStats.correctCount + 1 : sessionStats.correctCount,
                    wrongCount: result === "wrong" ? sessionStats.wrongCount + 1 : sessionStats.wrongCount,
                });
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
            await loadWords();
            window.alert(t("resetProgressSuccess", { count: resetCount }));
        } catch (error) {
            console.error("重置学习进度失败:", error);
            setResetFeedback(t("resetProgressError"));
        } finally {
            setIsResetting(false);
        }
    };


    // 外层容器（不翻转，包含 perspective）
    const outerContainerStyle: React.CSSProperties = {
        background: isDark
            ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        borderRadius: "1.5vw",
        width: "60vw",
        aspectRatio: "1/0.63",
        boxShadow: isDark
            ? "0 1.5vw 3vw rgba(0, 0, 0, 0.4)"
            : "0 1.5vw 3vw rgba(0, 0, 0, 0.15)",
        border: isDark ? "0.15vw solid #444" : "0.15vw solid #e0e0e0",
        position: "relative",
        display: "flex",
        flexDirection: "column",
    };

    // 卡片容器包装（提供 perspective）
    const cardWrapperStyle: React.CSSProperties = {
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        position: "relative",
        perspective: "100vw",
        WebkitPerspective: "100vw",
    };

    // 3D卡片容器
    const card3DContainerStyle: React.CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
        transformStyle: "preserve-3d",
        WebkitTransformStyle: "preserve-3d",
        transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: showAnswer ? "rotateY(180deg)" : "rotateY(0deg)",
    };

    // 卡片正面和背面的共同样式
    const cardFaceBaseStyle: React.CSSProperties = {
        position: "absolute",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
        borderRadius: "1.4vw",
        border: isDark ? "0.12vw solid #555" : "0.12vw solid #e0e0e0",
        boxShadow: isDark
            ? "0 1vw 2.5vw rgba(0, 0, 0, 0.3)"
            : "0 1vw 2.5vw rgba(0, 0, 0, 0.1)",
    };

    const cardFaceStyle: React.CSSProperties = {
        ...cardFaceBaseStyle,
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        cursor: "default",
        transform: "rotateY(0deg)",
    };

    const cardBackStyle: React.CSSProperties = {
        ...cardFaceBaseStyle,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "default",
        alignItems: "center",
        height: "100%",
        width: "100%",
        justifyContent: "flex-start",
        top: 0,
        transform: "rotateY(180deg)",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: "calc(0.7vw + 0.7vh)",
        color: isDark ? "#999" : "#666",
        marginBottom: "0.8vh",
        textAlign: "center",
        width: "100%",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: "0.12vw",
    };


    const wordTextStyle: React.CSSProperties = {
        fontSize: "calc(2.5vw + 2vh)",
        fontWeight: "bold",
        color: isDark ? "#fff" : "#333",
        textAlign: "center",
    };

    const buttonGroupStyle: React.CSSProperties = {
        display: "flex",
        position: "absolute",
        width: "100%",
        height: "auto",
        bottom: 0,
        gap: "2vw",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 0 1% 0",
        zIndex: 20,
        boxSizing: "border-box",
    };

    const buttonStyle: React.CSSProperties = {
        borderRadius: "1vh",
        border: "none",
        fontSize: "clamp(0.8vw, 0.8rem, 1.2vw)",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        padding: "1.2vh 2.4vw",
        minHeight: "4.4vh",
        flex: "0 1 auto",
    };

    const resetButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: isDark
            ? "linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)"
            : "linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)",
        color: "white",
        padding: "1.4vh 3vw",
        minWidth: "18vw",
    };

    const showAnswerButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: isDark 
            ? "linear-gradient(135deg, #0A84FF 0%, #0051D5 100%)"
            : "linear-gradient(135deg, #007AFF 0%, #0051D5 100%)",
        color: "white",
    };

    const correctButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: isDark
            ? "linear-gradient(135deg, #34C759 0%, #30D158 100%)"
            : "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
        color: "white",
    };

    const wrongButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: isDark
            ? "linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%)"
            : "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
        color: "white",
    };

    const skipButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
        color: isDark ? "#ccc" : "#666",
        border: isDark ? "0.1vh solid rgba(255,255,255,0.2)" : "0.1vh solid rgba(0,0,0,0.15)",
    };

    const learnedButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: isDark
            ? "linear-gradient(135deg, #34C759 0%, #30D158 100%)"
            : "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
        color: "white",
    };

    const progressStyle: React.CSSProperties = {
        fontSize: "calc(0.7vw + 0.7vh)",
        color: isDark ? "#ccc" : "#666",
        textAlign: "center",
        marginBottom: "2vh",
    };

    const emptyStateContentStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2vh",
        height: "100%",
        padding: "4vh 6vw",
        textAlign: "center",
        color: isDark ? "#ccc" : "#666",
    };

    const emptyStateTitleStyle: React.CSSProperties = {
        fontSize: "calc(1.1vw + 1.1vh)",
        fontWeight: 600,
        color: isDark ? "#f0f0f0" : "#333",
        lineHeight: 1.6,
    };

    const resetFeedbackStyle: React.CSSProperties = {
        fontSize: "calc(0.8vw + 0.8vh)",
        color: isDark ? "#8E8E93" : "#666",
        maxWidth: "28vw",
        lineHeight: 1.6,
    };


    if (loading) {
        return (
            <div style={outerContainerStyle}>
                <CloseButton onClick={closePopup} iconColor={isDark ? "#fff" : "#333"} />
                <div style={{ textAlign: "center", padding: "4vh 4vw", color: isDark ? "#ccc" : "#666" }}>
                    {t("loading")}
                </div>
            </div>
        );
    }

    if (!currentWord || wordIds.length === 0) {
        return (
            <div style={outerContainerStyle}>
                <CloseButton onClick={closePopup} iconColor={isDark ? "#fff" : "#333"} />
                <div style={emptyStateContentStyle}>
                    <div style={emptyStateTitleStyle}>{t("allWordsMastered")}</div>
                    {resetFeedback && <div style={resetFeedbackStyle}>{resetFeedback}</div>}
                    <button
                        style={{
                            ...resetButtonStyle,
                            opacity: isResetting ? 0.6 : 1,
                            cursor: isResetting ? "not-allowed" : resetButtonStyle.cursor ?? "pointer",
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

    return (
        <div data-test-id="div-test-21" style={outerContainerStyle} data-testid="FlashcardStudy-0">
            <div data-test-id="div-test-20" style={{ position: "absolute", top: "2vh", right: "2vw", zIndex: 10 }} data-testid="FlashcardStudy-1">
                <CloseButton data-test-id="closebutton-test" onClick={closePopup} iconColor={isDark ? "#fff" : "#333"} />
            </div>
            <div data-test-id="div-test-19" style={{ position: "absolute", top: "2vh", left: "2vw", zIndex: 10, ...progressStyle }} data-testid="FlashcardStudy-2">
                {currentIndex + 1} / {wordIds.length}
            </div>
                {/* 卡片容器包装 */}
                <div data-test-id="div-test-18" style={cardWrapperStyle}>
                    {/* 3D卡片容器 */}
                    <div data-test-id="div-test-17" style={card3DContainerStyle}>
                        {/* 卡片正面（问题面） */}
                        <div
                            data-test-id="div-test-16" style={cardFaceStyle}
                            data-testid="FlashcardStudy-5"
                        >
                            <div data-test-id="div-test-15" style={wordTextStyle} data-testid="FlashcardStudy-6">
                                {currentWord.kanji || currentWord.kana}
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
                                padding: "1vh 0",
                            };

                            // 可滚动的例句容器样式
                            const exampleContainerStyle: React.CSSProperties = {
                                width: "100%",
                                flex: 0.73,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                boxSizing: "border-box",
                                overflowY: "auto",
                                overflowX: "hidden",
                                minHeight: 0,
                                padding: "1vh 0",
                                // 自定义滚动条样式
                                scrollbarWidth: "thin",
                                scrollbarColor: isDark ? "rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1)",
                            };

                            // 例句内容样式
                            const exampleContentStyle: React.CSSProperties = {
                                fontSize: "calc(0.6vw + 0.6vh)",
                                color: isDark ? "#ccc" : "#666",
                                fontStyle: "italic",
                                lineHeight: "1.8",
                                textAlign: "center",
                                padding: "0 2vw",
                                width: "100%",
                                boxSizing: "border-box",
                                whiteSpace: "pre-line", // 保留换行符，自动换行
                            };

                            return (
                                <div data-test-id="div-test-14" style={cardBackStyle} data-testid="FlashcardStudy-answer">
                                    {/* 固定内容区域 */}
                                    <div data-test-id="div-test-13" style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        width: "100%",
                                        flexShrink: 0,
                                    }}>
                                        {currentWord.kanji && (
                                            <div data-test-id="div-test-12" style={fixedContentItemStyle}>
                                                <div data-test-id="div-test-11" style={labelStyle}>{t("kanji")}</div>
                                                <div data-test-id="div-test-10" style={{ fontSize: "calc(2.3vw + 2vh)", fontWeight: "bold", color: isDark ? "#fff" : "#333", marginTop: "1vh" }}>
                                                    {currentWord.kanji}
                                                </div>
                                            </div>
                                        )}
                                        <div data-test-id="div-test-9" style={fixedContentItemStyle}>
                                            <div data-test-id="div-test-8" style={labelStyle}>{t("kana")}</div>
                                            <div data-test-id="div-test-7" style={{ fontSize: "calc(1.6vw + 1.6vh)", color: isDark ? "#fff" : "#333", fontWeight: "500", marginTop: "1vh" }}>
                                                {currentWord.kana}
                                            </div>
                                        </div>
                                        <div data-test-id="div-test-6" style={fixedContentItemStyle}>
                                            <div data-test-id="div-test-5" style={labelStyle}>{t("meaning")}</div>
                                            <div data-test-id="div-test-4" style={{ fontSize: "calc(1.1vw + 1.1vh)", color: isDark ? "#ccc" : "#666", marginTop: "1vh", lineHeight: "1.6", textAlign: "center", padding: "0 2vw" }}>
                                                {currentWord.meaning}
                                            </div>
                                        </div>
                                    </div>
                                    <div data-test-id="div-test-2" style={labelStyle}>{t("example")}</div>
                                    {/* 可滚动的例句区域 */}
                                    {currentWord.example && (
                                        <div 
                                            data-test-id="div-test-3" style={exampleContainerStyle}
                                            className="example-scroll-container"
                                        >
                                            
                                            <div data-test-id="div-test-1" style={exampleContentStyle}>
                                                {currentWord.example}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

            {/* 按钮组 - 根据 showAnswer 状态显示不同按钮 */}
            <div data-test-id="div-test" style={buttonGroupStyle} data-testid="FlashcardStudy-buttonGroup">
                {!showAnswer ? (
                    <>
                        <button
                            data-test-id="button-test-4" style={learnedButtonStyle}
                            onClick={() => handleResult("correct")}
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
                            data-testid="FlashcardStudy-learned"
                        >
                            {t("learned")}
                        </button>
                        <button
                            data-test-id="button-test-3" style={showAnswerButtonStyle}
                            onClick={handleShowAnswer}
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
                            data-testid="FlashcardStudy-showAnswer"
                        >
                            {t("showAnswer")}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            data-test-id="button-test-2" style={correctButtonStyle}
                            onClick={() => handleResult("correct")}
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
                            data-testid="FlashcardStudy-22"
                        >
                            {t("correct")}
                        </button>
                        <button
                            data-test-id="button-test-1" style={wrongButtonStyle}
                            onClick={() => handleResult("wrong")}
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
                            data-testid="FlashcardStudy-23"
                        >
                            {t("wrong")}
                        </button>
                        <button
                            data-test-id="button-test" style={skipButtonStyle}
                            onClick={() => handleResult("skip")}
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

