import { useOrientation, useTheme } from "../main";
import * as dbOperator from "../store/wordStore";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useManageContext } from "../pages/Manage";

export default function EditWordSets({
  setLoading,
  outterWordSetList,
  index,
}: {
  setLoading: (loading: boolean) => void;
  outterWordSetList: {
    id: number;
    name: string;
    mark: string;
    createdAt: string;
    updatedAt: string;
  }[];
  index: number;
}) {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { isPortrait } = useOrientation();
  const { dispatch } = useManageContext();
  const [wordSet, setWordSet] = useState({
    name: "",
    mark: "",
  });
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 如果字段没有输入 则用之前的内容
    if (wordSet.name.trim() === "") {
      wordSet.name = outterWordSetList[index].name;
    }
    if (wordSet.mark.trim() === "") {
      wordSet.mark = outterWordSetList[index].mark;
    }
    try {
      await dbOperator.updateWordSet({
        id: outterWordSetList[index].id,
        name: wordSet.name,
        mark: wordSet.mark,
        createdAt: outterWordSetList[index].createdAt,
      });
    } catch (error) {
      alert(t("updateWordSetFailed"));
    } finally {
      setLoading(false);
    }
    setLoading(true);
    console.log("wordSet\t", wordSet);
    dispatch({ type: "CLOSE_EDIT_WORD_SET", payload: {} });
  }
  return (
    <div
      data-test-id="div-test-3"
      style={{
        position: "absolute",
        width: "100%",
        top: "0",
        left: "0",
        height: "100%",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        data-test-id="div-test-2"
        style={{
          ...getAddWordSetsStyle(isPortrait),
          backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
          boxShadow: isDark
            ? "0 4px 20px rgba(0, 0, 0, 0.3)"
            : "0 4px 20px rgba(0, 0, 0, 0.1)",
          border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        }}
      >
        <label
          data-test-id="label-test-2"
          style={{
            ...getAddWordSetTitleStyle(isPortrait),
            color: isDark ? "#eee" : "#333",
          }}
        >
          {t("editWordSet")}
        </label>
        <button
          data-test-id="button-test-1"
          onClick={() => dispatch({ type: "CLOSE_EDIT_WORD_SET", payload: {} })}
          style={getCloseButtonStyle(isPortrait)}
          data-testid="EditWordSets-close-button"
        >
          X
        </button>
        <form data-test-id="form-test" style={getFormStyle(isPortrait)}>
          <fieldset
            data-test-id="fieldset-test"
            style={getFieldsetStyle(isPortrait)}
          >
            <legend
              data-test-id="legend-test"
              style={getLegendStyle(isPortrait)}
            >
              {t("wordSet")}
            </legend>
            <div
              data-test-id="div-test-1"
              style={getNameInputContainerStyle(isPortrait)}
            >
              <label
                data-test-id="label-test-1"
                style={getNameLabelStyle(isPortrait)}
              >
                {t("setName")}
              </label>
              <input
                data-test-id="input-test"
                type="text"
                data-testid="EditWordSets-setName-input"
                style={nameInputStyle(isDark, isPortrait)}
                value={wordSet.name}
                onChange={(e) =>
                  setWordSet({ ...wordSet, name: e.target.value })
                }
                placeholder={outterWordSetList[index].name}
              />
            </div>
            <div
              data-test-id="div-test"
              style={getSetMarkInputContainerStyle(isPortrait)}
            >
              <label
                data-test-id="label-test"
                style={getSetMarkLabelStyle(isPortrait)}
              >
                {t("setMark")}
              </label>
              <textarea
                data-test-id="textarea-test"
                data-testid="EditWordSets-setMark-input"
                style={setMarkInputStyle(isDark, isPortrait)}
                value={wordSet.mark}
                onChange={(e) =>
                  setWordSet({ ...wordSet, mark: e.target.value })
                }
                placeholder={outterWordSetList[index].mark}
              />
            </div>
          </fieldset>
          <button
            data-test-id="button-test"
            style={getSubmitButtonStyle(isPortrait)}
            onClick={handleSubmit}
          >
            {t("submitModify")}
          </button>
        </form>
      </div>
    </div>
  );
}

const getAddWordSetsStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        position: "relative",
        width: "92vw",
        maxWidth: "540px",
        minHeight: "72vh",
        padding: "9vw 6vw",
        display: "flex",
        borderRadius: "18px",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        gap: "6vw",
        boxSizing: "border-box",
        overflow: "hidden",
      }
    : {
        position: "relative",
        width: "40vw",
        aspectRatio: "1.5/1",
        display: "flex",
        borderRadius: "10px",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      };

const getCloseButtonStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        position: "absolute",
        top: "4vw",
        right: "4vw",
        borderRadius: "4vw",
        padding: "1.5vw 2.8vw",
      }
    : {
        position: "absolute",
        top: "1.5vh",
        right: "1vw",
        borderRadius: "0.8vw",
      };

const getAddWordSetTitleStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        fontSize: "clamp(18px, 5vw, 26px)",
        position: "relative",
        fontWeight: "bold",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }
    : {
        fontSize: "1.3vw",
        position: "absolute",
        fontWeight: "bold",
        top: "1.5vh",
        left: "1vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      };

const getLegendStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        fontSize: "clamp(16px, 4.5vw, 22px)",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "0",
        marginBottom: "4vw",
      }
    : {
        fontSize: "1.3vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "7% 0 0 0",
      };

const getFieldsetStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        display: "flex",
        width: "100%",
        height: "auto",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        border: "none",
        outline: "none",
        gap: "5vw",
      }
    : {
        display: "flex",
        position: "absolute",
        top: "4vh",
        width: "88%",
        height: "70%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        outline: "none",
      };

const getFormStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        display: "flex",
        width: "100%",
        position: "relative",
        height: "auto",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        border: "none",
        outline: "none",
        gap: "6vw",
      }
    : {
        display: "flex",
        width: "75%",
        position: "relative",
        height: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        outline: "none",
      };

const getNameLabelStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        fontSize: "clamp(16px, 4.5vw, 22px)",
        width: "100%",
        fontWeight: "bold",
      }
    : {
        fontSize: "1.3vw",
        width: "auto",
        fontWeight: "bold",
      };

const nameInputStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties =>
  isPortrait
    ? {
        width: "100%",
        minHeight: "12vw",
        borderRadius: "4vw",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        outline: "none",
        fontSize: "clamp(16px, 4.3vw, 20px)",
        padding: "3.5vw 4vw",
        boxSizing: "border-box",
        backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
        color: isDark ? "#eee" : "#333",
      }
    : {
        width: "80%",
        height: "100%",
        borderRadius: "0.8vw",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        outline: "none",
        fontSize: "1.2vw",
        boxSizing: "border-box",
        backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
        color: isDark ? "#eee" : "#333",
      };

const getNameInputContainerStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        rowGap: "2.5vw",
      }
    : {
        display: "flex",
        height: "20%",
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        columnGap: "5%",
      };

const getSetMarkLabelStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        fontSize: "clamp(16px, 4.5vw, 22px)",
        width: "100%",
        fontWeight: "bold",
      }
    : {
        fontSize: "1.3vw",
        width: "auto",
        fontWeight: "bold",
      };

const getSetMarkInputContainerStyle = (
  isPortrait: boolean
): React.CSSProperties =>
  isPortrait
    ? {
        display: "flex",
        width: "100%",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        rowGap: "2.5vw",
      }
    : {
        display: "flex",
        height: "40%",
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "6%",
        columnGap: "5%",
        marginTop: "5%",
      };

const setMarkInputStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties =>
  isPortrait
    ? {
        width: "100%",
        minHeight: "32vw",
        borderRadius: "4vw",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        outline: "none",
        textAlign: "left",
        padding: "3.5vw 4vw",
        boxSizing: "border-box",
        fontSize: "clamp(16px, 4.3vw, 20px)",
        resize: "vertical",
        backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
        color: isDark ? "#eee" : "#333",
        lineHeight: 1.45,
        maxHeight: "50vw",
      }
    : {
        width: "80%",
        height: "100%",
        borderRadius: "0.8vw",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        outline: "none",
        textAlign: "left",
        padding: "2% 0 2% 0",
        boxSizing: "border-box",
        fontSize: "1.2vw",
        maxWidth: "80%",
        resize: "none",
        backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
        color: isDark ? "#eee" : "#333",
      };

const getSubmitButtonStyle = (isPortrait: boolean): React.CSSProperties =>
  isPortrait
    ? {
        width: "100%",
        borderRadius: "4vw",
        fontSize: "clamp(16px, 4.5vw, 22px)",
        fontWeight: "bold",
        cursor: "pointer",
        padding: "3.8vw 0",
        marginTop: "2vw",
      }
    : {
        minWidth: "33%",
        width: "auto",
        height: "14.5%",
        borderRadius: "0.8vw",
        fontSize: "1vw",
        fontWeight: "bold",
        cursor: "pointer",
        marginTop: "55%",
        zIndex: 2,
      };
