import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useReducer } from "react";
import { Action, ManageState } from "../pages/Manage";
import ComponentAsModel from "../utils/componentAsModel";
import AddWordSets from "../components/AddWordSets";
import { useTheme } from "../main";
import WordSetsTable from "../components/WordSetsTable";
import * as dbOperator from "../store/wordStore";

interface WordSetsManageProps {
    manageReducer: (state: ManageState, action: Action) => ManageState;
    setWordSets: React.Dispatch<React.SetStateAction<any[]>>;
    wordSets: any[];
}

export default function WordSetsManage({ manageReducer, setWordSets, wordSets }: WordSetsManageProps) {
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(manageReducer, { popup: "CLOSE_POPUP" });
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWordSets();
    }, [loading]);

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

    const cardStyle: React.CSSProperties = {
        width: "100%",
        marginTop: "3vh",
        // background: isDark
        //     ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
        //     : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        borderRadius: "0.7vw",
        boxShadow: isDark
            ? "0 4px 20px rgba(0, 0, 0, 0.3)"
            : "0 4px 20px rgba(0, 0, 0, 0.1)",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        // border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
    };

    const actionButtonsStyle: React.CSSProperties = {
        display: "flex",
        gap: "16px",
        paddingLeft: "1vw",
        marginBottom: "30px",
        flexWrap: "wrap",
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

    return (
        <>

            {state.popup === "SET_ADD_WORD_SETS" &&
                AddWordSetsAction(dispatch as (action: Action) => void, setWordSets)}

            <div style={cardStyle} data-testid="word-sets-manage-card">
                <h2 style={{ marginBottom: "1.5vh", paddingLeft: "1vw" }}>
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
                <WordSetsTable wordSets={wordSets} loading={loading} setLoading={setLoading} />
            </div>
        </>
    );
}
