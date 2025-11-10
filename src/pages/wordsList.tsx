import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Tooltip } from "antd";
import { List, RowComponentProps } from "react-window";
import { Word, WordSet } from "../db";
import * as dbOperator from "../store/wordStore";
import { useTheme, useOrientation } from "../main";
import BackButton from "../components/BackButton";
import ConfirmWidget from "../components/ConfirmWidget";
import EditWordDialog from "../components/EditWordDialog";

/**
 * 单词列表页面组件
 * 根据路由参数中的 wordSetId 显示对应单词集的单词列表
 */
export default function WordsList() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const { isPortrait } = useOrientation();
    const wordSetId = id ? parseInt(id, 10) : null;
    const [words, setWords] = useState<Word[]>([]);
    const [wordSets, setWordSets] = useState<WordSet[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [deletePopup, setDeletePopup] = useState<boolean>(false);
    const [deleteWordId, setDeleteWordId] = useState<number | null>(null);
    const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
    const [batchDeletePopup, setBatchDeletePopup] = useState<boolean>(false);
    const [editingWord, setEditingWord] = useState<Word | null>(null);

    // 虚拟列表配置常量
    const COLUMN_TEMPLATE = isPortrait ? "0.8fr 1.8fr 1.8fr 2.5fr 1.5fr 1.5fr 1fr 1.5fr" : "0.5fr 1.4fr 1.4fr 2fr 1.4fr 1.4fr 1fr 1.2fr";
    const ROW_HEIGHT = isPortrait ? 80 : 60;
    const MAX_LIST_HEIGHT = isPortrait ? 500 : 600;

    // 创建单词集ID到名称的映射
    const wordSetMap = useMemo(() => {
        const map = new Map<number, string>();
        wordSets.forEach((set) => {
            map.set(set.id, set.name);
        });
        return map;
    }, [wordSets]);

    // 获取数据的函数
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // 获取所有单词集
            const fetchedWordSets = await dbOperator.getAllWordSets();
            setWordSets(fetchedWordSets);

            // 获取单词列表
            // 注意：wordSetId 可能是 0（默认词集ID），所以不能使用 wordSetId && 来判断
            if (wordSetId !== null && !isNaN(wordSetId)) {
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
    }, [wordSetId, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 监听窗口焦点事件，当页面重新获得焦点时刷新数据
    useEffect(() => {
        const handleFocus = () => {
            fetchData();
        };

        window.addEventListener("focus", handleFocus);
        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, [fetchData]);

    // 页面容器样式
    const containerStyle: React.CSSProperties = {
        padding: isPortrait ? "3vw" : "1.25vw",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
    };

    // 标题容器样式
    const headerStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: isPortrait ? "3vw" : "1vw",
        marginBottom: isPortrait ? "4vw" : "1.5vw",
        flexWrap: "wrap",
        position: "relative",
    };

    // 批量操作栏样式
    const batchActionBarStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: isPortrait ? "2.5vw" : "0.75vw",
        marginBottom: isPortrait ? "3vw" : "1vw",
        padding: isPortrait ? "3vw 4vw" : "0.75vw 1vw",
        borderRadius: isPortrait ? "2vw" : "0.5vw",
        background: isDark ? "rgba(255, 71, 87, 0.1)" : "rgba(255, 71, 87, 0.05)",
        border: isDark ? `${isPortrait ? "0.25vw" : "0.06vw"} solid rgba(255, 71, 87, 0.3)` : `${isPortrait ? "0.25vw" : "0.06vw"} solid rgba(255, 71, 87, 0.2)`,
    };

    // 标题样式
    const titleStyle: React.CSSProperties = {
        fontSize: isPortrait ? "4.5vw" : "1.5vw",
        fontWeight: "bold",
        color: isDark ? "#f5f5f5" : "#333",
        margin: 0,
    };

    // 列表容器样式
    const listContainerStyle: React.CSSProperties = {
        width: "100%",
        maxHeight: MAX_LIST_HEIGHT + (isPortrait ? 70 : 56),
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: isPortrait ? "2vw" : "0.5vw",
        background: isDark ? "#111" : "#fff",
        boxShadow: isDark
            ? isPortrait ? "0 1vw 5vw rgba(0, 0, 0, 0.3)" : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.3)"
            : isPortrait ? "0 1vw 5vw rgba(0, 0, 0, 0.1)" : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.1)",
        border: isDark ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #444` : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
    };

    // 粘性表头样式
    const stickyThStyle: React.CSSProperties = {
        padding: isPortrait ? "2vw 1.5vw" : "0.75vw",
        textAlign: "left",
        fontWeight: "bold",
        fontSize: isPortrait ? "3vw" : "1vw",
        color: isDark ? "#f5f5f5" : "#333",
        background: isDark ? "rgba(0, 0, 0, 0.8)" : "#f8f9fa",
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: "0 0.125vw 0.25vw rgba(0, 0, 0, 0.1)",
        display: "grid",
        gridTemplateColumns: COLUMN_TEMPLATE,
        alignItems: "center",
        borderRadius: isPortrait ? "2vw 2vw 0 0" : "0.5vw 0.5vw 0 0",
        minHeight: isPortrait ? "70px" : "56px",
        borderBottom: isDark ? `${isPortrait ? "0.25vw" : "0.125vw"} solid rgba(255,255,255,0.2)` : `${isPortrait ? "0.25vw" : "0.125vw"} solid #ddd`,
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
        fontSize: isPortrait ? "3vw" : "0.875vw",
        padding: isPortrait ? "0 2vw" : "0 0.75vw",
        color: isDark ? "#f5f5f5" : "#333",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        width: "100%",
    };

    // 可点击单元格样式（用于显示例句）
    const clickableCellStyle: React.CSSProperties = {
        ...baseCellStyle,
        cursor: "pointer",
        transition: "background-color 0.2s ease",
    };

    // 假名和汉字单元格样式（不使用省略号）
    const kanaKanjiCellStyle: React.CSSProperties = {
        ...baseCellStyle,
        textOverflow: "clip",
        overflow: "visible",
        whiteSpace: "normal",
        wordBreak: "break-all",
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
        padding: isPortrait ? "8vh 0" : "6vh 0",
        borderRadius: isPortrait ? "2vw" : "0.5vw",
        fontSize: isPortrait ? "3.5vw" : "1vw",
    };

    // 处理返回按钮点击
    const handleBack = () => {
        navigate("/manage");
    };

    // 处理删除单词
    const handleDeleteWord = useCallback(async () => {
        if (deleteWordId !== null) {
            try {
                await dbOperator.deleteWord(deleteWordId);
                setDeletePopup(false);
                setDeleteWordId(null);
                // 刷新列表
                fetchData();
            } catch (error) {
                console.error(t("deleteWordFailed"), error);
                alert(t("deleteWordFailed"));
            }
        }
    }, [deleteWordId, fetchData, t]);

    // 处理批量删除单词
    const handleBatchDeleteWords = useCallback(async () => {
        if (selectedWordIds.size === 0) {
            return;
        }
        try {
            const deletePromises = Array.from(selectedWordIds).map((wordId) =>
                dbOperator.deleteWord(wordId)
            );
            await Promise.all(deletePromises);
            setBatchDeletePopup(false);
            setSelectedWordIds(new Set());
            // 刷新列表
            fetchData();
        } catch (error) {
            console.error(t("deleteWordFailed"), error);
            alert(t("deleteWordFailed"));
        }
    }, [selectedWordIds, fetchData, t]);

    // 切换单词选中状态
    const toggleWordSelection = useCallback((wordId: number) => {
        setSelectedWordIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(wordId)) {
                newSet.delete(wordId);
            } else {
                newSet.add(wordId);
            }
            return newSet;
        });
    }, []);

    // 全选/取消全选
    const toggleSelectAll = useCallback(() => {
        if (selectedWordIds.size === words.length) {
            setSelectedWordIds(new Set());
        } else {
            const allIds = new Set(words.map((word) => word.id).filter((id): id is number => id !== undefined));
            setSelectedWordIds(allIds);
        }
    }, [selectedWordIds.size, words]);

    // 虚拟行组件类型定义
    type VirtualRowExtraProps = {
        getWord: (index: number) => Word;
        getWordSetName: (setId?: number) => string;
        getDifficulty: (word: Word) => string;
        selectedWordIds: Set<number>;
        toggleWordSelection: (wordId: number) => void;
    };

    // 虚拟行组件
    const VirtualRow = ({
        index,
        style,
        ariaAttributes,
        getWord: getWordItem,
        getWordSetName: getSetName,
        getDifficulty: getDiff,
        selectedWordIds,
        toggleWordSelection,
    }: RowComponentProps<VirtualRowExtraProps>) => {
        const word = getWordItem(index);
        const rowBackground = isDark ? "rgb(41, 40, 40)" : "rgb(243, 240, 240)";
        const isSelected = word.id !== undefined && selectedWordIds.has(word.id);

        // 复选框样式
        const checkboxStyle: React.CSSProperties = {
            ...baseCellStyle,
            justifyContent: "center",
            cursor: "pointer",
        };

        // 删除按钮样式
        const actionContainerStyle: React.CSSProperties = {
            ...baseCellStyle,
            justifyContent: "center",
            gap: isPortrait ? "2vw" : "0.75vw",
        };

        const editButtonStyle: React.CSSProperties = {
            width: isPortrait ? "7vw" : "2.25vw",
            height: isPortrait ? "7vw" : "2.25vw",
            borderRadius: isPortrait ? "2vw" : "0.625vw",
            border: "none",
            cursor: "pointer",
            background: isDark ? "rgba(0, 180, 255, 0.18)" : "rgba(0, 180, 255, 0.12)",
            color: isDark ? "#8dd9ff" : "#0096d4",
            fontSize: isPortrait ? "3.5vw" : "1.125vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: isDark ? (isPortrait ? "0 1vw 3vw rgba(0,180,255,0.25)" : "0 0.25vw 0.75vw rgba(0,180,255,0.25)") : (isPortrait ? "0 1vw 3vw rgba(0,150,212,0.18)" : "0 0.25vw 0.75vw rgba(0,150,212,0.18)"),
        };

        const deleteButtonStyle: React.CSSProperties = {
            width: isPortrait ? "7vw" : "2.25vw",
            height: isPortrait ? "7vw" : "2.25vw",
            borderRadius: isPortrait ? "2vw" : "0.625vw",
            border: "none",
            cursor: "pointer",
            background: isDark ? "rgba(255, 107, 107, 0.18)" : "rgba(255, 71, 87, 0.12)",
            color: isDark ? "#ff8a8a" : "#ff4757",
            fontSize: isPortrait ? "3.5vw" : "1.125vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: isDark ? (isPortrait ? "0 1vw 3vw rgba(255,107,107,0.25)" : "0 0.25vw 0.75vw rgba(255,107,107,0.25)") : (isPortrait ? "0 1vw 3vw rgba(255,71,87,0.18)" : "0 0.25vw 0.75vw rgba(255,71,87,0.18)"),
        };

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
                    padding: isPortrait ? "0 2vw" : "0 1vw",
                    height: ROW_HEIGHT,
                    background: isSelected
                        ? isDark
                            ? "rgba(0, 180, 255, 0.2)"
                            : "rgba(0, 180, 255, 0.1)"
                        : rowBackground,
                    borderBottom: isDark
                        ? `${isPortrait ? "0.25vw" : "0.06vw"} solid rgba(255,255,255,0.06)`
                        : `${isPortrait ? "0.25vw" : "0.06vw"} solid rgba(0,0,0,0.05)`,
                }}
            >
                <div style={checkboxStyle}>
                    <input
                        type="checkbox"
                        className="theme-checkbox"
                        checked={isSelected}
                        onChange={() => {
                            if (word.id !== undefined) {
                                toggleWordSelection(word.id);
                            }
                        }}
                        style={{
                            width: isPortrait ? "4.5vw" : "1.125vw",
                            height: isPortrait ? "4.5vw" : "1.125vw",
                            cursor: "pointer",
                            borderRadius: isPortrait ? "1vw" : "0.25vw",
                            outline: "none",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = isDark ? "rgba(0, 180, 255, 0.6)" : "rgba(0, 150, 212, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.25)";
                        }}
                        aria-label={t("selectWord")}
                    />
                </div>
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
                <div style={kanaKanjiCellStyle}>{word.kanji || "-"}</div>
                <Tooltip
                    title={
                        <div
                            style={{
                                maxHeight: "300px",
                                overflowY: "auto",
                                wordBreak: "break-word",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {word.meaning || "-"}
                        </div>
                    }
                    mouseEnterDelay={0.3}
                    placement="top"
                    styles={{
                        body: {
                            backgroundColor: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
                            color: isDark ? "#f5f5f5" : "#333",
                            maxWidth: "500px",
                            maxHeight: "400px",
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
                        {word.meaning || "-"}
                    </div>
                </Tooltip>
                <div style={baseCellStyle}>{getSetName(word.setId)}</div>
                <div style={baseCellStyle}>{word.mark || "-"}</div>
                <div style={baseCellStyle}>{getDiff(word)}</div>
                <div style={actionContainerStyle}>
                    <button
                        type="button"
                        style={editButtonStyle}
                        onClick={() => setEditingWord(word)}
                        onMouseEnter={(event) => {
                            if (!isPortrait) {
                                event.currentTarget.style.transform = "translateY(-0.125vw)";
                            }
                        }}
                        onMouseLeave={(event) => {
                            if (!isPortrait) {
                                event.currentTarget.style.transform = "translateY(0)";
                            }
                        }}
                        aria-label={t("edit")}
                        title={t("edit") || "edit"}
                    >
                        ✏️
                    </button>
                    <button
                        type="button"
                        style={deleteButtonStyle}
                        onClick={() => {
                            if (word.id !== undefined) {
                                setDeleteWordId(word.id);
                                setDeletePopup(true);
                            }
                        }}
                        onMouseEnter={(event) => {
                            if (!isPortrait) {
                                event.currentTarget.style.transform = "translateY(-0.125vw)";
                            }
                        }}
                        onMouseLeave={(event) => {
                            if (!isPortrait) {
                                event.currentTarget.style.transform = "translateY(0)";
                            }
                        }}
                        aria-label={t("delete")}
                        title={t("delete") || "delete"}
                    >
                        🗑️
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={containerStyle}>
                <div style={{ textAlign: "center", padding: isPortrait ? "8vw" : "2.5vw" }}>
                    <p style={{ color: isDark ? "#f5f5f5" : "#333", fontSize: isPortrait ? "3.5vw" : "1vw" }}>{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <BackButton onClick={handleBack} />
                <h1 style={titleStyle}>
                    {t("wordListTitle")} {wordSetId ? `(${wordSetMap.get(wordSetId) || t("unknown")})` : `(${t("wordListAllWords")})`}
                </h1>
            </div>
            {selectedWordIds.size > 0 && (
                <div style={batchActionBarStyle}>
                    <span style={{ color: isDark ? "#f5f5f5" : "#333", fontWeight: "500", fontSize: isPortrait ? "3.5vw" : "0.875vw" }}>
                        {t("selectedCount")}: {selectedWordIds.size}
                    </span>
                    <button
                        onClick={() => setBatchDeletePopup(true)}
                        style={{
                            background: "linear-gradient(135deg, #ff4757 0%, #ff3742 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: isPortrait ? "2vw" : "0.5vw",
                            padding: isPortrait ? "2vw 4vw" : "0.5vw 1vw",
                            fontSize: isPortrait ? "3.5vw" : "0.875vw",
                            fontWeight: "bold",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            boxShadow: isPortrait ? "0 1vw 3.75vw rgba(255, 71, 87, 0.3)" : "0 0.25vw 0.9375vw rgba(255, 71, 87, 0.3)",
                        }}
                        onMouseEnter={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(-0.125vw)";
                                e.currentTarget.style.boxShadow = "0 0.375vw 1.25vw rgba(255, 71, 87, 0.4)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = isPortrait ? "0 1vw 3.75vw rgba(255, 71, 87, 0.3)" : "0 0.25vw 0.9375vw rgba(255, 71, 87, 0.3)";
                            }
                        }}
                    >
                        {t("batchDelete")}
                    </button>
                </div>
            )}
            {words.length === 0 ? (
                <div style={emptyStateStyle}>
                    <div style={{ fontSize: isPortrait ? "12vw" : "3vw", marginBottom: isPortrait ? "4vw" : "1vw" }}>📚</div>
                    <p style={{ color: isDark ? "#ccc" : "#666" }}>{t("noWords")}</p>
                </div>
            ) : (
                <div style={listContainerStyle} role="table" aria-label={t("wordList")}>
                    <div style={stickyThStyle} role="row" data-testid="words-table-header">
                        <span role="columnheader" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <input
                                type="checkbox"
                                className="theme-checkbox"
                                checked={selectedWordIds.size === words.length && words.length > 0}
                                onChange={toggleSelectAll}
                                style={{
                                    width: "18px",
                                    height: "18px",
                                    cursor: "pointer",
                                    borderRadius: "4px",
                                    outline: "none",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = isDark ? "rgba(0, 180, 255, 0.6)" : "rgba(0, 150, 212, 0.5)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.25)";
                                }}
                                aria-label={t("selectAll")}
                            />
                        </span>
                        <span role="columnheader">{t("kana")}</span>
                        <span role="columnheader">{t("kanji")}</span>
                        <span role="columnheader">{t("meaning")}</span>
                        <span role="columnheader">{t("wordSet")}</span>
                        <span role="columnheader">{t("mark")}</span>
                        <span role="columnheader">{t("difficulty")}</span>
                        <span role="columnheader">{t("actions")}</span>
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
                            selectedWordIds,
                            toggleWordSelection,
                        }}
                        aria-label={t("wordList")}
                    />
                </div>
            )}
            {deletePopup && (
                <ConfirmWidget
                    title={t("deleteWord")}
                    message={t("deleteWordMessage")}
                    onConfirm={handleDeleteWord}
                    onCancel={() => {
                        setDeletePopup(false);
                        setDeleteWordId(null);
                    }}
                    confirmButtonStyle={{
                        backgroundColor: "#ff4757",
                        color: "#fff",
                    }}
                />
            )}
            {batchDeletePopup && (
                <ConfirmWidget
                    title={t("batchDeleteWords")}
                    message={
                        <Trans
                            i18nKey="batchDeleteWordsMessage"
                            values={{ count: selectedWordIds.size }}
                        />
                    }
                    onConfirm={handleBatchDeleteWords}
                    onCancel={() => {
                        setBatchDeletePopup(false);
                    }}
                    confirmButtonStyle={{
                        backgroundColor: "#ff4757",
                        color: "#fff",
                    }}
                />
            )}
            {editingWord && (
                <EditWordDialog
                    word={editingWord}
                    wordSets={wordSets}
                    onClose={() => setEditingWord(null)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}