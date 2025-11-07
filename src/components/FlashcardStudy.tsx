import React, { useState, useEffect, useRef } from "react";
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
    const [sessionStats, setSessionStats] = useState({
        studiedCount: 0,
        correctCount: 0,
        wrongCount: 0,
    });
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        loadWords();
    }, [wordSetId]);

    useEffect(() => {
        if (wordIds.length > 0 && currentIndex < wordIds.length) {
            loadCurrentWord();
        }
    }, [wordIds, currentIndex]);

    const loadWords = async () => {
        try {
            setLoading(true);
            const result = await scheduleFlashcardWords({
                wordSetId,
                limit: 50,
            });
            setWordIds(result.wordIds);
            setCurrentIndex(0);
        } catch (error) {
            console.error("加载单词失败:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadCurrentWord = async () => {
        if (currentIndex >= wordIds.length) {
            // 学习完成
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
    };

    const cardBackStyle: React.CSSProperties = {
        ...cardFaceBaseStyle,
        transform: "rotateY(180deg)",
        padding: "4vh 3vw",
        overflowY: "auto",
        cursor: "default",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: "calc(0.7vw + 0.7vh)",
        color: isDark ? "#999" : "#999",
        marginBottom: "0.8vh",
        textAlign: "left",
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
        position: "absolute",   // TODO  调试样式
        width: "100%",
        height: "auto",
        bottom: "5%",
        gap: "5%",
        justifyContent: "center",
        alignItems: "center",
    };

    const buttonStyle: React.CSSProperties = {
        borderRadius: "1vw",
        position: "absolute",
        bottom: "5",
        left: "50%",
        transform: "translateX(-50%)",
        border: "none",
        fontSize: "calc(0.8vw + 0.8vh)",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.3s ease",
    };

    const showAnswerButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
        color: "white",
    };

    const correctButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
        color: "white",
    };

    const wrongButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
        color: "white",
    };

    const skipButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
        color: isDark ? "#ccc" : "#666",
    };

    const learnedButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
        color: "white",
    };

    const progressStyle: React.CSSProperties = {
        fontSize: "calc(0.7vw + 0.7vh)",
        color: isDark ? "#ccc" : "#666",
        textAlign: "center",
        marginBottom: "2vh",
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
                <div style={{ textAlign: "center", padding: "4vh 4vw", color: isDark ? "#ccc" : "#666" }}>
                    {t("noWords")}
                </div>
            </div>
        );
    }

    return (
        <div style={outerContainerStyle} data-testid="FlashcardStudy-0">
            <div style={{ position: "absolute", top: "2vh", right: "2vw", zIndex: 10 }} data-testid="FlashcardStudy-1">
                <CloseButton onClick={closePopup} iconColor={isDark ? "#fff" : "#333"} />
            </div>
            <div style={{ position: "absolute", top: "2vh", left: "2vw", zIndex: 10, ...progressStyle }} data-testid="FlashcardStudy-2">
                {currentIndex + 1} / {wordIds.length}
            </div>
            <div style={cardWrapperStyle} data-testid="FlashcardStudy-cardWrapper">
                {/* 卡片正面（问题面） */}
                {!showAnswer && (
                    <div
                        style={cardFaceStyle}
                        data-testid="FlashcardStudy-5"
                    >
                        <div style={wordTextStyle} data-testid="FlashcardStudy-6">
                            {currentWord.kanji || currentWord.kana}
                        </div>
                        <div style={buttonGroupStyle}>
                            <button
                                style={learnedButtonStyle}
                                onClick={() => handleResult("correct")}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-0.6vh)";
                                    e.currentTarget.style.boxShadow = "0 1vw 3vw rgba(76, 175, 80, 0.4)";
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
                                style={showAnswerButtonStyle}
                                onClick={handleShowAnswer}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-0.6vh)";
                                    e.currentTarget.style.boxShadow = "0 1vw 3vw rgba(0, 180, 255, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                data-testid="FlashcardStudy-showAnswer"
                            >
                                {t("showAnswer")}
                            </button>
                        </div>
                    </div>
                )}

                {/* 卡片背面（答案面） */}
                {showAnswer && (
                    <div style={cardBackStyle} data-testid="FlashcardStudy-answer">
                        {currentWord.kanji && (
                            <div style={{ marginBottom: "3vh" }}>
                                <div style={labelStyle}>{t("kanji")}</div>
                                <div style={{ fontSize: "calc(2.3vw + 2vh)", fontWeight: "bold", color: isDark ? "#fff" : "#333", marginTop: "1vh" }}>
                                    {currentWord.kanji}
                                </div>
                            </div>
                        )}
                        <div style={{ marginBottom: "3vh" }}>
                            <div style={labelStyle}>{t("kana")}</div>
                            <div style={{ fontSize: "calc(1.6vw + 1.6vh)", color: isDark ? "#fff" : "#333", fontWeight: "500", marginTop: "1vh" }}>
                                {currentWord.kana}
                            </div>
                        </div>
                        <div style={{ marginBottom: currentWord.example ? "3vh" : "0" }}>
                            <div style={labelStyle}>{t("meaning")}</div>
                            <div style={{ fontSize: "calc(1.1vw + 1.1vh)", color: isDark ? "#ccc" : "#666", marginTop: "1vh", lineHeight: "1.6" }}>
                                {currentWord.meaning}
                            </div>
                        </div>
                        {currentWord.example && (
                            <div style={{ marginTop: "3vh" }}>
                                <div style={labelStyle}>{t("example")}</div>
                                <div style={{ fontSize: "calc(0.9vw + 0.9vh)", color: isDark ? "#ccc" : "#666", fontStyle: "italic", lineHeight: "1.6", marginTop: "1vh" }}>
                                    {currentWord.example}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div style={buttonGroupStyle} data-testid="FlashcardStudy-buttonGroup">
                {showAnswer && (
                    <>
                        <button
                            style={correctButtonStyle}
                            onClick={() => handleResult("correct")}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-0.6vh)";
                                e.currentTarget.style.boxShadow = "0 1vw 3vw rgba(76, 175, 80, 0.4)";
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
                            style={wrongButtonStyle}
                            onClick={() => handleResult("wrong")}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-0.6vh)";
                                e.currentTarget.style.boxShadow = "0 1vw 3vw rgba(244, 67, 54, 0.4)";
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
                            style={skipButtonStyle}
                            onClick={() => handleResult("skip")}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-0.6vh)";
                                e.currentTarget.style.boxShadow = isDark
                                    ? "0 1vw 3vw rgba(0, 0, 0, 0.3)"
                                    : "0 1vw 3vw rgba(0, 0, 0, 0.2)";
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

