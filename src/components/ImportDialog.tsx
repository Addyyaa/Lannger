import { useState, useRef } from "react";
import { useTheme, useOrientation } from "../main";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import CloseButton from "./CloseButton";
import * as dbOperator from "../store/wordStore";
import { Word, WordSet } from "../db";
import { DEFAULT_WORD_SET_ID, DEFAULT_WORD_SET_NAME } from "../db";

interface ImportDialogProps {
    closePopup: () => void;
    onImportComplete?: () => void; // 导入完成后的回调
}

type FileFormat = "json" | "xlsx" | "xls" | "xml";
type Encoding = "utf-8" | "utf-16" | "gbk";

/**
 * 单词批量导入组件
 * 支持多种文件格式（JSON、XLSX、XLS、XML）和编码（UTF-8、UTF-16、GBK）
 */
export default function ImportDialog({ closePopup, onImportComplete }: ImportDialogProps) {
    const { isDark } = useTheme();
    const { isPortrait } = useOrientation();
    const { t } = useTranslation();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>("");
    const [fileFormat, setFileFormat] = useState<FileFormat>("json");
    const [encoding, setEncoding] = useState<Encoding>("utf-8");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 获取文件扩展名对应的格式
    const getFileFormatFromExtension = (filename: string): FileFormat => {
        const ext = filename.split(".").pop()?.toLowerCase();
        if (ext === "json") return "json";
        if (ext === "xlsx") return "xlsx";
        if (ext === "xls") return "xls";
        if (ext === "xml") return "xml";
        return "json"; // 默认
    };

    // 下载JSON模板
    const handleDownloadJsonTemplate = () => {
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

    // 下载Excel模板
    const handleDownloadExcelTemplate = () => {
        const template = [
            {
                假名: "あいうえお",
                汉字: "あいうえお",
                意思: "示例意思",
                例句: "これは例文です。",
                备注: "",
                难度系数: "5",
                所属词集: "Default",
            },
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Words");
        XLSX.writeFile(wb, "word_template.xlsx");
    };

    // 下载XML模板
    const handleDownloadXmlTemplate = () => {
        const template = `<?xml version="1.0" encoding="UTF-8"?>
<words>
    <word>
        <kana>あいうえお</kana>
        <kanji>あいうえお</kanji>
        <meaning>示例意思</meaning>
        <example>これは例文です。</example>
        <mark></mark>
        <difficultyCoefficient>5</difficultyCoefficient>
        <wordSet>Default</wordSet>
    </word>
</words>`;

        const blob = new Blob([template], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "word_template.xml";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 根据格式下载模板
    const handleDownloadTemplate = () => {
        switch (fileFormat) {
            case "json":
                handleDownloadJsonTemplate();
                break;
            case "xlsx":
            case "xls":
                handleDownloadExcelTemplate();
                break;
            case "xml":
                handleDownloadXmlTemplate();
                break;
        }
    };

    // 处理文件选择
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // 文件大小限制：最大 10MB（防止 ReDoS 攻击）
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_FILE_SIZE) {
                alert(t("fileTooLarge") || `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
                event.target.value = ""; // 清空文件选择
                return;
            }

            // 验证文件类型
            const validExtensions = [".json", ".xlsx", ".xls", ".xml"];
            const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
            if (!validExtensions.includes(fileExtension)) {
                alert(t("invalidFileType") || "不支持的文件类型");
                event.target.value = "";
                return;
            }

            setSelectedFile(file);
            setFileName(file.name);
            // 根据文件扩展名自动设置格式
            const detectedFormat = getFileFormatFromExtension(file.name);
            setFileFormat(detectedFormat);
        }
    };

    // 触发文件选择
    const handleSelectFile = () => {
        fileInputRef.current?.click();
    };

    // 读取文件内容（支持不同编码）
    const readFileContent = async (file: File, encoding: Encoding): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result === "string") {
                    resolve(result);
                } else if (result instanceof ArrayBuffer) {
                    // 处理二进制数据
                    if (encoding === "utf-8") {
                        const decoder = new TextDecoder("utf-8");
                        resolve(decoder.decode(result));
                    } else if (encoding === "utf-16") {
                        const decoder = new TextDecoder("utf-16");
                        resolve(decoder.decode(result));
                    } else if (encoding === "gbk") {
                        // GBK编码需要特殊处理，浏览器原生不支持
                        // 这里先尝试使用UTF-8，实际项目中可能需要使用第三方库
                        try {
                            const decoder = new TextDecoder("gbk");
                            resolve(decoder.decode(result));
                        } catch {
                            // 如果浏览器不支持GBK，尝试UTF-8
                            const decoder = new TextDecoder("utf-8");
                            resolve(decoder.decode(result));
                        }
                    } else {
                        resolve(new TextDecoder().decode(result));
                    }
                } else {
                    reject(new Error("无法读取文件内容"));
                }
            };

            reader.onerror = () => reject(new Error("文件读取失败"));

            if (encoding === "utf-8" || encoding === "utf-16") {
                reader.readAsText(file, encoding);
            } else {
                // GBK或其他编码，先读取为ArrayBuffer再解码
                reader.readAsArrayBuffer(file);
            }
        });
    };

    // 解析JSON文件
    const parseJsonFile = async (file: File, encoding: Encoding): Promise<any[]> => {
        const content = await readFileContent(file, encoding);
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
            throw new Error(t("invalidFileFormat") || "文件格式错误：必须是JSON数组");
        }
        return data;
    };

    // 解析Excel文件
    const parseExcelFile = async (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            // 设置超时：30秒（防止 ReDoS 攻击导致长时间挂起）
            const timeoutId = setTimeout(() => {
                reject(new Error("文件解析超时，请检查文件是否损坏或过大"));
            }, 30000);

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    clearTimeout(timeoutId);
                    const data = e.target?.result;
                    if (!data || !(data instanceof ArrayBuffer)) {
                        reject(new Error("文件读取失败：无效的数据格式"));
                        return;
                    }

                    // 使用安全的解析选项，限制解析范围
                    const workbook = XLSX.read(data, {
                        type: "array",
                        cellDates: false, // 禁用日期解析，减少攻击面
                        cellNF: false, // 禁用数字格式，减少攻击面
                        cellStyles: false, // 禁用样式解析，减少攻击面
                        sheetRows: 10000, // 限制最大行数（防止超大文件）
                    });

                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        reject(new Error("Excel文件不包含有效的工作表"));
                        return;
                    }

                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    if (!worksheet) {
                        reject(new Error("无法读取工作表数据"));
                        return;
                    }

                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        defval: "", // 默认值，防止 undefined
                        raw: false, // 不返回原始值，减少攻击面
                    });

                    // 转换Excel列名为标准字段名
                    const wordsData = jsonData.map((row: any) => {
                        // 处理 wordSet：优先使用中文列名，然后是英文列名
                        // 注意：不能使用 || 运算符，因为空字符串 "" 会被当作 falsy
                        let wordSetValue: any = undefined;
                        if (row["所属词集"] !== undefined && row["所属词集"] !== null && row["所属词集"] !== "") {
                            wordSetValue = row["所属词集"];
                        } else if (row["wordSet"] !== undefined && row["wordSet"] !== null && row["wordSet"] !== "") {
                            wordSetValue = row["wordSet"];
                        } else if (row["WordSet"] !== undefined && row["WordSet"] !== null && row["WordSet"] !== "") {
                            wordSetValue = row["WordSet"];
                        }

                        // 确保正确处理空字符串、null、undefined
                        let wordSet: string | undefined = undefined;
                        if (wordSetValue !== null && wordSetValue !== undefined) {
                            const trimmed = String(wordSetValue).trim();
                            if (trimmed !== "" && trimmed.toLowerCase() !== "null" && trimmed.toLowerCase() !== "undefined") {
                                wordSet = trimmed;
                            }
                        }

                        return {
                            kana: row["假名"] || row["kana"] || row["Kana"] || "",
                            kanji: row["汉字"] || row["kanji"] || row["Kanji"] || "",
                            meaning: row["意思"] || row["meaning"] || row["Meaning"] || "",
                            example: row["例句"] || row["example"] || row["Example"] || "",
                            mark: row["备注"] || row["mark"] || row["Mark"] || "",
                            difficultyCoefficient: String(row["难度系数"] || row["difficultyCoefficient"] || row["Difficulty"] || "5"),
                            wordSet: wordSet, // 明确设置为 undefined 如果为空
                        };
                    });
                    resolve(wordsData);
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            };
            reader.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error("文件读取失败"));
            };
            reader.readAsArrayBuffer(file);
        });
    };

    // 解析XML文件
    const parseXmlFile = async (file: File, encoding: Encoding): Promise<any[]> => {
        const content = await readFileContent(file, encoding);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        // 检查解析错误
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
            throw new Error("XML解析失败：" + parserError.textContent);
        }

        const wordElements = xmlDoc.querySelectorAll("word");
        const wordsData: any[] = [];

        wordElements.forEach((wordEl) => {
            const kana = wordEl.querySelector("kana")?.textContent || "";
            const kanji = wordEl.querySelector("kanji")?.textContent || "";
            const meaning = wordEl.querySelector("meaning")?.textContent || "";
            const example = wordEl.querySelector("example")?.textContent || "";
            const mark = wordEl.querySelector("mark")?.textContent || "";
            const difficultyCoefficient = wordEl.querySelector("difficultyCoefficient")?.textContent || "5";
            // 处理 wordSet：如果不存在或为空，则设为 undefined
            const wordSetElement = wordEl.querySelector("wordSet");
            const wordSet = wordSetElement?.textContent && wordSetElement.textContent.trim() !== ""
                ? wordSetElement.textContent.trim()
                : undefined;

            wordsData.push({
                kana,
                kanji,
                meaning,
                example,
                mark,
                difficultyCoefficient,
                wordSet, // 不设置默认值
            });
        });

        return wordsData;
    };

    // 导入单词
    const handleImport = async () => {
        if (!selectedFile) {
            alert(t("pleaseSelectFile") || "请先选择文件");
            return;
        }

        try {
            let wordsData: any[];

            // 根据文件格式解析
            switch (fileFormat) {
                case "json":
                    wordsData = await parseJsonFile(selectedFile, encoding);
                    break;
                case "xlsx":
                case "xls":
                    wordsData = await parseExcelFile(selectedFile);
                    break;
                case "xml":
                    wordsData = await parseXmlFile(selectedFile, encoding);
                    break;
                default:
                    throw new Error(t("invalidFileFormat") || "不支持的文件格式");
            }

            if (!Array.isArray(wordsData) || wordsData.length === 0) {
                alert(t("invalidFileFormat") || "文件格式错误：未找到有效数据");
                return;
            }

            // 获取所有单词集，用于名称到ID的映射
            let wordSets: WordSet[] = [];
            try {
                const fetchedWordSets = await dbOperator.getAllWordSets();
                // 防御性检查：确保 wordSets 是数组
                if (Array.isArray(fetchedWordSets)) {
                    wordSets = fetchedWordSets;
                } else {
                    console.error("getAllWordSets 返回了非数组值:", fetchedWordSets, typeof fetchedWordSets);
                    wordSets = [];
                }
            } catch (error) {
                console.error("获取单词集失败:", error);
                wordSets = [];
            }

            const wordSetMap = new Map<string, number>();
            // 确保 wordSets 是数组后再遍历
            if (Array.isArray(wordSets)) {
                wordSets.forEach((set) => {
                    if (set && set.name && typeof set.id === "number") {
                        wordSetMap.set(set.name, set.id);
                    }
                });
            } else {
                console.error("wordSets 不是数组，无法遍历:", wordSets, typeof wordSets);
            }

            let successCount = 0;
            let failCount = 0;
            const failReasons: Map<string, number> = new Map(); // 失败原因统计

            for (const wordData of wordsData) {
                try {
                    // 验证必填字段
                    const missingFields: string[] = [];
                    if (!wordData.kana || wordData.kana.trim() === "") missingFields.push(t("kana"));
                    if (!wordData.kanji || wordData.kanji.trim() === "") missingFields.push(t("kanji"));
                    if (!wordData.meaning || wordData.meaning.trim() === "") missingFields.push(t("meaning"));
                    if (!wordData.example || wordData.example.trim() === "") missingFields.push(t("example"));

                    if (missingFields.length > 0) {
                        failCount++;
                        const reason = `${t("missingRequiredField")}: ${missingFields.join(", ")}`;
                        failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
                        continue;
                    }

                    // 验证难度系数（必须是1-5之间的整数）
                    const difficultyCoefficient = parseInt(wordData.difficultyCoefficient || "5", 10);
                    if (isNaN(difficultyCoefficient)) {
                        failCount++;
                        const reason = `${t("difficultyNotNumber")}: ${wordData.difficultyCoefficient}`;
                        failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
                        continue;
                    }
                    if (difficultyCoefficient < 1 || difficultyCoefficient > 5) {
                        failCount++;
                        const reason = `${t("difficultyOutOfRange")}: ${difficultyCoefficient}`;
                        failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
                        continue;
                    }

                    // 处理单词集ID，如果不存在则创建
                    let setId: number | undefined = undefined; // 初始化为 undefined，而不是默认词集

                    // 确保 wordSet 字段存在且不为空
                    if (wordData.wordSet && typeof wordData.wordSet === "string" && wordData.wordSet.trim() !== "") {
                        const wordSetName = wordData.wordSet.trim();

                        // 如果词集名称是 "Default"，直接使用默认词集ID
                        if (wordSetName === DEFAULT_WORD_SET_NAME) {
                            setId = DEFAULT_WORD_SET_ID;
                        } else {
                            // 检查词集是否存在
                            if (!wordSetMap.has(wordSetName)) {
                                // 创建新的单词集
                                try {
                                    const newSetId = await dbOperator.createWordSet({
                                        name: wordSetName,
                                        mark: "",
                                    });
                                    wordSetMap.set(wordSetName, newSetId);
                                    // 更新wordSets列表
                                    try {
                                        const updatedWordSets = await dbOperator.getAllWordSets();
                                        // 防御性检查：确保返回的是数组
                                        if (Array.isArray(updatedWordSets)) {
                                            wordSets = updatedWordSets;
                                            // 更新 wordSetMap（重新构建以确保完整性）
                                            updatedWordSets.forEach((set) => {
                                                if (set && set.name && typeof set.id === "number") {
                                                    wordSetMap.set(set.name, set.id);
                                                }
                                            });
                                        } else {
                                            console.error("getAllWordSets 返回了非数组值:", updatedWordSets, typeof updatedWordSets);
                                            // 即使获取失败，wordSetMap 中已经有新创建的词集了，所以可以继续
                                        }
                                    } catch (error) {
                                        console.error("更新单词集列表失败:", error);
                                        // 即使更新失败，wordSetMap 中已经有新创建的词集了，所以可以继续
                                    }
                                } catch (error) {
                                    console.error("创建单词集失败:", error);
                                    // 如果创建失败，跳过该单词（不导入到默认词集）
                                    failCount++;
                                    const reason = `创建单词集失败: ${wordSetName}`;
                                    failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
                                    continue;
                                }
                            }
                            setId = wordSetMap.get(wordSetName);
                            // 如果仍然找不到词集ID，跳过该单词
                            if (setId === undefined) {
                                failCount++;
                                const reason = `找不到单词集: ${wordSetName}`;
                                failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
                                continue;
                            }
                        }
                    } else {
                        // 如果没有指定词集，使用默认词集
                        setId = DEFAULT_WORD_SET_ID;
                    }

                    // 确保 setId 不是 undefined（此时应该已经设置好了）
                    if (setId === undefined) {
                        failCount++;
                        const reason = `无法确定单词集ID`;
                        failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
                        continue;
                    }

                    // 构建单词对象，明确设置 setId（确保是数字类型，不是 undefined）
                    const word: Omit<Word, "id" | "createdAt" | "updatedAt"> = {
                        kana: wordData.kana,
                        kanji: wordData.kanji,
                        meaning: wordData.meaning,
                        example: wordData.example,
                        mark: wordData.mark || "",
                        setId: setId as number, // 明确设置 setId，确保是数字类型
                        review: {
                            times: 0,
                            difficulty: difficultyCoefficient,
                        },
                    };

                    await dbOperator.createWord(word);
                    successCount++;
                } catch (error) {
                    console.error("导入单词失败:", error);
                    failCount++;
                    const reason = `导入错误: ${error instanceof Error ? error.message : String(error)}`;
                    failReasons.set(reason, (failReasons.get(reason) || 0) + 1);
                }
            }

            // 构建结果消息
            let resultMessage = `${t("importComplete") || "导入完成"}：${t("success") || "成功"} ${successCount}，${t("failed") || "失败"} ${failCount}`;

            // 如果有失败，显示详细原因
            if (failCount > 0 && failReasons.size > 0) {
                resultMessage += `\n\n${t("failedDetails") || "失败详情"}：\n`;
                failReasons.forEach((count, reason) => {
                    resultMessage += `- ${reason} (${count}次)\n`;
                });
            }

            alert(resultMessage);
            // 调用导入完成回调，通知父组件刷新数据
            if (onImportComplete) {
                onImportComplete();
            }
            closePopup();
        } catch (error) {
            console.error("导入失败:", error);
            alert(t("importFailed") || "导入失败：" + (error instanceof Error ? error.message : String(error)));
        }
    };

    // 获取文件选择器的accept属性（根据选择的文件格式过滤）
    const getAcceptAttribute = (): string => {
        switch (fileFormat) {
            case "json":
                return ".json";
            case "xlsx":
                return ".xlsx";
            case "xls":
                return ".xls";
            case "xml":
                return ".xml";
            default:
                return ".json";
        }
    };

    return (
        <div data-test-id="div-test-6" style={ImportDialogStyle}>
            <div data-test-id="div-test-5" style={DialogContainerStyle(isDark, isPortrait)}>
                <CloseButton
                    data-test-id="closebutton-test"
                    onClick={closePopup}
                    ariaLabel={t("close")}
                    iconColor={isDark ? "#ffffff" : "#333333"}
                    style={{ position: "absolute", top: isPortrait ? "3vw" : "1vw", right: isPortrait ? "3vw" : "1vw" }}
                />
                <div data-test-id="div-test-4" style={ContentStyle(isPortrait)}>
                    <h2 data-test-id="h2-test" style={TitleStyle(isDark, isPortrait)}>{t("importWords")}</h2>

                    {/* 文件格式选择 */}
                    <div data-test-id="div-test-3" style={SelectContainerStyle(isPortrait)}>
                        <label data-test-id="label-test-1" style={LabelStyle(isDark, isPortrait)}>{t("fileFormat")}:</label>
                        <select
                            data-test-id="select-test-1" style={SelectStyle(isDark, isPortrait)}
                            value={fileFormat}
                            onChange={(e) => setFileFormat(e.target.value as FileFormat)}
                        >
                            <option data-test-id="option-test-6" value="json">{t("json")}</option>
                            <option data-test-id="option-test-5" value="xlsx">{t("xlsx")}</option>
                            <option data-test-id="option-test-4" value="xls">{t("xls")}</option>
                            <option data-test-id="option-test-3" value="xml">{t("xml")}</option>
                        </select>
                    </div>

                    {/* 编码选择 */}
                    <div data-test-id="div-test-2" style={SelectContainerStyle(isPortrait)}>
                        <label data-test-id="label-test" style={LabelStyle(isDark, isPortrait)}>{t("encoding")}:</label>
                        <select
                            data-test-id="select-test" style={SelectStyle(isDark, isPortrait)}
                            value={encoding}
                            onChange={(e) => setEncoding(e.target.value as Encoding)}
                        >
                            <option data-test-id="option-test-2" value="utf-8">{t("utf8")}</option>
                            <option data-test-id="option-test-1" value="utf-16">{t("utf16")}</option>
                            <option data-test-id="option-test" value="gbk">{t("gbk")}</option>
                        </select>
                    </div>

                    <div data-test-id="div-test-1" style={ButtonContainerStyle(isPortrait)}>
                        <button data-test-id="button-test-2" style={ButtonStyle(isDark, false, isPortrait)} onClick={handleDownloadTemplate}>
                            {t("downloadTemplate")}
                        </button>
                        <button data-test-id="button-test-1" style={ButtonStyle(isDark, false, isPortrait)} onClick={handleSelectFile}>
                            {t("selectFile")}
                        </button>
                        <input
                            data-test-id="input-test" ref={fileInputRef}
                            type="file"
                            accept={getAcceptAttribute()}
                            onChange={handleFileSelect}
                            style={{ display: "none" }}
                        />
                        <button
                            data-test-id="button-test" style={ButtonStyle(isDark, !selectedFile, isPortrait)}
                            onClick={handleImport}
                            disabled={!selectedFile}
                        >
                            {t("import")}
                        </button>
                    </div>

                    {fileName && (
                        <div data-test-id="div-test" style={FileNameStyle(isDark, isPortrait)}>
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
    padding: "3vw",
    boxSizing: "border-box",
};

const DialogContainerStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    position: "relative",
    width: isPortrait ? "90%" : "40vw",
    aspectRatio: isPortrait ? undefined : "1.5/1",
    minHeight: isPortrait ? "60vh" : undefined,
    display: "flex",
    borderRadius: isPortrait ? "2vw" : "0.625vw",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isDark ? "#2d2d2d" : "#f8f9fa",
    padding: isPortrait ? "4vw" : "2vw",
    boxSizing: "border-box",
    maxHeight: isPortrait ? "90vh" : "90vh",
    overflow: "auto",
});

const ContentStyle = (isPortrait: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    gap: isPortrait ? "3vw" : "1.5vh",
});

const TitleStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "5vw" : "1.5vw",
    fontWeight: "bold",
    color: isDark ? "#eee" : "#333",
    margin: 0,
    marginBottom: isPortrait ? "2vw" : "1vh",
});

const SelectContainerStyle = (isPortrait: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: isPortrait ? "3vw" : "1vw",
    width: "80%",
    justifyContent: "space-between",
    flexDirection: isPortrait ? "column" : "row",
});

const LabelStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "4vw" : "1vw",
    fontWeight: "500",
    color: isDark ? "#eee" : "#333",
    minWidth: isPortrait ? "100%" : "30%",
    width: isPortrait ? "100%" : "auto",
});

const SelectStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    flex: isPortrait ? undefined : 1,
    width: isPortrait ? "100%" : undefined,
    padding: isPortrait ? "3vw 4vw" : "0.5vw 0.75vw",
    fontSize: isPortrait ? "3.5vw" : "0.9vw",
    borderRadius: isPortrait ? "2vw" : "0.375vw",
    border: isDark
        ? `${isPortrait ? "0.3vw" : "0.06vw"} solid rgba(255, 255, 255, 0.2)`
        : `${isPortrait ? "0.3vw" : "0.06vw"} solid rgba(0, 0, 0, 0.15)`,
    backgroundColor: isDark ? "#3a3a3a" : "#fff",
    color: isDark ? "#eee" : "#333",
    outline: "none",
    cursor: "pointer",
});

const ButtonContainerStyle = (isPortrait: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    gap: isPortrait ? "3vw" : "1.5vh",
    width: "80%",
    alignItems: "stretch",
    marginTop: isPortrait ? "2vw" : "1vh",
});

const ButtonStyle = (isDark: boolean, disabled?: boolean, isPortrait?: boolean): React.CSSProperties => ({
    padding: isPortrait ? "3vw 6vw" : "0.75vw 1.5vw",
    fontSize: isPortrait ? "3.5vw" : "1vw",
    fontWeight: "bold",
    borderRadius: isPortrait ? "2vw" : "0.5vw",
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
        ? `${isPortrait ? "0.3vw" : "0.06vw"} solid ${disabled ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)"}`
        : `${isPortrait ? "0.3vw" : "0.06vw"} solid ${disabled ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.15)"}`,
});

const FileNameStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "3.5vw" : "0.9vw",
    color: isDark ? "#ccc" : "#666",
    marginTop: isPortrait ? "2vw" : "0.5vh",
    textAlign: "center",
});

