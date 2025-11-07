import { restoreDatabase, getAllWordSets, getWordsByWordSet } from "../store/wordStore";
import ConfirmWidget from "./ConfirmWidget";
import { Trans, useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useState } from "react";
import type { Action } from "../pages/Manage";
import { WordSet, Word } from "../db";

interface RestoreDataProps {
    close: () => void;
    setPopup: React.Dispatch<Action>;
    setWordSets: React.Dispatch<React.SetStateAction<WordSet[]>>;
}

export default function RestoreData({ close, setPopup, setWordSets }: RestoreDataProps) {
    const { t } = useTranslation();
    const [parsedData, setParsedData] = useState<unknown>(null);
    const [fileName, setFileName] = useState<string>("");
    const [isRestoring, setIsRestoring] = useState<boolean>(false);
    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [pendingRestore, setPendingRestore] = useState<boolean>(false);
    function selectFile() {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";
        fileInput.style.display = "none";
        fileInput.onchange = async (e) => {
            const target = e.target as HTMLInputElement;
            const selectedFile = target?.files?.[0];
            if (selectedFile) {
                setFileName(selectedFile.name);
                setIsParsing(true);
                try {
                    const text = await selectedFile.text();
                    const jsonData = JSON.parse(text);

                    let normalized: unknown = null;
                    if (Array.isArray(jsonData)) {
                        normalized = jsonData;
                    } else if (jsonData && typeof jsonData === "object") {
                        const maybeObject = jsonData as { wordSets?: WordSet[]; words?: Word[] };
                        if (Array.isArray(maybeObject.wordSets) || Array.isArray(maybeObject.words)) {
                            normalized = jsonData;
                        }
                    }

                    if (!normalized) {
                        throw new Error(t("invalidFileFormat") || "文件格式错误");
                    }

                    setParsedData(normalized);
                } catch (error) {
                    console.error("恢复数据解析失败:", error);
                    alert((t("importFailed") || "导入失败") + `: ${error instanceof Error ? error.message : String(error)}`);
                    setParsedData(null);
                    setFileName("");
                    setPendingRestore(false);
                } finally {
                    setIsParsing(false);
                }
            } else {
                setIsParsing(false);
            }
        }
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    const executeRestore = useCallback(async (data: unknown) => {
        setPendingRestore(false);
        try {
            setIsRestoring(true);
            await restoreDatabase(data);

            const latestWordSets = await getAllWordSets();
            const setsWithWords = await Promise.all(
                latestWordSets.map(async (set) => {
                    const words = await getWordsByWordSet(set.id);
                    return { ...set, words };
                })
            );
            setWordSets(setsWithWords);

            alert(t("importComplete") || "导入完成");
            setPopup({ type: "CLOSE_POPUP" });
            close?.();
        } catch (error) {
            console.error("恢复数据失败:", error);
            alert((t("importFailed") || "导入失败") + `: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsRestoring(false);
        }
    }, [close, setPopup, setWordSets, t]);

    useEffect(() => {
        if (pendingRestore && parsedData && !isParsing && !isRestoring) {
            setPendingRestore(false);
            void executeRestore(parsedData);
        }
    }, [pendingRestore, parsedData, isParsing, isRestoring, executeRestore]);

    async function handleConfirm() {
        if (isRestoring) {
            return;
        }

        if (isParsing) {
            setPendingRestore(true);
            return;
        }

        if (!parsedData) {
            setPendingRestore(true);
            selectFile();
            return;
        }

        await executeRestore(parsedData);
    }
    return (
        <ConfirmWidget
            title={t("restoreData")}
            message={<Trans i18nKey="restoreDataMessage" values={{ fileName }} components={{ highlight: <span style={{ color: "#00b4ff" }} /> }} />}
            onConfirm={handleConfirm}
            onCancel={selectFile}
            cancelButtonStyle={{ width: "auto" }}
            showCloseButton={true}
            close={close}
            cancelText={t("importData")}
            confirmText={isRestoring ? (t("loading") || "加载中...") : isParsing ? (t("loading") || "解析中...") : undefined}
            confirmDisabled={isRestoring}
            confirmButtonStyle={{ cursor: isRestoring ? "not-allowed" : isParsing ? "wait" : "pointer" }}
        />
    )
}