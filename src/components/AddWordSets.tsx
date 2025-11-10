import { useTheme, useOrientation } from "../main";
import * as dbOperator from "../store/wordStore";
import { useTranslation } from "react-i18next";
import { useState, Dispatch, SetStateAction } from "react";

export default function AddWordSets({
    closePopup,
    addWordSet,
}: {
    closePopup: () => void;
    addWordSet: Dispatch<SetStateAction<any[]>>;
}) {
    const { isDark } = useTheme();
    const { isPortrait } = useOrientation();
    const { t } = useTranslation();
    const [wordSet, setWordSet] = useState({
        name: "",
        mark: "",
    });
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (wordSet.name.trim() === "") {
            return;
        }
        await dbOperator.createWordSet({
            name: wordSet.name,
            mark: wordSet.mark,
        });
        const wordSets = await dbOperator.getAllWordSets();
        addWordSet(wordSets);
        console.log("wordSet\t", wordSet);
        closePopup();
    }
    return (
        <div
            data-test-id="div-test-2" style={{
                ...AddWordSetsStyle(isPortrait),
                backgroundColor: isDark ? "#2d2d2d" : "#f8f9fa",
            }}
        >
            <label
                data-test-id="label-test-2" style={{ ...AddWordSetTitleStyle(isPortrait), color: isDark ? "#eee" : "#333" }}
            >
                {t("addWordSetTitle")}
            </label>
            <button
                data-test-id="button-test-1" onClick={closePopup}
                style={CloseButtonStyle(isPortrait)}
                data-testid="AddWordSets-close-button"
            >
                X
            </button>
            <form data-test-id="form-test" style={FormStyle}>
                <fieldset data-test-id="fieldset-test" style={fieldsetStyle(isPortrait)}>
                    <legend data-test-id="legend-test" style={legendStyle(isPortrait)}>{t("wordSet")}</legend>
                    <div data-test-id="div-test-1" style={nameInputContainerStyle(isPortrait)}>
                        <label data-test-id="label-test-1" style={nameLabelStyle(isPortrait)}>{t("setName")}</label>
                        <input
                            data-test-id="input-test" type="text"
                            data-testid="AddWordSets-setName-input"
                            style={nameInputStyle(isDark, isPortrait)}
                            value={wordSet.name}
                            onChange={(e) => setWordSet({ ...wordSet, name: e.target.value })}
                        />
                    </div>
                    <div data-test-id="div-test" style={setMarkInputContainerStyle(isPortrait)}>
                        <label data-test-id="label-test" style={setMarkLabelStyle(isPortrait)}>{t("setMark")}</label>
                        <textarea
                            data-test-id="textarea-test" data-testid="AddWordSets-setMark-input"
                            style={setMarkInputStyle(isDark, isPortrait)}
                            value={wordSet.mark}
                            onChange={(e) => setWordSet({ ...wordSet, mark: e.target.value })}
                        />
                    </div>
                </fieldset>
                <button data-test-id="button-test" style={submitButtonStyle(isPortrait)} onClick={handleSubmit}>
                    {t("addWordSet")}
                </button>
            </form>
        </div>
    );
}

const AddWordSetsStyle = (isPortrait: boolean): React.CSSProperties => ({
    position: "relative",
    width: isPortrait ? "90%" : "40vw",
    aspectRatio: isPortrait ? undefined : "1.5/1",
    minHeight: isPortrait ? "60vh" : undefined,
    display: "flex",
    borderRadius: isPortrait ? "2vw" : "0.625vw",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: isPortrait ? "4vw" : "1vw",
    boxSizing: "border-box",
});

const CloseButtonStyle = (isPortrait: boolean): React.CSSProperties => ({
    position: "absolute",
    top: isPortrait ? "3vw" : "1.5vh",
    right: isPortrait ? "3vw" : "1vw",
    borderRadius: isPortrait ? "2vw" : "0.8vw",
    fontSize: isPortrait ? "4vw" : "1.2vw",
    padding: isPortrait ? "2vw" : "0.5vw 1vw",
});

const AddWordSetTitleStyle = (isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "4.5vw" : "1.3vw",
    position: "absolute",
    fontWeight: "bold",
    top: isPortrait ? "3vw" : "1.5vh",
    left: isPortrait ? "3vw" : "1vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
});

const legendStyle = (isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "4.5vw" : "1.3vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: isPortrait ? "2vw 0 0 0" : "7% 0 0 0",
});

const fieldsetStyle = (isPortrait: boolean): React.CSSProperties => ({
    display: "flex",
    position: "absolute",
    top: isPortrait ? "12vw" : "4vh",
    width: "88%",
    height: isPortrait ? "75%" : "70%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    outline: "none",
});

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

const nameLabelStyle = (isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "4vw" : "1.3vw",
    width: "auto",
    fontWeight: "bold",
});

const nameInputStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    width: "80%",
    height: "100%",
    borderRadius: isPortrait ? "2vw" : "0.8vw",
    border: isDark ? `${isPortrait ? "0.3vw" : "0.06vw"} solid #444` : `${isPortrait ? "0.3vw" : "0.06vw"} solid #e0e0e0`,
    outline: "none",
    fontSize: isPortrait ? "3.5vw" : "1.2vw",
    boxSizing: "border-box",
    backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
    color: isDark ? "#eee" : "#333",
    padding: isPortrait ? "2vw" : "0.5vw",
});

const nameInputContainerStyle = (isPortrait: boolean): React.CSSProperties => ({
    display: "flex",
    height: isPortrait ? "25%" : "20%",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: isPortrait ? "3vw" : "5%",
});

const setMarkLabelStyle = (isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "4vw" : "1.3vw",
    width: "auto",
    fontWeight: "bold",
});

const setMarkInputContainerStyle = (isPortrait: boolean): React.CSSProperties => ({
    display: "flex",
    height: isPortrait ? "50%" : "40%",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: isPortrait ? "4vw" : "6%",
    columnGap: isPortrait ? "3vw" : "5%",
    marginTop: isPortrait ? "3vw" : "5%",
});

const setMarkInputStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    width: "80%",
    height: "100%",
    borderRadius: isPortrait ? "2vw" : "0.8vw",
    border: isDark ? `${isPortrait ? "0.3vw" : "0.06vw"} solid #444` : `${isPortrait ? "0.3vw" : "0.06vw"} solid #e0e0e0`,
    outline: "none",
    textAlign: "left",
    padding: isPortrait ? "2vw" : "2% 0 2% 0",
    boxSizing: "border-box",
    fontSize: isPortrait ? "3.5vw" : "1.2vw",
    maxWidth: "80%",
    resize: "none",
    backgroundColor: isDark ? "#2d2d2d" : "#eeeeee",
    color: isDark ? "#eee" : "#333",
});

const submitButtonStyle = (isPortrait: boolean): React.CSSProperties => ({
    minWidth: isPortrait ? "50%" : "33%",
    width: "auto",
    height: isPortrait ? "8vh" : "14.5%",
    borderRadius: isPortrait ? "2vw" : "0.8vw",
    fontSize: isPortrait ? "3.5vw" : "1vw",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: isPortrait ? "auto" : "55%",
    zIndex: 2,
    padding: isPortrait ? "2vw 4vw" : "0.5vw 1vw",
});
