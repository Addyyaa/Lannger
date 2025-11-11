import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useReducer } from "react";
import { Action, ManageState, useManageContext } from "../pages/Manage";
import ComponentAsModel from "../utils/componentAsModel";
import AddWordSets from "../components/AddWordSets";
import { useTheme, useOrientation } from "../main";
import WordSetsTable from "../components/WordSetsTable";
import * as dbOperator from "../store/wordStore";
import AddWord from "../components/AddWord";
import { useNavigate } from "react-router-dom";
import { APP_BUILD_TIME, APP_VERSION } from "../version";

interface WordSetsManageProps {
    manageReducer: (state: ManageState, action: Action) => ManageState;
    setWordSets: React.Dispatch<React.SetStateAction<any[]>>;
    wordSets: any[];
}

export default function WordSetsManage({ manageReducer, setWordSets, wordSets }: WordSetsManageProps) {
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(manageReducer, { popup: "CLOSE_POPUP" });
    const { dispatch: manageDispatch } = useManageContext();
    const { isDark } = useTheme();
    const { isPortrait } = useOrientation();
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();


    useEffect(() => {
        loadWordSets();
    }, [loading]);


    const handleImportWords = () => {
        manageDispatch({ type: "SET_IMPORT_WORDS", payload: {} });
    };

    const handleShowAllWords = () => {
        navigate("/wordsList");
    };
    const loadWordSets = async () => {
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
            console.error("加载单词集失败:", error);
        } finally {
            setLoading(false);
        }
    };

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

    const handleAddWordSet = async () => {
        dispatch({ type: "SET_ADD_WORD_SETS", payload: {} });
    };

    const handleAddWords = async () => {
        dispatch({ type: "SET_ADD_WORDS", payload: {} });
    };

    const cardStyle: React.CSSProperties = {
        width: "100%",
        position: "relative",
        marginTop: isPortrait ? "3vw" : "3vh",
        borderRadius: isPortrait ? "2vw" : "0.7vw",
        boxShadow: isDark
            ? isPortrait ? "0 1vw 5vw rgba(0, 0, 0, 0.3)" : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.3)"
            : isPortrait ? "0 1vw 5vw rgba(0, 0, 0, 0.1)" : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.1)",
        border: isDark ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #444` : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
        padding: isPortrait ? "4vw" : "1.5vw",
        boxSizing: "border-box",
    };

    const actionButtonsStyle: React.CSSProperties = {
        display: "flex",
        gap: isPortrait ? "2.5vw" : "1vw",
        paddingLeft: isPortrait ? "0" : "1vw",
        marginBottom: isPortrait ? "4vw" : "1.875vw",
        flexWrap: "wrap",
        justifyContent: isPortrait ? "stretch" : "flex-start",
        flexDirection: isPortrait ? "column" : "row",
    };

    const buttonStyle: React.CSSProperties = {
        background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
        color: "white",
        border: "none",
        borderRadius: isPortrait ? "2vw" : "0.5vw",
        padding: isPortrait ? "3vw 6vw" : "0.75vw 1.5vw",
        fontSize: isPortrait ? "3.5vw" : "1vw",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)",
        width: isPortrait ? "100%" : "auto",
    };

    const headerRowStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: isPortrait ? "column" : "row",
        alignItems: isPortrait ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: isPortrait ? "2vw" : "1vw",
        marginBottom: isPortrait ? "3vw" : "1.5vh",
        paddingLeft: isPortrait ? "0" : "1vw",
    };

    const versionContainerStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: isPortrait ? "flex-start" : "flex-end",
        gap: isPortrait ? "1vw" : "0.25vw",
        color: isDark ? "#fff" : "#333",
        fontSize: isPortrait ? "3.4vw" : "0.9vw",
    };

    const versionBadgeStyle: React.CSSProperties = {
        padding: isPortrait ? "1.2vw 2.4vw" : "0.35vw 0.8vw",
        borderRadius: "999px",
        background: "rgba(0, 180, 255, 0.12)",
        border: "1px solid rgba(0, 180, 255, 0.35)",
        fontWeight: 600,
        color: "#00b4ff",
    };

    const buildInfoStyle: React.CSSProperties = {
        fontSize: isPortrait ? "3.2vw" : "0.85vw",
        color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)",
    };

    const buildTimeDisplay = new Date(APP_BUILD_TIME).toLocaleString();

    return (
        <>

            {state.popup === "SET_ADD_WORD_SETS" &&
                AddWordSetsAction(dispatch as (action: Action) => void, setWordSets)}

            <div data-test-id="div-test-1" style={cardStyle} data-testid="word-sets-manage-card">
                <div style={headerRowStyle}>
                    <h2 data-test-id="h2-test" style={{
                        margin: 0,
                        fontSize: isPortrait ? "4.5vw" : "1.25vw",
                        color: isDark ? "#fff" : "#333",
                    }}>
                        {t("wordSetManagement")}
                    </h2>
                    <div style={versionContainerStyle}>
                        <span style={versionBadgeStyle}>{t("currentVersion", { version: APP_VERSION })}</span>
                        <span style={buildInfoStyle}>{t("buildTime", { time: buildTimeDisplay })}</span>
                    </div>
                </div>

                <div data-test-id="div-test" style={actionButtonsStyle}>
                    <button
                        data-test-id="button-test-3" style={buttonStyle}
                        onMouseEnter={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(-0.125vw)";
                                e.currentTarget.style.boxShadow =
                                    "0 0.375vw 1.25vw rgba(0, 180, 255, 0.4)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                    isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
                            }
                        }}
                        onClick={handleAddWordSet}
                        data-testid="add-word-set-button"
                    >
                        {t("addWordSet")}
                    </button>
                    <button
                        data-test-id="button-test-2" style={buttonStyle}
                        onMouseEnter={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(-0.125vw)";
                                e.currentTarget.style.boxShadow =
                                    "0 0.375vw 1.25vw rgba(0, 180, 255, 0.4)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                    isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
                            }
                        }}
                        data-testid="import-words-button"
                        onClick={handleAddWords}
                    >
                        {'➕ ' + t("addWords")}
                    </button>
                    <button
                        data-test-id="button-test-1" style={buttonStyle}
                        onMouseEnter={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(-0.125vw)";
                                e.currentTarget.style.boxShadow =
                                    "0 0.375vw 1.25vw rgba(0, 180, 255, 0.4)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                    isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
                            }
                        }}
                        data-testid="import-words-button"
                        onClick={handleImportWords}
                    >
                        {t("importWords")}
                    </button>
                    <button
                        data-test-id="button-test" style={buttonStyle}
                        onMouseEnter={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(-0.125vw)";
                                e.currentTarget.style.boxShadow =
                                    "0 0.375vw 1.25vw rgba(0, 180, 255, 0.4)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isPortrait) {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                    isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
                            }
                        }}
                        onClick={handleShowAllWords}
                        data-testid="show-all-words-button"
                    >
                        {'📖 ' + t("wordListAllWords")}
                    </button>
                </div>

            </div>
            <WordSetsTable data-test-id="wordsetstable-test" wordSets={wordSets} loading={loading} setLoading={setLoading} />
            {state.popup === "SET_ADD_WORDS" &&
                <AddWord data-test-id="addword-test" closePopup={() => dispatch({ type: "CLOSE_POPUP" })} />
            }

        </>
    );
}
