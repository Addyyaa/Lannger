import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tooltip } from "antd";
import { List, RowComponentProps } from "react-window";
import { Word, WordSet } from "../db";
import * as dbOperator from "../store/wordStore";
import { useTheme } from "../main";

/**
 * 单词列表页面组件
 * 根据路由参数中的 wordSetId 显示对应单词集的单词列表
 */
export default function WordsList() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const wordSetId = id ? parseInt(id, 10) : null;
    const [words, setWords] = useState<Word[]>([]);
    const [wordSets, setWordSets] = useState<WordSet[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // 虚拟列表配置常量
    const COLUMN_TEMPLATE = "1.5fr 1.5fr 2fr 1.5fr 1.5fr 1fr";
    const ROW_HEIGHT = 60;
    const MAX_LIST_HEIGHT = 600;

    // 创建单词集ID到名称的映射
    const wordSetMap = useMemo(() => {
        const map = new Map<number, string>();
        wordSets.forEach((set) => {
            map.set(set.id, set.name);
        });
        return map;
    }, [wordSets]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 获取所有单词集
                const fetchedWordSets = await dbOperator.getAllWordSets();
                setWordSets(fetchedWordSets);

                // 获取单词列表
                if (wordSetId && !isNaN(wordSetId)) {
                    const fetchedWords = await dbOperator.getWordsByWordSet(wordSetId);
                    setWords(fetchedWords);
                } else {
                    const fetchedWords = await dbOperator.getAllWords();
                    setWords(fetchedWords);
                }
            } catch (error) {
                console.error(t("fetchWordsError"), error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [wordSetId]);
    // 返回按钮样式
    const backButtonStyle: React.CSSProperties = {
        background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "12px 24px",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 15px rgba(0, 180, 255, 0.3)",
        marginBottom: "20px",
    };

    // 页面容器样式
    const containerStyle: React.CSSProperties = {
        padding: "20px",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
    };

    // 标题容器样式
    const headerStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "24px",
        flexWrap: "wrap",
    };

    // 标题样式
    const titleStyle: React.CSSProperties = {
        fontSize: "24px",
        fontWeight: "bold",
        color: isDark ? "#f5f5f5" : "#333",
        margin: 0,
    };

    // 列表容器样式
    const listContainerStyle: React.CSSProperties = {
        width: "100%",
        maxHeight: MAX_LIST_HEIGHT + 56,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "8px",
        background: isDark ? "#111" : "#fff",
        boxShadow: isDark
            ? "0 4px 20px rgba(0, 0, 0, 0.3)"
            : "0 4px 20px rgba(0, 0, 0, 0.1)",
    };

    // 粘性表头样式
    const stickyThStyle: React.CSSProperties = {
        padding: "12px",
        textAlign: "left",
        fontWeight: "bold",
        fontSize: "16px",
        color: isDark ? "#f5f5f5" : "#333",
        background: isDark ? "rgba(0, 0, 0, 0.8)" : "#f8f9fa",
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        display: "grid",
        gridTemplateColumns: COLUMN_TEMPLATE,
        alignItems: "center",
        borderRadius: "8px 8px 0 0",
        minHeight: "56px",
        borderBottom: isDark ? "2px solid rgba(255,255,255,0.2)" : "2px solid #ddd",
    };

    // 计算列表高度
    const listHeight = useMemo(() => {
        return Math.min(MAX_LIST_HEIGHT, words.length * ROW_HEIGHT);
    }, [words.length]);

    // 列表样式
    const listStyle = useMemo<React.CSSProperties>(
        () => ({
            height: listHeight,
            width: "100%",
            overflowX: "hidden",
            background: isDark ? "#111" : "#fff",
            scrollbarWidth: "thin",
        }),
        [isDark, listHeight]
    );

    // 基础单元格样式
    const baseCellStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "left",
        fontSize: "14px",
        padding: "0 12px",
        color: isDark ? "#f5f5f5" : "#333",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    };

    // 可点击单元格样式（用于显示例句）
    const clickableCellStyle: React.CSSProperties = {
        ...baseCellStyle,
        cursor: "pointer",
        transition: "background-color 0.2s ease",
    };

    // 获取单词集名称
    const getWordSetName = useCallback((setId?: number): string => {
        if (setId === undefined || setId === null) {
            return t("defaultWordSet");
        }
        return wordSetMap.get(setId) || t("unknown");
    }, [wordSetMap, t]);

    // 获取难度系数显示
    const getDifficulty = useCallback((word: Word): string => {
        // 检查 review 对象和 difficulty 字段
        if (word.review && word.review.difficulty !== undefined && word.review.difficulty !== null) {
            return word.review.difficulty.toString();
        }
        return "-";
    }, []);

    // 获取单词的回调函数（用于虚拟列表）
    const getWord = useCallback(
        (index: number) => words[index],
        [words]
    );

    // 空状态样式
    const emptyStateStyle: React.CSSProperties = {
        textAlign: "center",
        padding: "6vh 0",
        borderRadius: "8px",
    };

    // 处理返回按钮点击
    const handleBack = () => {
        navigate("/manage");
    };

    // 虚拟行组件类型定义
    type VirtualRowExtraProps = {
        getWord: (index: number) => Word;
        getWordSetName: (setId?: number) => string;
        getDifficulty: (word: Word) => string;
    };

    // 虚拟行组件
    const VirtualRow = ({
        index,
        style,
        ariaAttributes,
        getWord: getWordItem,
        getWordSetName: getSetName,
        getDifficulty: getDiff,
    }: RowComponentProps<VirtualRowExtraProps>) => {
        const word = getWordItem(index);
        const rowBackground = isDark ? "rgb(41, 40, 40)" : "rgb(243, 240, 240)";

        return (
            <div
                {...ariaAttributes}
                role="row"
                aria-rowindex={index + 2}
                style={{
                    ...style,
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: COLUMN_TEMPLATE,
                    alignItems: "stretch",
                    boxSizing: "border-box",
                    padding: "0 16px",
                    height: ROW_HEIGHT,
                    background: rowBackground,
                    borderBottom: isDark
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "1px solid rgba(0,0,0,0.05)",
                }}
            >
                <Tooltip
                    title={
                        word.example ? (
                            <div style={{ maxWidth: "300px", whiteSpace: "pre-wrap" }}>
                                {word.example}
                            </div>
                        ) : (
                            <div>{t("noExample")}</div>
                        )
                    }
                    mouseEnterDelay={0.3}
                    placement="right"
                    styles={{
                        body: {
                            backgroundColor: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
                            color: isDark ? "#fff" : "#333",
                            maxHeight: "30vh",
                            maxWidth: "400px",
                            overflow: "auto",
                            scrollbarWidth: "thin",
                            padding: "12px",
                            borderRadius: "8px",
                            boxShadow: isDark
                                ? "0 4px 20px rgba(0, 0, 0, 0.5)"
                                : "0 4px 20px rgba(0, 0, 0, 0.2)",
                        },
                    }}
                >
                    <div
                        style={clickableCellStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDark
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 180, 255, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        {word.kana || "-"}
                    </div>
                </Tooltip>
                <div style={baseCellStyle}>{word.kanji || "-"}</div>
                <div style={baseCellStyle}>{word.meaning || "-"}</div>
                <div style={baseCellStyle}>{getSetName(word.setId)}</div>
                <div style={baseCellStyle}>{word.mark || "-"}</div>
                <div style={baseCellStyle}>{getDiff(word)}</div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={containerStyle}>
                <div style={{ textAlign: "center", padding: "40px" }}>
                    <p style={{ color: isDark ? "#f5f5f5" : "#333" }}>{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <button
                    onClick={handleBack}
                    style={backButtonStyle}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 180, 255, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 180, 255, 0.3)";
                    }}
                    aria-label={t("back")}
                >
                    ← {t("back")}
                </button>
                <h1 style={titleStyle}>
                    {t("wordListTitle")} {wordSetId ? `(${t("wordListWordSetId")}: ${wordSetId})` : `(${t("wordListAllWords")})`}
                </h1>
            </div>
            {words.length === 0 ? (
                <div style={emptyStateStyle}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
                    <p style={{ color: isDark ? "#ccc" : "#666" }}>{t("noWords")}</p>
                </div>
            ) : (
                <div style={listContainerStyle} role="table" aria-label={t("wordList")}>
                    <div style={stickyThStyle} role="row" data-testid="words-table-header">
                        <span role="columnheader">{t("kana")}</span>
                        <span role="columnheader">{t("kanji")}</span>
                        <span role="columnheader">{t("meaning")}</span>
                        <span role="columnheader">{t("wordSet")}</span>
                        <span role="columnheader">{t("mark")}</span>
                        <span role="columnheader">{t("difficulty")}</span>
                    </div>
                    <List
                        style={listStyle}
                        overscanCount={6}
                        rowCount={words.length}
                        rowHeight={ROW_HEIGHT}
                        rowComponent={VirtualRow}
                        rowProps={{
                            getWord,
                            getWordSetName,
                            getDifficulty,
                        }}
                        aria-label={t("wordList")}
                    />
                </div>
            )}
        </div>
    );
}