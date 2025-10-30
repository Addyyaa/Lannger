import { restoreDatabase } from "../store/wordStore";
import ConfirmWidget from "./ConfirmWidget";
import { Trans, useTranslation } from "react-i18next";
import React, { useState } from "react";
import type { Action } from "../pages/Manage";
import { WordSet, Word } from "../db";

interface RestoreDataProps {
    close: () => void;
    setPopup: React.Dispatch<Action>;
    setWordSets: React.Dispatch<React.SetStateAction<WordSet[]>>;
    wordSets: WordSet[];
}

export default function RestoreData({ close, setPopup, setWordSets, wordSets }: RestoreDataProps) {
    const { t } = useTranslation();
    const [file, setFile] = useState<{ wordSets: WordSet[]; words: Word[] } | null>(null);
    const [fileName, setFileName] = useState<string>("");
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
                try {
                    const text = await selectedFile.text();
                    const langggerDB = JSON.parse(text) as { wordSets: WordSet[]; words: Word[] };
                    setFile(langggerDB);
                } catch (error) {
                    alert(error);
                }
            }
        }
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    async function restoreData() {
        if (file) {
            try {
                await restoreDatabase(file);
            } catch (error) {
                alert(error);
            }
        }
        setWordSets(wordSets.concat(file?.wordSets || wordSets));
        setPopup({ type: "CLOSE_POPUP" });
    }
    return (
        <ConfirmWidget
            title={t("restoreData")}
            message={<Trans i18nKey="restoreDataMessage" values={{ fileName }} components={{ highlight: <span style={{ color: "#00b4ff" }} /> }} />}
            onConfirm={restoreData}
            onCancel={selectFile}
            cancelButtonStyle={{ width: "auto" }}
            showCloseButton={true}
            close={close}
            cancelText={t("importData")}
        />
    )
}