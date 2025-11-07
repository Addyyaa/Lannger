import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
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
        background: isDark
            ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        borderRadius: "12px",
        padding: "32px",
        minWidth: "400px",
        maxWidth: "600px",
        maxHeight: "70vh",
        overflowY: "auto",
        boxShadow: isDark
            ? "0 8px 32px rgba(0, 0, 0, 0.4)"
            : "0 8px 32px rgba(0, 0, 0, 0.15)",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        position: "relative",
    };

    const titleStyle: React.CSSProperties = {
        fontSize: "24px",
        fontWeight: "bold",
        color: isDark ? "#fff" : "#333",
        marginBottom: "24px",
        textAlign: "center",
    };

    const wordSetListStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    };

    const wordSetItemStyle: React.CSSProperties = {
        padding: "16px",
        background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
        borderRadius: "8px",
        border: isDark ? "1px solid #555" : "1px solid #e0e0e0",
        cursor: "pointer",
        transition: "all 0.3s ease",
    };

    const wordSetNameStyle: React.CSSProperties = {
        fontSize: "16px",
        fontWeight: "500",
        color: isDark ? "#fff" : "#333",
    };

    const allWordsStyle: React.CSSProperties = {
        ...wordSetItemStyle,
        background: isDark ? "rgba(0, 180, 255, 0.1)" : "rgba(0, 180, 255, 0.05)",
        borderColor: "#00b4ff",
    };

    return (
        <div style={containerStyle}>
            <CloseButton
                onClick={closePopup}
                style={{ position: "absolute", top: "16px", right: "16px" }}
                iconColor={isDark ? "#fff" : "#333"}
            />
            <h2 style={titleStyle}>{t("selectWordSet")}</h2>
            {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: isDark ? "#ccc" : "#666" }}>
                    {t("loading")}
                </div>
            ) : (
                <div style={wordSetListStyle}>
                    <div
                        style={allWordsStyle}
                        onClick={() => onSelectWordSet(undefined)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateX(4px)";
                            e.currentTarget.style.boxShadow = isDark
                                ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                                : "0 4px 12px rgba(0, 180, 255, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateX(0)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    >
                        <div style={wordSetNameStyle}>{t("wordListAllWords")}</div>
                    </div>
                    {wordSets.map((wordSet) => (
                        <div
                            key={wordSet.id}
                            style={wordSetItemStyle}
                            onClick={() => onSelectWordSet(wordSet.id)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateX(4px)";
                                e.currentTarget.style.boxShadow = isDark
                                    ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                                    : "0 4px 12px rgba(0, 180, 255, 0.2)";
                                e.currentTarget.style.borderColor = "#00b4ff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateX(0)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.borderColor = isDark ? "#555" : "#e0e0e0";
                            }}
                        >
                            <div style={wordSetNameStyle}>{wordSet.name || t("unnamed")}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

