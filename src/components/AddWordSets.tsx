import { useTheme } from "../main";
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
      style={{
        ...AddWordSetsStyle,
        backgroundColor: isDark ? "#2d2d2d" : "#f8f9fa",
      }}
    >
      <label
        style={{ ...AddWordSetTitleStyle, color: isDark ? "#eee" : "#333" }}
      >
        {t("addWordSetTitle")}
      </label>
      <button
        onClick={closePopup}
        style={CloseButtonStyle}
        data-testid="AddWordSets-close-button"
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
              data-testid="AddWordSets-setName-input"
              style={nameInputStyle}
              value={wordSet.name}
              onChange={(e) => setWordSet({ ...wordSet, name: e.target.value })}
            />
          </div>
          <div style={setMarkInputContainerStyle}>
            <label style={setMarkLabelStyle}>{t("setMark")}</label>
            <textarea
              data-testid="AddWordSets-setMark-input"
              style={setMarkInputStyle}
              value={wordSet.mark}
              onChange={(e) => setWordSet({ ...wordSet, mark: e.target.value })}
            />
          </div>
        </fieldset>
        <button style={submitButtonStyle} onClick={handleSubmit}>
          {t("addWordSet")}
        </button>
      </form>
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

const nameInputStyle: React.CSSProperties = {
  width: "80%",
  height: "100%",
  borderRadius: "0.8vw",
  border: "1px solid #ccc",
  outline: "none",
  fontSize: "1.2vw",
  boxSizing: "border-box",
};

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

const setMarkInputStyle: React.CSSProperties = {
  width: "80%",
  height: "100%",
  borderRadius: "0.8vw",
  border: "1px solid #ccc",
  outline: "none",
  textAlign: "left",
  padding: "2% 0 2% 0",
  boxSizing: "border-box",
  fontSize: "1.2vw",
  maxWidth: "80%",
  resize: "none",
};

const submitButtonStyle: React.CSSProperties = {
  width: "33%",
  height: "14.5%",
  borderRadius: "0.8vw",
  fontSize: "1vw",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "55%",
  zIndex: 2,
};
