import { useTheme } from "../main";
import * as dbOperator from "../store/wordStore";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useManageContext } from "../pages/Manage";

export default function EditWordSets({
    setLoading,
    outterWordSetList,
    index
}: {
    setLoading: (loading: boolean) => void;
    outterWordSetList: { id: number, name: string, mark: string, createdAt: string, updatedAt: string }[];
    index: number;
}) {
    const { isDark } = useTheme();
    const { t } = useTranslation();
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
        <div style={{ position: "absolute", width: "100%", top: "0", left: "0", height: "100%", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
                style={{
                    ...AddWordSetsStyle,
                    backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
                    boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.1)",
                    border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
                }}
            >
                <label
                    style={{ ...AddWordSetTitleStyle, color: isDark ? "#eee" : "#333" }}
                >
                    {t("addWordSetTitle")}
                </label>
                <button
                    onClick={() => dispatch({ type: "CLOSE_EDIT_WORD_SET", payload: {} })}
                    style={CloseButtonStyle}
                    data-testid="EditWordSets-close-button"
                >
                    X
                </button>
                <form style={FormStyle}>
                    <fieldset style={fieldsetStyle}>
                        <legend style={legendStyle}>{t("wordSet")}</legend>
                        <div style={nameInputContainerStyle}>
                            <label style={nameLabelStyle}>{t("setName")}</label>
                            <input
                                type="text"
                                data-testid="EditWordSets-setName-input"
                                style={nameInputStyle(isDark)}
                                value={wordSet.name}
                                onChange={(e) => setWordSet({ ...wordSet, name: e.target.value })}
                                placeholder={outterWordSetList[index].name}
                            />
                        </div>
                        <div style={setMarkInputContainerStyle}>
                            <label style={setMarkLabelStyle}>{t("setMark")}</label>
                            <textarea
                                data-testid="EditWordSets-setMark-input"
                                style={setMarkInputStyle(isDark)}
                                value={wordSet.mark}
                                onChange={(e) => setWordSet({ ...wordSet, mark: e.target.value })}
                                placeholder={outterWordSetList[index].mark}
                            />
                        </div>
                    </fieldset>
                    <button style={submitButtonStyle} onClick={handleSubmit}>
                        {t("submitModify")}
                    </button>
                </form>
            </div>
        </div>
    );
}

const AddWordSetsStyle: React.CSSProperties = {
    position: "relative",
    width: "40vw",
    aspectRatio: "1.5/1",
    display: "flex",
    borderRadius: "10px",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
};

const CloseButtonStyle: React.CSSProperties = {
    position: "absolute",
    top: "1.5vh",
    right: "1vw",
    borderRadius: "0.8vw",
};

const AddWordSetTitleStyle: React.CSSProperties = {
    fontSize: "1.3vw",
    position: "absolute",
    fontWeight: "bold",
    top: "1.5vh",
    left: "1vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
};

const legendStyle: React.CSSProperties = {
    fontSize: "1.3vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "7% 0 0 0",
};

const fieldsetStyle: React.CSSProperties = {
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

const FormStyle: React.CSSProperties = {
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

const nameLabelStyle: React.CSSProperties = {
    fontSize: "1.3vw",
    width: "auto",
    fontWeight: "bold",
};

const nameInputStyle = (isDark: boolean): React.CSSProperties => ({
    width: "80%",
    height: "100%",
    borderRadius: "0.8vw",
    border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
    outline: "none",
    fontSize: "1.2vw",
    boxSizing: "border-box",
    backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
    color: isDark ? "#eee" : "#333",
});

const nameInputContainerStyle: React.CSSProperties = {
    display: "flex",
    height: "20%",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: "5%",
};

const setMarkLabelStyle: React.CSSProperties = {
    fontSize: "1.3vw",
    width: "auto",
    fontWeight: "bold",
};

const setMarkInputContainerStyle: React.CSSProperties = {
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

const setMarkInputStyle = (isDark: boolean): React.CSSProperties => ({
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
});

const submitButtonStyle: React.CSSProperties = {
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
