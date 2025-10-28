import React, { useState, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import ComponentAsModel from "../utils/componentAsModel";
import * as dbOperator from "../store/wordStore";
import WordSetsManage from "../components/WordSetsManage";
import AddWordSets from "../components/AddWordSets";
import ConfirmWidget from "../components/ConfirmWidget";
import { todo } from "node:test";

export interface ManageState {
  popup: Action["type"];
}

export type Action =
  | { type: "SET_ADD_WORD_SETS"; payload: Object }
  | { type: "SET_ADD_WORDS"; payload: Object }
  | { type: "SET_EXPORT_WORDS"; payload: any }
  | { type: "SET_DATA_BACKUP"; payload: any }
  | { type: "SET_DATA_RESTORE"; payload: any }
  | { type: "SET_DATA_CLEAR"; payload: any }
  | { type: "SET_EDIT_WORD_SET"; payload: any }
  | { type: "CLOSE_POPUP" }
  | { type: "SET_DELETE_WORD_SET"; payload: any }
  | { type: "SET_CLEAR_DATA"; payload: any };

function AddWordSetsAction(
  dispatch: (action: Action) => void,
  setWordSets: React.Dispatch<React.SetStateAction<any[]>>
) {
  return ComponentAsModel(
    <AddWordSets
      closePopup={() => dispatch({ type: "CLOSE_POPUP" })}
      addWordSet={setWordSets}
    />
  );
}

function manageReducer(state: ManageState, action: Action): ManageState {
  switch (action.type) {
    case "SET_ADD_WORD_SETS":
      return { ...state, popup: action.type };
    case "SET_ADD_WORDS":
      return { ...state, popup: action.type };
    case "SET_EXPORT_WORDS":
      return { ...state, popup: action.type };
    case "SET_DATA_BACKUP":
      return { ...state, popup: action.type };
    case "SET_DATA_RESTORE":
      return { ...state, popup: action.type };
    case "SET_DATA_CLEAR":
      return { ...state, popup: action.type };
    case "SET_EDIT_WORD_SET":
      return { ...state, popup: action.type };
    case "SET_DELETE_WORD_SET":
      return { ...state, popup: action.type };
    case "CLOSE_POPUP":
      return { ...state, popup: "CLOSE_POPUP" };
    case "SET_CLEAR_DATA":
      return { ...state, popup: "SET_CLEAR_DATA" };
    default:
      return state;
  }
}

const ClearDataConfirmWidget = ({ dispatch, setWordSets }: { dispatch: (action: Action) => void, setWordSets: React.Dispatch<React.SetStateAction<any[]>> }) => {
  const { t } = useTranslation();
  return (
    <ConfirmWidget
      title={t("clearData")}
      message={t("clearDataMessage")}
      onConfirm={async () => {
        dbOperator.deleteDatabase();
        setWordSets([]);
        dispatch({ type: "CLOSE_POPUP" });
      }}
      onCancel={() => {
        dispatch({ type: "CLOSE_POPUP" });
      }}
    />
  );
}

export default function Manage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [wordSets, setWordSets] = useState<any[]>([]);
  const [state, dispatch] = useReducer(manageReducer, { popup: "CLOSE_POPUP" });


  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    height: "100%",
    width: "100%",
    padding: "0 2vw",
    boxSizing: "border-box",
    scrollbarWidth: "thin", // Firefox：设置滚动条为细样式
    scrollbarColor: "transparent transparent", // Firefox：默认滑块和轨道透明
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    background: isDark
      ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    borderRadius: "0.7vw",
    marginBottom: "20px",
    boxShadow: isDark
      ? "0 4px 20px rgba(0, 0, 0, 0.3)"
      : "0 4px 20px rgba(0, 0, 0, 0.1)",
    border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#00b4ff",
    textAlign: "center",
    margin: 0
  };

  const buttonStyle: React.CSSProperties = {
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
  };

  const senction1Style: React.CSSProperties = {
    width: "100%",
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={containerStyle}>
      <div style={senction1Style}>
        <h1 style={titleStyle}>{t("manage")}</h1>

        {state.popup === "SET_ADD_WORD_SETS" &&
          AddWordSetsAction(dispatch as (action: Action) => void, setWordSets)}
        <WordSetsManage manageReducer={manageReducer} setWordSets={setWordSets} wordSets={wordSets} />
      </div>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: "20px", color: isDark ? "#fff" : "#333" }}>
          {t("systemSettings")}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          <div
            style={{
              padding: "20px",
              background: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              borderRadius: "8px",
              border: isDark ? "1px solid #555" : "1px solid #e0e0e0",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: isDark ? "#fff" : "#333",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {t("studySettings")}
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  color: isDark ? "#ccc" : "#666",
                  fontSize: "14px",
                }}
              >
                {t("dailyGoal")}
              </label>
              <input
                type="number"
                defaultValue="20"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: isDark ? "1px solid #555" : "1px solid #ddd",
                  borderRadius: "4px",
                  background: isDark ? "#3a3a3a" : "#fff",
                  color: isDark ? "#fff" : "#333",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "20px",
              background: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.02)",
              borderRadius: "8px",
              border: isDark ? "1px solid #555" : "1px solid #e0e0e0",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: isDark ? "#fff" : "#333",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              💾 {t("backupData")}
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <button
                style={{
                  ...buttonStyle,
                  width: "100%",
                  fontSize: "14px",
                }}
              >
                {t("backupData")}
              </button>
              <button
                style={{
                  ...buttonStyle,
                  width: "100%",
                  background:
                    "linear-gradient(135deg, #ffa502 0%, #ff9500 100%)",
                  fontSize: "14px",
                }}
              >
                {t("restoreData")}
              </button>
              <button
                style={{
                  ...buttonStyle,
                  width: "100%",
                  background:
                    "linear-gradient(135deg, #ff4757 0%, #ff3742 100%)",
                  fontSize: "14px",
                }}
                onClick={() => {
                  dispatch({ type: "SET_CLEAR_DATA", payload: {} });
                }}
              >
                {t("clearData")}
              </button>
              {state.popup === "SET_CLEAR_DATA" &&
                <ClearDataConfirmWidget dispatch={dispatch as (action: Action) => void} setWordSets={setWordSets} />
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
