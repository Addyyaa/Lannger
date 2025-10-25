import React, { useState, useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import ComponentAsModel from "../utils/componentAsModel";
import * as dbOperator from "../store/wordStore";
import WordSetsTable from "../components/WordSetsTable";

import AddWordSets from "../components/AddWordSets";

interface ManageState {
  popup: Action["type"];
}

type Action =
  | { type: "SET_ADD_WORD_SETS"; payload: Object }
  | { type: "SET_ADD_WORDS"; payload: Object }
  | { type: "SET_EXPORT_WORDS"; payload: any }
  | { type: "SET_DATA_BACKUP"; payload: any }
  | { type: "SET_DATA_RESTORE"; payload: any }
  | { type: "SET_DATA_CLEAR"; payload: any }
  | { type: "SET_EDIT_WORD_SET"; payload: any }
  | { type: "CLOSE_POPUP" }
  | { type: "SET_DELETE_WORD_SET"; payload: any };

function AddWordSetsAction(
  dispatch: (action: Action) => void,
  setWordSets: (wordSets: any[]) => void
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
    default:
      return state;
  }
}

export default function Manage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [wordSets, setWordSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, dispatch] = useReducer(manageReducer, { popup: "CLOSE_POPUP" });

  useEffect(() => {
    loadWordSets();
  }, []);

  const loadWordSets = async () => {
    try {
      const sets = await dbOperator.getAllWordSets();
      setWordSets(sets);
    } catch (error) {
      console.error("加载单词集失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
  };

  const cardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    borderRadius: "12px",
    padding: "24px",
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
    marginBottom: "30px",
    textAlign: "center",
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

  const actionButtonsStyle: React.CSSProperties = {
    display: "flex",
    gap: "16px",
    marginBottom: "30px",
    flexWrap: "wrap",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    background: isDark ? "#2d2d2d" : "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: isDark
      ? "0 2px 10px rgba(0, 0, 0, 0.3)"
      : "0 2px 10px rgba(0, 0, 0, 0.1)",
  };

  const thStyle: React.CSSProperties = {
    background: isDark ? "#3a3a3a" : "#f8f9fa",
    color: isDark ? "#fff" : "#333",
    padding: "16px",
    textAlign: "left",
    borderBottom: isDark ? "1px solid #555" : "1px solid #e0e0e0",
    fontWeight: "bold",
  };

  const tdStyle: React.CSSProperties = {
    padding: "16px",
    borderBottom: isDark ? "1px solid #444" : "1px solid #e0e0e0",
    color: isDark ? "#ccc" : "#666",
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "60px 20px",
    color: isDark ? "#888" : "#999",
  };

  const handleAddWordSet = async () => {
    dispatch({ type: "SET_ADD_WORD_SETS", payload: {} });
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>{t("manage")}</h1>

      {state.popup === "SET_ADD_WORD_SETS" &&
        AddWordSetsAction(dispatch as (action: Action) => void, setWordSets)}

      <div style={cardStyle}>
        <h2 style={{ marginBottom: "20px", color: isDark ? "#fff" : "#333" }}>
          {t("wordSetManagement")}
        </h2>

        <div style={actionButtonsStyle}>
          <button
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(0, 180, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(0, 180, 255, 0.3)";
            }}
            onClick={handleAddWordSet}
            data-testid="add-word-set-button"
          >
            {t("addWordSet")}
          </button>
          <button
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(0, 180, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(0, 180, 255, 0.3)";
            }}
            data-testid="import-words-button"
          >
            {t("importWords")}
          </button>
          <button
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(0, 180, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(0, 180, 255, 0.3)";
            }}
            data-testid="export-data-button"
          >
            {t("exportData")}
          </button>
        </div>
        <WordSetsTable wordSets={wordSets} loading={loading} />
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
                  dbOperator.deleteDatabase();
                  setWordSets([]);
                }}
              >
                {t("clearData")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
