import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import CloseButton from "./CloseButton";
import { DEFAULT_WORD_SET_ID, DEFAULT_WORD_SET_NAME, Word, WordSet } from "../db";
import * as dbOperator from "../store/wordStore";

interface EditWordDialogProps {
    word: Word;
    wordSets: WordSet[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditWordDialog({ word, wordSets, onClose, onSuccess }: EditWordDialogProps) {
    const { t } = useTranslation();
    const { isDark } = useTheme();

    const [kana, setKana] = useState<string>("");
    const [kanji, setKanji] = useState<string>("");
    const [meaning, setMeaning] = useState<string>("");
    const [example, setExample] = useState<string>("");
    const [mark, setMark] = useState<string>("");
    const [setId, setSetId] = useState<number>(DEFAULT_WORD_SET_ID);
    const [difficulty, setDifficulty] = useState<number>(5);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const wordSetOptions = useMemo(() => {
        const options = [...wordSets];
        const hasDefault = options.some((item) => item.id === DEFAULT_WORD_SET_ID);
        if (!hasDefault) {
            options.unshift({
                id: DEFAULT_WORD_SET_ID,
                name: DEFAULT_WORD_SET_NAME,
            } as WordSet);
        }
        return options;
    }, [wordSets]);

    useEffect(() => {
        setKana(word.kana || "");
        setKanji(word.kanji || "");
        setMeaning(word.meaning || "");
        setExample(word.example || "");
        setMark(word.mark || "");
        setSetId(typeof word.setId === "number" ? word.setId : DEFAULT_WORD_SET_ID);
        setDifficulty(
            word.review && typeof word.review.difficulty === "number"
                ? word.review.difficulty
                : 5
        );
    }, [word]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting) {
            return;
        }

        if (!kana.trim()) {
            alert(`${t("kana")} ${t("isRequired")}`);
            return;
        }
        if (!kanji.trim()) {
            alert(`${t("kanji")} ${t("isRequired")}`);
            return;
        }
        if (!meaning.trim()) {
            alert(`${t("meaning")} ${t("isRequired")}`);
            return;
        }
        if (!example.trim()) {
            alert(`${t("example")} ${t("isRequired")}`);
            return;
        }

        const nextDifficulty = Number.isNaN(Number(difficulty)) ? 5 : Number(difficulty);
        const normalizedDifficulty = Math.min(Math.max(nextDifficulty, 1), 5);

        const updatedWord: Word = {
            ...word,
            kana: kana.trim(),
            kanji: kanji.trim(),
            meaning: meaning.trim(),
            example: example.trim(),
            mark: mark.trim(),
            setId,
            review: {
                times: word.review?.times ?? 0,
                difficulty: normalizedDifficulty,
                nextReview: word.review?.nextReview,
            },
        };

        try {
            setSubmitting(true);
            await dbOperator.updateWord(updatedWord);
            alert(t("wordUpdateSuccess"));
            onSuccess();
            onClose();
        } catch (error) {
            console.error("更新单词失败:", error);
            alert(t("wordUpdateFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="edit-word-title">
            <div style={dialogStyle(isDark)}>
                <div style={headerStyle}>
                    <h2 id="edit-word-title" style={{ 
                        margin: 0, 
                        fontSize: "clamp(1.375vw, 1.375rem, 1.9vw)", 
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: isDark ? "#ffffff" : "#000000",
                        lineHeight: 1.2,
                    }}>
                        {t("editWord")}
                    </h2>
                    <CloseButton onClick={onClose} ariaLabel={t("close")} iconColor={isDark ? "#f5f5f5" : "#333"} />
                </div>
                <form onSubmit={handleSubmit} style={formStyle}>
                    <label style={labelStyle(isDark)}>
                        {t("kana")}
                        <input
                            type="text"
                            value={kana}
                            onChange={(event) => setKana(event.target.value)}
                            style={inputStyle(isDark)}
                            onFocus={(e) => Object.assign(e.currentTarget.style, getInputFocusStyle(isDark))}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.background = getInputBackground(isDark);
                            }}
                            maxLength={64}
                        />
                    </label>
                    <label style={labelStyle(isDark)}>
                        {t("kanji")}
                        <input
                            type="text"
                            value={kanji}
                            onChange={(event) => setKanji(event.target.value)}
                            style={inputStyle(isDark)}
                            onFocus={(e) => Object.assign(e.currentTarget.style, getInputFocusStyle(isDark))}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.background = getInputBackground(isDark);
                            }}
                            maxLength={64}
                        />
                    </label>
                    <label style={labelStyle(isDark)}>
                        {t("meaning")}
                        <textarea
                            value={meaning}
                            onChange={(event) => setMeaning(event.target.value)}
                            style={textareaStyle(isDark)}
                            onFocus={(e) => Object.assign(e.currentTarget.style, getInputFocusStyle(isDark))}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.background = getInputBackground(isDark);
                            }}
                            rows={3}
                            maxLength={512}
                        />
                    </label>
                    <label style={labelStyle(isDark)}>
                        {t("example")}
                        <textarea
                            value={example}
                            onChange={(event) => setExample(event.target.value)}
                            style={textareaStyle(isDark)}
                            onFocus={(e) => Object.assign(e.currentTarget.style, getInputFocusStyle(isDark))}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.background = getInputBackground(isDark);
                            }}
                            rows={3}
                            maxLength={512}
                        />
                    </label>
                    <label style={labelStyle(isDark)}>
                        {t("mark")}
                        <input
                            type="text"
                            value={mark}
                            onChange={(event) => setMark(event.target.value)}
                            style={inputStyle(isDark)}
                            onFocus={(e) => Object.assign(e.currentTarget.style, getInputFocusStyle(isDark))}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.background = getInputBackground(isDark);
                            }}
                            maxLength={128}
                        />
                    </label>
                    <div style={rowGroupStyle}>
                        <label style={{ ...labelStyle(isDark), flex: 1 }}>
                            {t("difficulty")}
                            <select
                                value={difficulty}
                                onChange={(event) => setDifficulty(Number(event.target.value))}
                                style={selectStyle(isDark)}
                                onFocus={(e) => Object.assign(e.currentTarget.style, getInputFocusStyle(isDark))}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.backgroundColor = getSelectBackground(isDark);
                                }}
                            >
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label style={{ ...labelStyle(isDark), flex: 1 }}>
                            {t("wordSet")}
                            <select
                                value={setId}
                                onChange={(event) => setSetId(Number(event.target.value))}
                                style={selectStyle(isDark)}
                                onFocus={(e) => Object.assign(e.currentTarget.style, getInputFocusStyle(isDark))}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.backgroundColor = getSelectBackground(isDark);
                                }}
                            >
                                {wordSetOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div style={footerStyle}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={secondaryButtonStyle(isDark)}
                            onMouseEnter={(e) => Object.assign(e.currentTarget.style, getSecondaryButtonHoverStyle(isDark))}
                            onMouseLeave={(e) => {
                                const baseStyle = secondaryButtonStyle(isDark);
                                e.currentTarget.style.background = baseStyle.background as string;
                                e.currentTarget.style.transform = "none";
                            }}
                            onMouseDown={(e) => Object.assign(e.currentTarget.style, getSecondaryButtonActiveStyle(isDark))}
                            onMouseUp={(e) => Object.assign(e.currentTarget.style, getSecondaryButtonHoverStyle(isDark))}
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="submit"
                            style={primaryButtonStyle}
                            disabled={submitting}
                            onMouseEnter={(e) => {
                                if (!submitting) {
                                    Object.assign(e.currentTarget.style, getPrimaryButtonHoverStyle());
                                }
                            }}
                            onMouseLeave={(e) => {
                                const baseStyle = primaryButtonStyle;
                                e.currentTarget.style.transform = "none";
                                e.currentTarget.style.boxShadow = baseStyle.boxShadow as string;
                            }}
                            onMouseDown={(e) => {
                                if (!submitting) {
                                    Object.assign(e.currentTarget.style, getPrimaryButtonActiveStyle());
                                }
                            }}
                            onMouseUp={(e) => {
                                if (!submitting) {
                                    Object.assign(e.currentTarget.style, getPrimaryButtonHoverStyle());
                                }
                            }}
                        >
                            {submitting ? t("loading") : t("saveChanges")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    animation: "fadeIn 0.2s ease-out",
};

const dialogStyle = (isDark: boolean): React.CSSProperties => ({
    width: "min(40vw, 90vw)",
    maxWidth: "600px",
    background: isDark ? "rgba(28, 28, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
    borderRadius: "1.4vh",
    boxShadow: isDark 
        ? "0 2vh 4vh rgba(0, 0, 0, 0.5), 0 0 0 0.05vh rgba(255, 255, 255, 0.1)" 
        : "0 2vh 4vh rgba(0, 0, 0, 0.15), 0 0 0 0.05vh rgba(0, 0, 0, 0.05)",
    padding: "3vh 3vw",
    display: "flex",
    flexDirection: "column",
    gap: "2.4vh",
    position: "relative",
    fontSize: "clamp(0.875vw, 0.875rem, 1.2vw)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
    animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
});

const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.8vh",
};

