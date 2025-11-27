import React, {
  useState,
  useReducer,
  useContext,
  createContext,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import ComponentAsModel from "../utils/componentAsModel";
import * as dbOperator from "../store/wordStore";
import WordSetsManage from "../components/WordSetsManage";
import AddWordSets from "../components/AddWordSets";
import ImportDialog from "../components/ImportDialog";
import ExportDialog from "../components/ExportDialog";
import ConfirmWidget from "../components/ConfirmWidget";
import RestoreData from "../components/RestoreData";
import { handleManagementTitleClick } from "../utils/errorMonitorToggle";

export interface ManageState {
  popup: Action["type"];
}

export type Action =
  | { type: "SET_ADD_WORD_SETS"; payload: Object }
  | { type: "SET_ADD_WORDS"; payload: Object }
  | { type: "SET_IMPORT_WORDS"; payload: Object }
  | { type: "SET_EXPORT_WORDS"; payload: any }
  | { type: "SET_DATA_BACKUP"; payload: any }
  | { type: "SET_DATA_RESTORE"; payload: any }
  | { type: "SET_DATA_CLEAR"; payload: any }
  | { type: "SET_EDIT_WORD_SET"; payload: any }
  | { type: "CLOSE_POPUP" }
  | { type: "SET_DELETE_WORD_SET"; payload: any }
  | { type: "CLOSE_EDIT_WORD_SET"; payload: any }
  | { type: "SET_DATA_RESTORE_CONFIRM"; payload: any }
  | { type: "SET_CLEAR_DATA"; payload: any };

type ManageContextValue = {
  state: ManageState;
  dispatch: React.Dispatch<Action>;
};

export const ManageContext = createContext<ManageContextValue>({
  state: { popup: "CLOSE_POPUP" },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  dispatch: () => {},
});

export function useManageContext(): ManageContextValue {
  return useContext(ManageContext);
}

function AddWordSetsAction(
  dispatch: (action: Action) => void,
  setWordSets: React.Dispatch<React.SetStateAction<any[]>>
) {
  return ComponentAsModel(
    <AddWordSets
      data-test-id="manage-add-word-sets-test"
      closePopup={() => dispatch({ type: "CLOSE_POPUP" })}
      addWordSet={setWordSets}
    />
  );
}

function ImportWordsAction(
  dispatch: (action: Action) => void,
  setWordSets: React.Dispatch<React.SetStateAction<any[]>>
) {
  return ComponentAsModel(
    <ImportDialog
      data-test-id="manage-import-dialog-test"
      closePopup={() => dispatch({ type: "CLOSE_POPUP" })}
      onImportComplete={async () => {
        // 导入完成后刷新单词集列表（包含单词数量）
        try {
          const sets = await dbOperator.getAllWordSets();
          // 为每个单词集获取单词数量
          const setsWithWords = await Promise.all(
            sets.map(async (set) => {
              const words = await dbOperator.getWordsByWordSet(set.id);
              return { ...set, words };
            })
          );
          setWordSets(setsWithWords);
        } catch (error) {
          console.error("刷新单词集列表失败:", error);
        }
      }}
    />
  );
}

function ExportWordsAction(dispatch: (action: Action) => void) {
  return ComponentAsModel(
    <ExportDialog
      data-test-id="manage-export-dialog-test"
      closePopup={() => dispatch({ type: "CLOSE_POPUP" })}
      onExportComplete={() => {
        // 导出完成后的回调（可选）
      }}
    />
  );
}

function manageReducer(state: ManageState, action: Action): ManageState {
  switch (action.type) {
    case "SET_ADD_WORD_SETS":
      return { ...state, popup: action.type };
    case "SET_ADD_WORDS":
      return { ...state, popup: action.type };
    case "SET_IMPORT_WORDS":
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
    case "SET_DATA_RESTORE_CONFIRM":
      return { ...state, popup: "SET_DATA_RESTORE_CONFIRM" };
    case "CLOSE_EDIT_WORD_SET":
      return { ...state, popup: "CLOSE_EDIT_WORD_SET" };
    default:
      return state;
  }
}

const ClearDataConfirmWidget = ({
  dispatch,
  setWordSets,
}: {
  dispatch: (action: Action) => void;
  setWordSets: React.Dispatch<React.SetStateAction<any[]>>;
}) => {
  const { t } = useTranslation();
  return (
    <ConfirmWidget
      data-test-id="manage-confirm-widget-test"
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
      cancelButtonStyle={{
        backgroundColor: "rgb(88, 130, 206)",
        color: "rgb(255, 255, 255)",
      }}
      confirmButtonStyle={{
        backgroundColor: "rgb(193, 198, 206)",
        color: "rgb(0, 0, 0)",
      }}
    />
  );
};

export default function Manage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  const [wordSets, setWordSets] = useState<any[]>([]);
  const [state, dispatch] = useReducer(manageReducer, { popup: "CLOSE_POPUP" });
  const [dailyGoalValue, setDailyGoalValue] = useState<number>(20);
  const [dailyGoalInput, setDailyGoalInput] = useState<string>("20");
  const [isGoalLoading, setIsGoalLoading] = useState<boolean>(true);
  const [isGoalSaving, setIsGoalSaving] = useState<boolean>(false);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    height: "100%",
    width: "100%",
    padding: isPortrait ? "0 3vw" : "0 2vw",
    boxSizing: "border-box",
    scrollbarWidth: "thin", // Firefox：设置滚动条为细样式
    scrollbarColor: "transparent transparent", // Firefox：默认滑块和轨道透明
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    background: isDark
      ? "linear-gradient(135deg, rgba(45, 45, 45, 0.85) 0%, rgba(58, 58, 58, 0.75) 100%)"
      : "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 249, 250, 0.85) 100%)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderRadius: isPortrait ? "2.5vw" : "1vw",
    marginBottom: isPortrait ? "3vw" : "1.5vw",
    padding: isPortrait ? "4.5vw" : "2vw",
    boxShadow: isDark
      ? isPortrait
        ? "0 1.5vw 6vw rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
        : "0 0.5vw 2vw rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      : isPortrait
      ? "0 1.5vw 6vw rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)"
      : "0 0.5vw 2vw rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
    border: isDark
      ? `${isPortrait ? "0.3vw" : "0.08vw"} solid rgba(255, 255, 255, 0.1)`
      : `${isPortrait ? "0.3vw" : "0.08vw"} solid rgba(0, 0, 0, 0.08)`,
    boxSizing: "border-box",
    transition: "all 0.3s ease",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "5.5vw" : "1.75vw",
    fontWeight: "bold",
    color: "#00b4ff",
    textAlign: "center",
    margin: isPortrait ? "0 0 3vw 0" : "0",
  };

  const buttonStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
    color: "white",
    border: "none",
    borderRadius: isPortrait ? "2.5vw" : "0.75vw",
    padding: isPortrait ? "3.5vw 6.5vw" : "0.9vw 1.8vw",
    fontSize: isPortrait ? "3.5vw" : "1vw",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: isPortrait
      ? "0 1.5vw 4vw rgba(0, 180, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
      : "0 0.4vw 1.2vw rgba(0, 180, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
    position: "relative",
    overflow: "hidden",
  };

  const senction1Style: React.CSSProperties = {
    width: "100%",
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  };

  useEffect(() => {
    let mounted = true;
    const loadDailyGoal = async () => {
      try {
        const settings = await dbOperator.getUserSettings();
        if (!mounted) {
          return;
        }
        setDailyGoalValue(settings.dailyGoal);
        setDailyGoalInput(String(settings.dailyGoal));
      } catch (error) {
        console.error("加载每日学习目标失败:", error);
      } finally {
        if (mounted) {
          setIsGoalLoading(false);
        }
      }
    };
    loadDailyGoal();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDailyGoalCommit = async () => {
    if (isGoalLoading || isGoalSaving) {
      return;
    }
    const trimmed = dailyGoalInput.trim();
    if (trimmed === "") {
      setDailyGoalInput(String(dailyGoalValue));
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setDailyGoalInput(String(dailyGoalValue));
      return;
    }
    const clamped = Math.max(1, Math.round(parsed));
    if (clamped !== parsed) {
      setDailyGoalInput(String(clamped));
    }
    if (clamped === dailyGoalValue) {
      return;
    }
    setIsGoalSaving(true);
    try {
      const updatedSettings = await dbOperator.updateDailyGoal(clamped);
      setDailyGoalValue(updatedSettings.dailyGoal);
      setDailyGoalInput(String(updatedSettings.dailyGoal));
    } catch (error) {
      console.error("更新每日学习目标失败:", error);
      setDailyGoalInput(String(dailyGoalValue));
    } finally {
      setIsGoalSaving(false);
    }
  };

  return (
    <ManageContext.Provider value={{ state, dispatch }}>
      <div data-test-id="div-test-5" style={containerStyle}>
        <section
          data-test-id="section-test-1"
          style={senction1Style}
          data-testid="word-sets-manage-section"
        >
          <h1
            data-test-id="h1-test"
            style={{
              ...titleStyle,
              cursor: "pointer", // 始终允许点击，支持正式环境
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleManagementTitleClick();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onDragStart={(e) => {
              e.preventDefault();
            }}
          >
            {t("manage")}
          </h1>

          {state.popup === "SET_ADD_WORD_SETS" &&
            AddWordSetsAction(
              dispatch as (action: Action) => void,
              setWordSets
            )}
          {state.popup === "SET_IMPORT_WORDS" &&
            ImportWordsAction(
              dispatch as (action: Action) => void,
              setWordSets
            )}
          {state.popup === "SET_EXPORT_WORDS" &&
            ExportWordsAction(dispatch as (action: Action) => void)}
          <WordSetsManage
            data-test-id="word-sets-manage-test"
            manageReducer={manageReducer}
            setWordSets={setWordSets}
            wordSets={wordSets}
          />
        </section>
        <section
          data-test-id="section-test"
          style={cardStyle}
          data-testid="system-settings-section"
        >
          <h2
            data-test-id="h2-test"
            style={{
              marginBottom: isPortrait ? "3vw" : "1.25vw",
              fontSize: isPortrait ? "4.5vw" : "1.25vw",
              color: isDark ? "#fff" : "#333",
            }}
          >
            {t("systemSettings")}
          </h2>

          <div
            data-test-id="div-test-4"
            style={{
              display: "grid",
              gridTemplateColumns: isPortrait
                ? "1fr"
                : "repeat(auto-fit, minmax(18.75vw, 1fr))",
              gap: isPortrait ? "3vw" : "1.25vw",
            }}
          >
            <div
              data-test-id="div-test-3"
              style={{
                padding: isPortrait ? "4vw" : "1.25vw",
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderRadius: isPortrait ? "2vw" : "0.5vw",
                border: isDark
                  ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #555`
                  : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
              }}
            >
              <h3
                data-test-id="h3-test-1"
                style={{
                  margin: `0 0 ${isPortrait ? "3vw" : "1vw"} 0`,
                  color: isDark ? "#fff" : "#333",
                  fontSize: isPortrait ? "4vw" : "1.125vw",
                  display: "flex",
                  alignItems: "center",
                  gap: isPortrait ? "2vw" : "0.5vw",
                }}
              >
                {t("studySettings")}
              </h3>
              <div
                data-test-id="div-test-2"
                style={{ marginBottom: isPortrait ? "2vw" : "0.75vw" }}
              >
                <label
                  data-test-id="label-test"
                  style={{
                    marginBottom: isPortrait ? "1.5vw" : "0.25vw",
                    color: isDark ? "#ccc" : "#666",
                    fontSize: isPortrait ? "3.5vw" : "0.875vw",
                    display: "flex",
                    alignItems: "center",
                    gap: isPortrait ? "2vw" : "0.5vw",
                  }}
                >
                  {t("dailyGoal")}
                  {(isGoalLoading || isGoalSaving) && (
                    <span
                      data-test-id="manage-span-test"
                      role="status"
                      aria-live="polite"
                      style={{
                        fontSize: isPortrait ? "3vw" : "0.75vw",
                        color: "#00b4ff",
                      }}
                    >
                      {isGoalLoading ? "加载中…" : "正在保存…"}
                    </span>
                  )}
                </label>
                <input
                  data-test-id="input-test"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={dailyGoalInput}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/[^\d]/g, "");
                    setDailyGoalInput(nextValue);
                  }}
                  onBlur={handleDailyGoalCommit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleDailyGoalCommit();
                    }
                  }}
                  disabled={isGoalLoading || isGoalSaving}
                  style={{
                    width: "100%",
                    padding: isPortrait ? "3vw" : "0.5vw",
                    border: isDark
                      ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #555`
                      : `${isPortrait ? "0.25vw" : "0.06vw"} solid #ddd`,
                    borderRadius: isPortrait ? "1.5vw" : "0.25vw",
                    background: isDark ? "#3a3a3a" : "#fff",
                    color: isDark ? "#fff" : "#333",
                    fontSize: isPortrait ? "3.5vw" : "0.875vw",
                    boxSizing: "border-box",
                    opacity: isGoalLoading || isGoalSaving ? 0.6 : 1,
                  }}
                />
              </div>
            </div>

            <div
              data-test-id="div-test-1"
              style={{
                padding: isPortrait ? "4vw" : "1.25vw",
                background: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.02)",
                borderRadius: isPortrait ? "2vw" : "0.5vw",
                border: isDark
                  ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #555`
                  : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
              }}
            >
              <h3
                data-test-id="h3-test"
                style={{
                  margin: `0 0 ${isPortrait ? "3vw" : "1vw"} 0`,
                  color: isDark ? "#fff" : "#333",
                  fontSize: isPortrait ? "4vw" : "1.125vw",
                  display: "flex",
                  alignItems: "center",
                  gap: isPortrait ? "2vw" : "0.5vw",
                }}
              >
                💾 {t("backupData")}
              </h3>
              <div
                data-test-id="div-test"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isPortrait ? "2.5vw" : "0.5vw",
                }}
              >
                <button
                  data-test-id="button-test-2"
                  style={{
                    ...buttonStyle,
                    width: "100%",
                  }}
                  onClick={() => {
                    dispatch({ type: "SET_EXPORT_WORDS", payload: {} });
                  }}
                  onMouseEnter={(e) => {
                    if (!isPortrait) {
                      e.currentTarget.style.transform = "translateY(-0.125vw)";
                      e.currentTarget.style.boxShadow =
                        "0 0.5vw 1.5vw rgba(0, 180, 255, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPortrait) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = isPortrait
                        ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)"
                        : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
                    }
                  }}
                >
                  {t("backupData")}
                </button>
                <button
                  data-test-id="button-test-1"
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    background:
                      "linear-gradient(135deg, #ffa502 0%, #ff9500 100%)",
                  }}
                  onClick={() => {
                    dispatch({ type: "SET_DATA_RESTORE_CONFIRM", payload: {} });
                  }}
                  onMouseEnter={(e) => {
                    if (!isPortrait) {
                      e.currentTarget.style.transform = "translateY(-0.125vw)";
                      e.currentTarget.style.boxShadow =
                        "0 0.5vw 1.5vw rgba(255, 165, 2, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPortrait) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = isPortrait
                        ? "0 1vw 3.75vw rgba(255, 165, 2, 0.3)"
                        : "0 0.25vw 0.9375vw rgba(255, 165, 2, 0.3)";
                    }
                  }}
                >
                  {t("restoreData")}
                </button>
                <button
                  data-test-id="button-test"
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    background:
                      "linear-gradient(135deg, #ff4757 0%, #ff3742 100%)",
                  }}
                  onClick={() => {
                    dispatch({ type: "SET_CLEAR_DATA", payload: {} });
                  }}
                  onMouseEnter={(e) => {
                    if (!isPortrait) {
                      e.currentTarget.style.transform = "translateY(-0.125vw)";
                      e.currentTarget.style.boxShadow =
                        "0 0.5vw 1.5vw rgba(255, 71, 87, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPortrait) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = isPortrait
                        ? "0 1vw 3.75vw rgba(255, 71, 87, 0.3)"
                        : "0 0.25vw 0.9375vw rgba(255, 71, 87, 0.3)";
                    }
                  }}
                >
                  {t("clearData")}
                </button>
                {state.popup === "SET_CLEAR_DATA" && (
                  <ClearDataConfirmWidget
                    data-test-id="clear-data-confirm-widget-test"
                    dispatch={dispatch as (action: Action) => void}
                    setWordSets={setWordSets}
                  />
                )}
                {state.popup === "SET_DATA_RESTORE_CONFIRM" && (
                  <RestoreData
                    data-test-id="restore-data-test"
                    close={() => dispatch({ type: "CLOSE_POPUP" } as Action)}
                    setPopup={dispatch}
                    setWordSets={setWordSets}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ManageContext.Provider>
  );
}
