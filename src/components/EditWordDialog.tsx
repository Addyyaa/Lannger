import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import CloseButton from "./CloseButton";
import {
  DEFAULT_WORD_SET_ID,
  DEFAULT_WORD_SET_NAME,
  Word,
  WordSet,
} from "../db";
import * as dbOperator from "../store/wordStore";

interface EditWordDialogProps {
  word: Word;
  wordSets: WordSet[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditWordDialog({
  word,
  wordSets,
  onClose,
  onSuccess,
}: EditWordDialogProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

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
    // example 是可选的，不需要验证

    const nextDifficulty = Number.isNaN(Number(difficulty))
      ? 5
      : Number(difficulty);
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
    <div
      data-test-id="div-test-4"
      style={overlayStyle(isPortrait)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-word-title"
    >
      <div data-test-id="div-test-3" style={dialogStyle(isDark, isPortrait)}>
        <div data-test-id="div-test-2" style={headerStyle(isPortrait)}>
          <h2
            data-test-id="h2-test"
            id="edit-word-title"
            style={{
              margin: 0,
              fontSize: isPortrait ? "5vw" : "clamp(1.375vw, 1.375rem, 1.9vw)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: isDark ? "#ffffff" : "#000000",
              lineHeight: 1.2,
            }}
          >
            {t("editWord")}
          </h2>
          <CloseButton
            data-test-id="closebutton-test"
            onClick={onClose}
            ariaLabel={t("close")}
            iconColor={isDark ? "#f5f5f5" : "#333"}
            style={{
              position: "absolute",
              top: isPortrait ? "3vw" : "1vw",
              right: isPortrait ? "3vw" : "1vw",
            }}
          />
        </div>
        <form
          data-test-id="form-test"
          onSubmit={handleSubmit}
          style={formStyle(isPortrait)}
        >
          <label
            data-test-id="label-test-6"
            style={labelStyle(isDark, isPortrait)}
          >
            {t("kana")}
            <input
              data-test-id="input-test-2"
              type="text"
              value={kana}
              onChange={(event) => setKana(event.target.value)}
              style={inputStyle(isDark, isPortrait)}
              onFocus={(e) =>
                Object.assign(
                  e.currentTarget.style,
                  getInputFocusStyle(isDark, isPortrait)
                )
              }
              onBlur={(e) => {
                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = getInputBackground(isDark);
              }}
              maxLength={64}
            />
          </label>
          <label
            data-test-id="label-test-5"
            style={labelStyle(isDark, isPortrait)}
          >
            {t("kanji")}
            <input
              data-test-id="input-test-1"
              type="text"
              value={kanji}
              onChange={(event) => setKanji(event.target.value)}
              style={inputStyle(isDark, isPortrait)}
              onFocus={(e) =>
                Object.assign(
                  e.currentTarget.style,
                  getInputFocusStyle(isDark, isPortrait)
                )
              }
              onBlur={(e) => {
                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = getInputBackground(isDark);
              }}
              maxLength={64}
            />
          </label>
          <label
            data-test-id="label-test-4"
            style={labelStyle(isDark, isPortrait)}
          >
            {t("meaning")}
            <textarea
              data-test-id="textarea-test-1"
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              style={textareaStyle(isDark, isPortrait)}
              onFocus={(e) =>
                Object.assign(
                  e.currentTarget.style,
                  getInputFocusStyle(isDark, isPortrait)
                )
              }
              onBlur={(e) => {
                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = getInputBackground(isDark);
              }}
              rows={3}
              maxLength={512}
            />
          </label>
          <label
            data-test-id="label-test-3"
            style={labelStyle(isDark, isPortrait)}
          >
            {t("example")}
            <textarea
              data-test-id="textarea-test"
              value={example}
              onChange={(event) => setExample(event.target.value)}
              style={textareaStyle(isDark, isPortrait)}
              onFocus={(e) =>
                Object.assign(
                  e.currentTarget.style,
                  getInputFocusStyle(isDark, isPortrait)
                )
              }
              onBlur={(e) => {
                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = getInputBackground(isDark);
              }}
              rows={3}
              maxLength={512}
            />
          </label>
          <label
            data-test-id="label-test-2"
            style={labelStyle(isDark, isPortrait)}
          >
            {t("mark")}
            <input
              data-test-id="input-test"
              type="text"
              value={mark}
              onChange={(event) => setMark(event.target.value)}
              style={inputStyle(isDark, isPortrait)}
              onFocus={(e) =>
                Object.assign(
                  e.currentTarget.style,
                  getInputFocusStyle(isDark, isPortrait)
                )
              }
              onBlur={(e) => {
                e.currentTarget.style.borderColor = getInputBorderColor(isDark);
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = getInputBackground(isDark);
              }}
              maxLength={128}
            />
          </label>
          <div data-test-id="div-test-1" style={rowGroupStyle(isPortrait)}>
            <label
              data-test-id="label-test-1"
              style={{
                ...labelStyle(isDark, isPortrait),
                flex: isPortrait ? undefined : 1,
                width: isPortrait ? "100%" : undefined,
              }}
            >
              {t("difficulty")}
              <select
                data-test-id="select-test-1"
                value={difficulty}
                onChange={(event) => setDifficulty(Number(event.target.value))}
                style={selectStyle(isDark, isPortrait)}
                onFocus={(e) =>
                  Object.assign(
                    e.currentTarget.style,
                    getInputFocusStyle(isDark, isPortrait)
                  )
                }
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    getInputBorderColor(isDark);
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.backgroundColor =
                    getSelectBackground(isDark);
                }}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option
                    data-test-id="option-test-1"
                    key={level}
                    value={level}
                  >
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label
              data-test-id="label-test"
              style={{
                ...labelStyle(isDark, isPortrait),
                flex: isPortrait ? undefined : 1,
                width: isPortrait ? "100%" : undefined,
              }}
            >
              {t("wordSet")}
              <select
                data-test-id="select-test"
                value={setId}
                onChange={(event) => setSetId(Number(event.target.value))}
                style={selectStyle(isDark, isPortrait)}
                onFocus={(e) =>
                  Object.assign(
                    e.currentTarget.style,
                    getInputFocusStyle(isDark, isPortrait)
                  )
                }
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    getInputBorderColor(isDark);
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.backgroundColor =
                    getSelectBackground(isDark);
                }}
              >
                {wordSetOptions.map((item) => (
                  <option
                    data-test-id="option-test"
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div data-test-id="div-test" style={footerStyle(isPortrait)}>
            <button
              data-test-id="button-test-1"
              type="button"
              onClick={onClose}
              style={secondaryButtonStyle(isDark, isPortrait)}
              onMouseEnter={(e) => {
                if (!isPortrait) {
                  Object.assign(
                    e.currentTarget.style,
                    getSecondaryButtonHoverStyle(isDark, isPortrait)
                  );
                }
              }}
              onMouseLeave={(e) => {
                if (!isPortrait) {
                  const baseStyle = secondaryButtonStyle(isDark, isPortrait);
                  e.currentTarget.style.background =
                    baseStyle.background as string;
                  e.currentTarget.style.transform = "none";
                }
              }}
              onMouseDown={(e) => {
                if (!isPortrait) {
                  Object.assign(
                    e.currentTarget.style,
                    getSecondaryButtonActiveStyle(isDark)
                  );
                }
              }}
              onMouseUp={(e) => {
                if (!isPortrait) {
                  Object.assign(
                    e.currentTarget.style,
                    getSecondaryButtonHoverStyle(isDark, isPortrait)
                  );
                }
              }}
            >
              {t("cancel")}
            </button>
            <button
              data-test-id="button-test"
              type="submit"
              style={primaryButtonStyle(isPortrait)}
              disabled={submitting}
              onMouseEnter={(e) => {
                if (!submitting && !isPortrait) {
                  Object.assign(
                    e.currentTarget.style,
                    getPrimaryButtonHoverStyle(isPortrait)
                  );
                }
              }}
              onMouseLeave={(e) => {
                if (!isPortrait) {
                  const baseStyle = primaryButtonStyle(isPortrait);
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow =
                    baseStyle.boxShadow as string;
                }
              }}
              onMouseDown={(e) => {
                if (!submitting && !isPortrait) {
                  Object.assign(
                    e.currentTarget.style,
                    getPrimaryButtonActiveStyle(isPortrait)
                  );
                }
              }}
              onMouseUp={(e) => {
                if (!submitting && !isPortrait) {
                  Object.assign(
                    e.currentTarget.style,
                    getPrimaryButtonHoverStyle(isPortrait)
                  );
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

const overlayStyle = (isPortrait: boolean): React.CSSProperties => ({
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
  padding: isPortrait ? "3vw" : "1vw",
  boxSizing: "border-box",
});

const dialogStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  width: isPortrait ? "90%" : "min(40vw, 90vw)",
  maxWidth: isPortrait ? "100%" : "600px",
  maxHeight: isPortrait ? "90vh" : "90vh",
  overflow: "auto",
  background: isDark ? "rgba(28, 28, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
  borderRadius: isPortrait ? "2vw" : "1.4vh",
  boxShadow: isDark
    ? isPortrait
      ? "0 5vw 10vw rgba(0, 0, 0, 0.5), 0 0 0 0.3vw rgba(255, 255, 255, 0.1)"
      : "0 2vh 4vh rgba(0, 0, 0, 0.5), 0 0 0 0.05vh rgba(255, 255, 255, 0.1)"
    : isPortrait
    ? "0 5vw 10vw rgba(0, 0, 0, 0.15), 0 0 0 0.3vw rgba(0, 0, 0, 0.05)"
    : "0 2vh 4vh rgba(0, 0, 0, 0.15), 0 0 0 0.05vh rgba(0, 0, 0, 0.05)",
  padding: isPortrait ? "4vw" : "3vh 3vw",
  display: "flex",
  flexDirection: "column",
  gap: isPortrait ? "3vw" : "2.4vh",
  position: "relative",
  fontSize: isPortrait ? "3.5vw" : "clamp(0.875vw, 0.875rem, 1.2vw)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
  animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
});

const headerStyle = (isPortrait: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: isPortrait ? "2vw" : "0.8vh",
  position: "relative",
});

const formStyle = (isPortrait: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: isPortrait ? "3vw" : "2vh",
  width: "100%",
});

const labelStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: isPortrait ? "1.5vw" : "0.6vh",
  fontSize: isPortrait ? "3.5vw" : "0.9em",
  fontWeight: 500,
  color: isDark ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.85)",
  width: "100%",
  letterSpacing: "-0.01em",
});

const inputStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  padding: isPortrait ? "3vw 4vw" : "1.2vh 1.4vw",
  borderRadius: isPortrait ? "2vw" : "1vh",
  border: isDark
    ? `${isPortrait ? "0.3vw" : "0.1vh"} solid rgba(255,255,255,0.15)`
    : `${isPortrait ? "0.3vw" : "0.1vh"} solid rgba(0,0,0,0.15)`,
  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.02)",
  color: isDark ? "#ffffff" : "#000000",
  outline: "none",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  width: "100%",
  fontSize: isPortrait ? "3.5vw" : "1em",
  boxSizing: "border-box",
  fontFamily: "inherit",
  lineHeight: 1.5,
  minHeight: isPortrait ? "10vw" : "4.4vh",
});

// 添加焦点状态样式函数
const getInputFocusStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  borderColor: isDark ? "rgba(0, 180, 255, 0.6)" : "rgba(0, 150, 212, 0.6)",
  boxShadow: isDark
    ? isPortrait
      ? "0 0 0 0.8vw rgba(0, 180, 255, 0.2)"
      : "0 0 0 0.3vh rgba(0, 180, 255, 0.2)"
    : isPortrait
    ? "0 0 0 0.8vw rgba(0, 150, 212, 0.2)"
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

const textareaStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  ...inputStyle(isDark, isPortrait),
  resize: "vertical",
  minHeight: isPortrait ? "20vw" : "8vh",
  lineHeight: 1.6,
});

const selectStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  ...inputStyle(isDark, isPortrait),
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  backgroundImage: isDark
    ? `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`
    : `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='rgba(0,0,0,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: isPortrait ? "right 3vw center" : "right 1.4vw center",
  backgroundSize: isPortrait ? "3vw" : "1.2vw",
  paddingRight: isPortrait ? "8vw" : "3.5vw",
  cursor: "pointer",
  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.02)",
});

const rowGroupStyle = (isPortrait: boolean): React.CSSProperties => ({
  display: "flex",
  gap: isPortrait ? "3vw" : "2vw",
  flexWrap: "wrap",
  width: "100%",
  flexDirection: isPortrait ? "column" : "row",
});

const footerStyle = (isPortrait: boolean): React.CSSProperties => ({
  display: "flex",
  justifyContent: isPortrait ? "stretch" : "flex-end",
  flexDirection: isPortrait ? "column" : "row",
  gap: isPortrait ? "2vw" : "1.2vw",
  marginTop: isPortrait ? "2vw" : "1.6vh",
  paddingTop: isPortrait ? "3vw" : "2vh",
  borderTop: `${isPortrait ? "0.3vw" : "0.05vh"} solid rgba(0, 0, 0, 0.1)`,
  width: "100%",
});

const primaryButtonStyle = (isPortrait: boolean): React.CSSProperties => ({
  background: "linear-gradient(135deg, #007AFF 0%, #0051D5 100%)",
  color: "#ffffff",
  border: "none",
  borderRadius: isPortrait ? "2vw" : "1vh",
  padding: isPortrait ? "3vw 6vw" : "1.2vh 2.4vw",
  fontSize: isPortrait ? "3.5vw" : "1em",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  boxShadow: isPortrait
    ? "0 0.5vw 2vw rgba(0, 122, 255, 0.3)"
    : "0 0.2vh 0.8vh rgba(0, 122, 255, 0.3)",
  minWidth: isPortrait ? undefined : "22%",
  width: isPortrait ? "100%" : undefined,
  minHeight: isPortrait ? "10vw" : "4.4vh",
  letterSpacing: "-0.01em",
  fontFamily: "inherit",
});

// 添加按钮悬停和激活状态
const getPrimaryButtonHoverStyle = (
  isPortrait: boolean
): React.CSSProperties => ({
  transform: isPortrait ? "none" : "translateY(-0.1vh)",
  boxShadow: isPortrait
    ? "0 0.5vw 2vw rgba(0, 122, 255, 0.3)"
    : "0 0.4vh 1.2vh rgba(0, 122, 255, 0.4)",
});

const getPrimaryButtonActiveStyle = (
  isPortrait: boolean
): React.CSSProperties => ({
  transform: "translateY(0)",
  boxShadow: isPortrait
    ? "0 0.25vw 1vw rgba(0, 122, 255, 0.3)"
    : "0 0.1vh 0.4vh rgba(0, 122, 255, 0.3)",
});

const secondaryButtonStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
  color: isDark ? "#ffffff" : "#000000",
  border: isDark
    ? `${isPortrait ? "0.3vw" : "0.1vh"} solid rgba(255,255,255,0.2)`
    : `${isPortrait ? "0.3vw" : "0.1vh"} solid rgba(0,0,0,0.15)`,
  borderRadius: isPortrait ? "2vw" : "1vh",
  padding: isPortrait ? "3vw 6vw" : "1.2vh 2.4vw",
  fontSize: isPortrait ? "3.5vw" : "1em",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  boxShadow: "none",
  minWidth: isPortrait ? undefined : "22%",
  width: isPortrait ? "100%" : undefined,
  minHeight: isPortrait ? "10vw" : "4.4vh",
  letterSpacing: "-0.01em",
  fontFamily: "inherit",
});

const getSecondaryButtonHoverStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
  transform: isPortrait ? "none" : "translateY(-0.1vh)",
});

const getSecondaryButtonActiveStyle = (
  isDark: boolean
): React.CSSProperties => ({
  transform: "translateY(0)",
  background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
});