const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "2vh",
    width: "100%",
};

const labelStyle = (isDark: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    gap: "0.6vh",
    fontSize: "0.9em",
    fontWeight: 500,
    color: isDark ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.85)",
    width: "100%",
    letterSpacing: "-0.01em",
});

const inputStyle = (isDark: boolean): React.CSSProperties => ({
    padding: "1.2vh 1.4vw",
    borderRadius: "1vh",
    border: isDark ? "0.1vh solid rgba(255,255,255,0.15)" : "0.1vh solid rgba(0,0,0,0.15)",
    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.02)",
    color: isDark ? "#ffffff" : "#000000",
    outline: "none",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    width: "100%",
    fontSize: "1em",
    boxSizing: "border-box",
    fontFamily: "inherit",
    lineHeight: 1.5,
    minHeight: "4.4vh",
});

// 添加焦点状态样式函数
const getInputFocusStyle = (isDark: boolean): React.CSSProperties => ({
    borderColor: isDark ? "rgba(0, 180, 255, 0.6)" : "rgba(0, 150, 212, 0.6)",
    boxShadow: isDark 
        ? "0 0 0 0.3vh rgba(0, 180, 255, 0.2)" 
        : "0 0 0 0.3vh rgba(0, 150, 212, 0.2)",
    background: isDark ? "rgba(255,255,255,0.1)" : "#ffffff",
});

