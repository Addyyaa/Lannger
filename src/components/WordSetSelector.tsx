import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import { WordSet } from "../db";
import * as dbOperator from "../store/wordStore";
import CloseButton from "./CloseButton";

interface WordSetSelectorProps {
    closePopup: () => void;
    onSelectWordSet: (wordSetId: number | undefined) => void;
}

/**
 * 单词集选择弹窗组件
 */
export default function WordSetSelector({ closePopup, onSelectWordSet }: WordSetSelectorProps) {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const { isPortrait } = useOrientation();
    const [wordSets, setWordSets] = useState<WordSet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWordSets();
    }, []);

    const loadWordSets = async () => {
        try {
            setLoading(true);
            const sets = await dbOperator.getAllWordSets();
            setWordSets(sets);
        } catch (error) {
            console.error("加载单词集失败:", error);
        } finally {
            setLoading(false);
        }
    };

    const containerStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        background: isDark
            ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        borderRadius: isPortrait ? "3vw" : "0.75vw",
        padding: isPortrait ? "5vw 4vw" : "2vw",
        minWidth: isPortrait ? "85%" : "25vw",
        maxWidth: isPortrait ? "85%" : "37.5vw",
        width: isPortrait ? "85%" : "auto",
        maxHeight: isPortrait ? "65vh" : "70vh",
        overflowY: "auto",
        boxShadow: isDark
            ? isPortrait ? "0 1.5vw 6vw rgba(0, 0, 0, 0.5)" : "0 0.5vw 2vw rgba(0, 0, 0, 0.4)"
            : isPortrait ? "0 1.5vw 6vw rgba(0, 0, 0, 0.2)" : "0 0.5vw 2vw rgba(0, 0, 0, 0.15)",
        border: isDark ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #444` : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
        position: "relative",
        margin: "0 auto",
    };

    const titleStyle: React.CSSProperties = {
        fontSize: isPortrait ? "4.5vw" : "1.5vw",
        fontWeight: "bold",
        color: isDark ? "#fff" : "#333",
        marginBottom: isPortrait ? "3.5vw" : "1.5vw",
        marginTop: isPortrait ? "2vw" : "0",
        textAlign: "center",
        paddingRight: isPortrait ? "6vw" : "0",
    };

    const wordSetListStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: isPortrait ? "2.5vw" : "0.75vw",
        width: "100%",
    };

    const wordSetItemStyle: React.CSSProperties = {
        padding: isPortrait ? "3.5vw 3vw" : "1vw",
        background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
        borderRadius: isPortrait ? "2.5vw" : "0.5vw",
        border: isDark ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #555` : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
        cursor: "pointer",
        transition: "all 0.3s ease",
        width: "100%",
        boxSizing: "border-box",
    };

    const wordSetNameStyle: React.CSSProperties = {
        fontSize: isPortrait ? "3.8vw" : "1vw",
        fontWeight: "500",
        color: isDark ? "#fff" : "#333",
        lineHeight: isPortrait ? "1.4" : "1.5",
    };

    const allWordsStyle: React.CSSProperties = {
        ...wordSetItemStyle,
        background: isDark ? "rgba(0, 180, 255, 0.1)" : "rgba(0, 180, 255, 0.05)",
        borderColor: "#00b4ff",
    };

    return (
        <div data-test-id="div-test-6" style={containerStyle}>
            <CloseButton
                data-test-id="closebutton-test" onClick={closePopup}
                style={{ position: "absolute", top: isPortrait ? "3.5vw" : "1vw", right: isPortrait ? "3.5vw" : "1vw", zIndex: 10 }}
                iconColor={isDark ? "#fff" : "#333"}
            />
            <h2 data-test-id="h2-test" style={titleStyle}>{t("selectWordSet")}</h2>
            {loading ? (
                <div data-test-id="div-test-5" style={{ textAlign: "center", padding: isPortrait ? "6vw" : "2.5vw", fontSize: isPortrait ? "3.5vw" : "1vw", color: isDark ? "#ccc" : "#666" }}>
                    {t("loading")}
                </div>
            ) : (
                <div data-test-id="div-test-4" style={wordSetListStyle}>
                    <div
                        data-test-id="div-test-3" style={allWordsStyle}
                        onClick={() => onSelectWordSet(undefined)}
                        onMouseEnter={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = `translateX(${isPortrait ? "1vw" : "0.25vw"})`;
                                e.currentTarget.style.boxShadow = isDark
                                    ? isPortrait ? "0 1vw 3vw rgba(0, 0, 0, 0.3)" : "0 0.25vw 0.75vw rgba(0, 0, 0, 0.3)"
                                    : isPortrait ? "0 1vw 3vw rgba(0, 180, 255, 0.2)" : "0 0.25vw 0.75vw rgba(0, 180, 255, 0.2)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateX(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }
                        }}
                    >
                        <div data-test-id="div-test-2" style={wordSetNameStyle}>{t("wordListAllWords")}</div>
                    </div>
                    {wordSets.map((wordSet) => (
                        <div
                            data-test-id="div-test-1" key={wordSet.id}
                            style={wordSetItemStyle}
                            onClick={() => onSelectWordSet(wordSet.id)}
                            onMouseEnter={(e) => {
                                if (!isPortrait) {
                                    e.currentTarget.style.transform = `translateX(${isPortrait ? "1vw" : "0.25vw"})`;
                                    e.currentTarget.style.boxShadow = isDark
                                        ? isPortrait ? "0 1vw 3vw rgba(0, 0, 0, 0.3)" : "0 0.25vw 0.75vw rgba(0, 0, 0, 0.3)"
                                        : isPortrait ? "0 1vw 3vw rgba(0, 180, 255, 0.2)" : "0 0.25vw 0.75vw rgba(0, 180, 255, 0.2)";
                                    e.currentTarget.style.borderColor = "#00b4ff";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isPortrait) {
                                    e.currentTarget.style.transform = "translateX(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.borderColor = isDark ? "#555" : "#e0e0e0";
                                }
                            }}
                        >
                            <div data-test-id="div-test" style={wordSetNameStyle}>{wordSet.name || t("unnamed")}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

