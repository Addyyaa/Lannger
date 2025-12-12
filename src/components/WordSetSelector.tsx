import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import { WordSet } from "../db";
import { useWordStore, useUIStore } from "../store/hooks";
import { handleErrorSync } from "../utils/errorHandler";
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
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // 只选择需要的函数，避免整个 store 对象变化导致重渲染
    const loadWordSetsFromStore = useWordStore((state) => state.loadWordSets);
    const wordSetsFromStore = useWordStore((state) => state.wordSets);
    const setUILoading = useUIStore((state) => state.setLoading);

    const loadWordSets = React.useCallback(async () => {
        try {
            setLoading(true);
            setUILoading("wordSetSelector", true);
            setError(null);
            
            // 获取单词集
            await loadWordSetsFromStore();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "加载单词集失败，请重试";
            handleErrorSync(error, { operation: "loadWordSets" });
            setError(errorMessage);
            
            // 如果重试次数少于3次，自动重试一次
            setRetryCount(prev => {
                if (prev < 3) {
                    // 清除之前的定时器
                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current);
                    }
                    // 设置新的定时器
                    retryTimeoutRef.current = setTimeout(() => {
                        loadWordSets();
                    }, 1000);
                    return prev + 1;
                }
                return prev;
            });
        } finally {
            setLoading(false);
            setUILoading("wordSetSelector", false);
        }
    }, [loadWordSetsFromStore, setUILoading]);

    // 当 store 中的 wordSets 变化时，更新本地状态
    React.useEffect(() => {
        if (wordSetsFromStore) {
            // 验证返回的数据
            if (!Array.isArray(wordSetsFromStore)) {
                return;
            }
            
            // 过滤掉无效的单词集
            const validSets = wordSetsFromStore.filter(set => set && typeof set.id === 'number' && set.name);
            
            if (validSets.length === 0 && wordSetsFromStore.length > 0) {
                console.warn("所有单词集数据无效，但原始数据存在", wordSetsFromStore);
                // 即使数据无效，也尝试显示原始数据
                setWordSets(wordSetsFromStore);
            } else {
                setWordSets(validSets);
            }
            
            setRetryCount(0); // 重置重试计数
        }
    }, [wordSetsFromStore]);

    useEffect(() => {
        loadWordSets();
        // 清理函数：组件卸载时清除定时器
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [loadWordSets]);

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
        // 增加顶部边距，避免被关闭按钮或其他元素遮挡
        marginTop: isPortrait ? "4vw" : "0",
        textAlign: "center",
        // 为关闭按钮留出空间（关闭按钮在右上角）
        paddingRight: isPortrait ? "8vw" : "0",
        paddingLeft: isPortrait ? "2vw" : "0",
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
                <div data-test-id="div-test-5" style={{ 
                    textAlign: "center", 
                    padding: isPortrait ? "6vw" : "2.5vw", 
                    fontSize: isPortrait ? "3.5vw" : "1vw", 
                    color: isDark ? "#ccc" : "#666" 
                }}>
                    {retryCount > 0 ? `${t("loading")} (重试 ${retryCount}/3)` : t("loading")}
                </div>
            ) : error ? (
                <div data-test-id="div-test-error" style={{
                    textAlign: "center",
                    padding: isPortrait ? "6vw" : "2.5vw",
                    display: "flex",
                    flexDirection: "column",
                    gap: isPortrait ? "3vw" : "1vw",
                    alignItems: "center"
                }}>
                    <div style={{
                        fontSize: isPortrait ? "3.5vw" : "1vw",
                        color: "#ff4444",
                        marginBottom: isPortrait ? "2vw" : "0.5vw"
                    }}>
                        {error}
                    </div>
                    <button
                        onClick={loadWordSets}
                        style={{
                            padding: isPortrait ? "2.5vw 5vw" : "0.75vw 1.5vw",
                            fontSize: isPortrait ? "3.5vw" : "1vw",
                            backgroundColor: "#00b4ff",
                            color: "#fff",
                            border: "none",
                            borderRadius: isPortrait ? "1.5vw" : "0.5vw",
                            cursor: "pointer",
                            fontWeight: "500",
                            transition: "all 0.3s ease"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#0096d4";
                            e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#00b4ff";
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                    >
                        {t("retry") || "重试"}
                    </button>
                </div>
            ) : wordSets.length === 0 ? (
                <div data-test-id="div-test-empty" style={{
                    textAlign: "center",
                    padding: isPortrait ? "6vw" : "2.5vw",
                    fontSize: isPortrait ? "3.5vw" : "1vw",
                    color: isDark ? "#ccc" : "#666"
                }}>
                    {t("noWordSets") || "暂无单词集"}
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