// 获取输入框默认边框颜色
const getInputBorderColor = (isDark: boolean): string => {
    return isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
};

// 获取输入框默认背景色
const getInputBackground = (isDark: boolean): string => {
    return isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.02)";
};

// 获取 select 默认背景色
const getSelectBackground = (isDark: boolean): string => {
    return isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.02)";
};

const textareaStyle = (isDark: boolean): React.CSSProperties => ({
    ...inputStyle(isDark),
    resize: "vertical",
    minHeight: "8vh",
    lineHeight: 1.6,
});

const selectStyle = (isDark: boolean): React.CSSProperties => ({
    ...inputStyle(isDark),
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundImage: isDark 
        ? `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
        : `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='rgba(0,0,0,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 1.4vw center",
    backgroundSize: "1.2vw",
    paddingRight: "3.5vw",
    cursor: "pointer",
    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.02)",
});

const rowGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "2vw",
    flexWrap: "wrap",
    width: "100%",
};

const footerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1.2vw",
    marginTop: "1.6vh",
    paddingTop: "2vh",
    borderTop: "0.05vh solid rgba(0, 0, 0, 0.1)",
    width: "100%",
};

const primaryButtonStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #007AFF 0%, #0051D5 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "1vh",
    padding: "1.2vh 2.4vw",
    fontSize: "1em",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    boxShadow: "0 0.2vh 0.8vh rgba(0, 122, 255, 0.3)",
    minWidth: "22%",
    minHeight: "4.4vh",
    letterSpacing: "-0.01em",
    fontFamily: "inherit",
};

// 添加按钮悬停和激活状态
const getPrimaryButtonHoverStyle = (): React.CSSProperties => ({
    transform: "translateY(-0.1vh)",
    boxShadow: "0 0.4vh 1.2vh rgba(0, 122, 255, 0.4)",
});

const getPrimaryButtonActiveStyle = (): React.CSSProperties => ({
    transform: "translateY(0)",
    boxShadow: "0 0.1vh 0.4vh rgba(0, 122, 255, 0.3)",
});

const secondaryButtonStyle = (isDark: boolean): React.CSSProperties => ({
    background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    color: isDark ? "#ffffff" : "#000000",
    border: isDark ? "0.1vh solid rgba(255,255,255,0.2)" : "0.1vh solid rgba(0,0,0,0.15)",
    borderRadius: "1vh",
    padding: "1.2vh 2.4vw",
    fontSize: "1em",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    boxShadow: "none",
    minWidth: "22%",
    minHeight: "4.4vh",
    letterSpacing: "-0.01em",
    fontFamily: "inherit",
});

const getSecondaryButtonHoverStyle = (isDark: boolean): React.CSSProperties => ({
    background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
    transform: "translateY(-0.1vh)",
});

const getSecondaryButtonActiveStyle = (isDark: boolean): React.CSSProperties => ({
    transform: "translateY(0)",
    background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
});

