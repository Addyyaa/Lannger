import { useState, useRef } from "react";
import { useTheme } from "../main";
import { useTranslation } from "react-i18next";
import CloseButton from "./CloseButton";
import * as dbOperator from "../store/wordStore";
import { Word } from "../db";
import { DEFAULT_WORD_SET_ID } from "../db";

interface ImportDialogProps {
    closePopup: () => void;
}

/**
 * 单词批量导入组件
 * 支持模板下载、文件选择和批量导入
 */
export default function ImportDialog({ closePopup }: ImportDialogProps) {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 下载模板文件
    const handleDownloadTemplate = () => {
        const template = [
            {
                kana: "あいうえお",
                kanji: "あいうえお",
                meaning: "示例意思",
                example: "これは例文です。",
                mark: "",
                difficultyCoefficient: "5",
                wordSet: "Default",
            },
        ];

        const jsonContent = JSON.stringify(template, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "word_template.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 处理文件选择
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setFileName(file.name);
        }
    };

    // 触发文件选择
    const handleSelectFile = () => {
        fileInputRef.current?.click();
    };

    // 导入单词
    const handleImport = async () => {
        if (!selectedFile) {
            alert(t("pleaseSelectFile") || "请选择文件");
            return;
        }

        try {
            const text = await selectedFile.text();
            const wordsData = JSON.parse(text);

            if (!Array.isArray(wordsData)) {
                alert(t("invalidFileFormat") || "文件格式错误：必须是JSON数组");
                return;
            }

            // 获取所有单词集，用于名称到ID的映射
            const wordSets = await dbOperator.getAllWordSets();
            const wordSetMap = new Map<string, number>();
            wordSets.forEach((set) => {
                wordSetMap.set(set.name, set.id);
            });

            let successCount = 0;
            let failCount = 0;

            for (const wordData of wordsData) {
                try {
                    // 验证必填字段
                    if (!wordData.kana || !wordData.kanji || !wordData.meaning || !wordData.example) {
                        failCount++;
                        continue;
                    }

                    // 处理单词集ID
                    let setId = DEFAULT_WORD_SET_ID;
                    if (wordData.wordSet) {
                        setId = wordSetMap.get(wordData.wordSet) || DEFAULT_WORD_SET_ID;
                    }

                    // 构建单词对象
                    const word: Omit<Word, "id" | "createdAt" | "updatedAt"> = {
                        kana: wordData.kana,
                        kanji: wordData.kanji,
                        meaning: wordData.meaning,
                        example: wordData.example,
                        mark: wordData.mark || "",
                        setId: setId,
                        review: {
                            times: 0,
                            difficulty: parseInt(wordData.difficultyCoefficient || "5", 10),
                        },
                    };

                    await dbOperator.createWord(word);
                    successCount++;
                } catch (error) {
                    console.error("导入单词失败:", error);
                    failCount++;
                }
            }

            alert(
                `${t("importComplete") || "导入完成"}：${t("success") || "成功"} ${successCount}，${t("failed") || "失败"} ${failCount}`
            );
            closePopup();
        } catch (error) {
            console.error("导入失败:", error);
            alert(t("importFailed") || "导入失败：" + error);
        }
    };

    return (
        <div style={ImportDialogStyle}>
            <div style={DialogContainerStyle(isDark)}>
                <CloseButton onClick={closePopup} ariaLabel={t("close")} iconColor={isDark ? "#ffffff" : "#333333"} />
                <div style={ContentStyle}>
                    <h2 style={TitleStyle(isDark)}>{t("importWords")}</h2>

                    <div style={ButtonContainerStyle}>
                        <button style={ButtonStyle(isDark)} onClick={handleDownloadTemplate}>
                            {t("downloadTemplate")}
                        </button>
                        <button style={ButtonStyle(isDark)} onClick={handleSelectFile}>
                            {t("selectFile")}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            style={{ display: "none" }}
                        />
                        <button
                            style={ButtonStyle(isDark, !selectedFile)}
                            onClick={handleImport}
                            disabled={!selectedFile}
                        >
                            {t("import")}
                        </button>
                    </div>

                    {fileName && (
                        <div style={FileNameStyle(isDark)}>
                            {t("selectedFile")}: {fileName}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const ImportDialogStyle: React.CSSProperties = {
    position: "fixed",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    top: 0,
    left: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const DialogContainerStyle = (isDark: boolean): React.CSSProperties => ({
    position: "relative",
    width: "40vw",
    aspectRatio: "1.5/1",
    display: "flex",
    borderRadius: "10px",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isDark ? "#2d2d2d" : "#f8f9fa",
    padding: "2vw",
    boxSizing: "border-box",
});

const ContentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    gap: "2vh",
};

const TitleStyle = (isDark: boolean): React.CSSProperties => ({
    fontSize: "1.5vw",
    fontWeight: "bold",
    color: isDark ? "#eee" : "#333",
    margin: 0,
    marginBottom: "2vh",
});

const ButtonContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "1.5vh",
    width: "80%",
    alignItems: "stretch",
};

const ButtonStyle = (isDark: boolean, disabled?: boolean): React.CSSProperties => ({
    padding: "12px 24px",
    fontSize: "1vw",
    fontWeight: "bold",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundColor: disabled
        ? isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)"
        : isDark
            ? "rgba(255, 255, 255, 0.15)"
            : "rgba(0, 0, 0, 0.08)",
    color: disabled
        ? isDark
            ? "rgba(255, 255, 255, 0.5)"
            : "rgba(0, 0, 0, 0.5)"
        : isDark
            ? "#eee"
            : "#333",
    transition: "all 0.3s ease",
    border: isDark
        ? `1px solid ${disabled ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)"}`
        : `1px solid ${disabled ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.15)"}`,
});

const FileNameStyle = (isDark: boolean): React.CSSProperties => ({
    fontSize: "0.9vw",
    color: isDark ? "#ccc" : "#666",
    marginTop: "1vh",
    textAlign: "center",
});

