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

// 导入阶段枚举
type ImportStage =
  | "file-selection"
  | "wordset-selection"
  | "importing"
  | "complete";

// 单词集导入信息
interface WordSetImportInfo {
  name: string;
  wordCount: number;
  exists: boolean;
  existingId?: number;
  conflictResolution?: "overwrite" | "skip" | "rename";
  newName?: string;
}

/**
 * 单词批量导入组件
 * 支持多种文件格式（JSON、XLSX、XLS、XML）和编码（UTF-8、UTF-16、GBK）
 * 支持选择性导入和冲突处理
 */
export default function ImportDialog({
  closePopup,
  onImportComplete,
}: ImportDialogProps) {
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileFormat, setFileFormat] = useState<FileFormat>("json");
  const [encoding, setEncoding] = useState<Encoding>("utf-8");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 新增状态：导入流程管理
  const [importStage, setImportStage] = useState<ImportStage>("file-selection");
  const [parsedWordsData, setParsedWordsData] = useState<any[]>([]);
  const [wordSetImportInfos, setWordSetImportInfos] = useState<
    WordSetImportInfo[]
  >([]);
  const [selectedWordSetNames, setSelectedWordSetNames] = useState<Set<string>>(
    new Set()
  );
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    currentWordSet: "",
  });
  const [importStats, setImportStats] = useState({
    successWordSets: 0,
    successWords: 0,
    skippedWordSets: 0,
    renamedWordSets: 0,
  });

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
        alert(
          t("fileTooLargeWithSize", { size: MAX_FILE_SIZE / 1024 / 1024 }) ||
            `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
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
  const readFileContent = async (
    file: File,
    encoding: Encoding
  ): Promise<string> => {
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
          reject(new Error(t("cannotReadFileContent") || "无法读取文件内容"));
        }
      };

      reader.onerror = () =>
        reject(new Error(t("fileReadFailed") || "文件读取失败"));

      if (encoding === "utf-8" || encoding === "utf-16") {
        reader.readAsText(file, encoding);
      } else {
        // GBK或其他编码，先读取为ArrayBuffer再解码
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // 解析JSON文件
  const parseJsonFile = async (
    file: File,
    encoding: Encoding
  ): Promise<any[]> => {
    const content = await readFileContent(file, encoding);
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error(
        t("invalidFileFormatMustBeJsonArray") || "文件格式错误：必须是JSON数组"
      );
    }
    return data;
  };

  // 解析Excel文件
  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      // 设置超时：30秒（防止 ReDoS 攻击导致长时间挂起）
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            t("fileParseTimeout") || "文件解析超时，请检查文件是否损坏或过大"
          )
        );
      }, 30000);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          clearTimeout(timeoutId);
          const data = e.target?.result;
          if (!data || !(data instanceof ArrayBuffer)) {
            reject(
              new Error(
                t("fileReadFailedInvalidFormat") ||
                  "文件读取失败：无效的数据格式"
              )
            );
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
            reject(
              new Error(t("excelNoValidSheet") || "Excel文件不包含有效的工作表")
            );
            return;
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            reject(new Error(t("cannotReadSheetData") || "无法读取工作表数据"));
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
            if (
              row["所属词集"] !== undefined &&
              row["所属词集"] !== null &&
              row["所属词集"] !== ""
            ) {
              wordSetValue = row["所属词集"];
            } else if (
              row["wordSet"] !== undefined &&
              row["wordSet"] !== null &&
              row["wordSet"] !== ""
            ) {
              wordSetValue = row["wordSet"];
            } else if (
              row["WordSet"] !== undefined &&
              row["WordSet"] !== null &&
              row["WordSet"] !== ""
            ) {
              wordSetValue = row["WordSet"];
            }

            // 确保正确处理空字符串、null、undefined
            let wordSet: string | undefined = undefined;
            if (wordSetValue !== null && wordSetValue !== undefined) {
              const trimmed = String(wordSetValue).trim();
              if (
                trimmed !== "" &&
                trimmed.toLowerCase() !== "null" &&
                trimmed.toLowerCase() !== "undefined"
              ) {
                wordSet = trimmed;
              }
            }

            return {
              kana: row["假名"] || row["kana"] || row["Kana"] || "",
              kanji: row["汉字"] || row["kanji"] || row["Kanji"] || "",
              meaning: row["意思"] || row["meaning"] || row["Meaning"] || "",
              example: row["例句"] || row["example"] || row["Example"] || "",
              mark: row["备注"] || row["mark"] || row["Mark"] || "",
              difficultyCoefficient: String(
                row["难度系数"] ||
                  row["difficultyCoefficient"] ||
                  row["Difficulty"] ||
                  "5"
              ),
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
        reject(new Error(t("fileReadFailed") || "文件读取失败"));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // 解析XML文件
  const parseXmlFile = async (
    file: File,
    encoding: Encoding
  ): Promise<any[]> => {
    const content = await readFileContent(file, encoding);
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");

    // 检查解析错误
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error(
        t("xmlParseFailed", { error: parserError.textContent || "" }) ||
          `XML解析失败：${parserError.textContent || ""}`
      );
    }

    const wordElements = xmlDoc.querySelectorAll("word");
    const wordsData: any[] = [];

    wordElements.forEach((wordEl) => {
      const kana = wordEl.querySelector("kana")?.textContent || "";
      const kanji = wordEl.querySelector("kanji")?.textContent || "";
      const meaning = wordEl.querySelector("meaning")?.textContent || "";
      const example = wordEl.querySelector("example")?.textContent || "";
      const mark = wordEl.querySelector("mark")?.textContent || "";
      const difficultyCoefficient =
        wordEl.querySelector("difficultyCoefficient")?.textContent || "5";
      // 处理 wordSet：如果不存在或为空，则设为 undefined
      const wordSetElement = wordEl.querySelector("wordSet");
      const wordSet =
        wordSetElement?.textContent && wordSetElement.textContent.trim() !== ""
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

  // 解析文件并提取单词集列表（用于选择性导入）
  const parseFileAndExtractWordSets = async (): Promise<void> => {
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
          throw new Error(t("unsupportedFileFormat") || "不支持的文件格式");
      }

      if (!Array.isArray(wordsData) || wordsData.length === 0) {
        alert(t("invalidFileFormatNoData") || "文件格式错误：未找到有效数据");
        return;
      }

      // 保存解析的单词数据
      setParsedWordsData(wordsData);

      // 获取现有单词集，用于冲突检测和 ID 查找
      const existingWordSets = await dbOperator.getAllWordSets();
      const existingWordSetMap = new Map<number, WordSet>();
      existingWordSets.forEach((set) => {
        existingWordSetMap.set(set.id, set);
      });

      // 提取单词集列表（支持 ID 和名称）
      const wordSetMap = new Map<string, number>(); // key: 显示名称, value: 单词数量
      const wordSetIdMap = new Map<string, number | null>(); // key: 显示名称, value: 实际ID（如果是ID导入）或null（如果是名称导入）

      wordsData.forEach((word) => {
        const wordSetValue = word.wordSet;
        let displayName: string;
        let setId: number | null = null;

        if (wordSetValue === undefined || wordSetValue === null) {
          displayName = DEFAULT_WORD_SET_NAME;
        } else {
          let setIdFromValue: number | null = null;
          let isNumericId = false;

          // 尝试将值转换为数字（支持数字类型和数字字符串）
          if (typeof wordSetValue === "number") {
            setIdFromValue = Number(wordSetValue);
            isNumericId = !Number.isNaN(setIdFromValue) && setIdFromValue > 0;
          } else if (
            typeof wordSetValue === "string" &&
            wordSetValue.trim() !== ""
          ) {
            // 字符串类型：先尝试转换为数字
            const trimmedValue = wordSetValue.trim();
            const numericValue = Number(trimmedValue);
            // 如果字符串可以完全转换为数字（不是 "3abc" 这样的混合字符串）
            if (
              !Number.isNaN(numericValue) &&
              numericValue > 0 &&
              String(numericValue) === trimmedValue
            ) {
              setIdFromValue = numericValue;
              isNumericId = true;
            }
          }

          // 如果是数字 ID，先检查数据库中是否存在
          if (isNumericId && setIdFromValue !== null) {
            const existingSet = existingWordSetMap.get(setIdFromValue);
            if (existingSet) {
              // ID 存在，使用该单词集的名称作为显示名称，并记录 ID
              displayName = existingSet.name;
              setId = setIdFromValue;
            } else {
              // ID 不存在，将数字转换为字符串作为名称
              displayName = String(setIdFromValue);
            }
          } else {
            // 不是数字或数字 ID 不存在，作为名称处理
            displayName =
              typeof wordSetValue === "string"
                ? wordSetValue.trim() || DEFAULT_WORD_SET_NAME
                : String(wordSetValue) || DEFAULT_WORD_SET_NAME;
          }
        }

        wordSetMap.set(displayName, (wordSetMap.get(displayName) || 0) + 1);
        if (setId !== null) {
          wordSetIdMap.set(displayName, setId);
        }
      });

      // 构建单词集导入信息
      const importInfos: WordSetImportInfo[] = Array.from(
        wordSetMap.entries()
      ).map(([name, count]) => {
        const setIdFromMap = wordSetIdMap.get(name);
        let existing: WordSet | undefined;
        let existingId: number | undefined;

        if (setIdFromMap !== null && setIdFromMap !== undefined) {
          // 这是通过 ID 导入的，直接使用该 ID
          existing = existingWordSetMap.get(setIdFromMap);
          existingId = setIdFromMap;
        } else {
          // 这是通过名称导入的，查找同名的单词集
          existing = existingWordSets.find((set) => set.name === name);
          existingId = existing?.id;
        }

        // 如果是通过 ID 匹配的，直接使用该 ID，不触发冲突处理
        // 如果是通过名称匹配的，才需要冲突处理
        const isIdMatched = setIdFromMap !== null && setIdFromMap !== undefined;

        return {
          name,
          wordCount: count,
          exists: existing !== undefined,
          existingId,
          // 通过 ID 匹配时，使用 "overwrite" 策略（直接使用已有 ID）
          // 通过名称匹配时，默认使用 "rename" 策略
          conflictResolution: existing
            ? isIdMatched
              ? "overwrite"
              : "rename"
            : undefined,
        };
      });

      setWordSetImportInfos(importInfos);
      // 默认全选
      setSelectedWordSetNames(new Set(importInfos.map((info) => info.name)));
      // 进入单词集选择阶段
      setImportStage("wordset-selection");
    } catch (error) {
      console.error("解析文件失败:", error);
      alert(
        (t("parseFileFailed") || "解析文件失败") +
          `: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // 导入单词（支持选择性导入和冲突处理）
  const handleImport = async () => {
    if (importStage === "file-selection") {
      // 如果还在文件选择阶段，先解析文件
      await parseFileAndExtractWordSets();
      return;
    }

    if (selectedWordSetNames.size === 0) {
      alert(t("pleaseSelectWordSet") || "请至少选择一个单词集");
      return;
    }

    try {
      // 导入前自动备份
      const backupResult = await createBackupBeforeImport();
      if (!backupResult.success) {
        alert(
          (t("backupFailed") || "备份失败") +
            `: ${backupResult.error || "未知错误"}`
        );
        return;
      }

      // 进入导入阶段
      setImportStage("importing");

      // 获取现有单词集，用于 ID 查找和冲突处理
      const allExistingWordSets = await dbOperator.getAllWordSets();
      const existingWordSetMapForImport = new Map<number, WordSet>();
      allExistingWordSets.forEach((set) => {
        existingWordSetMapForImport.set(set.id, set);
      });

      // 过滤选中的单词集数据（需要重新计算显示名称以匹配选中的单词集）
      const selectedWords = parsedWordsData.filter((word) => {
        const wordSetValue = word.wordSet;
        let displayName: string;

        if (wordSetValue === undefined || wordSetValue === null) {
          displayName = DEFAULT_WORD_SET_NAME;
        } else {
          let setIdFromValue: number | null = null;
          let isNumericId = false;

          // 尝试将值转换为数字（支持数字类型和数字字符串）
          if (typeof wordSetValue === "number") {
            setIdFromValue = Number(wordSetValue);
            isNumericId = !Number.isNaN(setIdFromValue) && setIdFromValue > 0;
          } else if (
            typeof wordSetValue === "string" &&
            wordSetValue.trim() !== ""
          ) {
            // 字符串类型：先尝试转换为数字
            const trimmedValue = wordSetValue.trim();
            const numericValue = Number(trimmedValue);
            // 如果字符串可以完全转换为数字（不是 "3abc" 这样的混合字符串）
            if (
              !Number.isNaN(numericValue) &&
              numericValue > 0 &&
              String(numericValue) === trimmedValue
            ) {
              setIdFromValue = numericValue;
              isNumericId = true;
            }
          }

          // 如果是数字 ID，先检查数据库中是否存在
          if (isNumericId && setIdFromValue !== null) {
            const existingSet = existingWordSetMapForImport.get(setIdFromValue);
            if (existingSet) {
              displayName = existingSet.name;
            } else {
              displayName = String(setIdFromValue);
            }
          } else {
            // 不是数字或数字 ID 不存在，作为名称处理
            displayName =
              typeof wordSetValue === "string"
                ? wordSetValue.trim() || DEFAULT_WORD_SET_NAME
                : String(wordSetValue) || DEFAULT_WORD_SET_NAME;
          }
        }

        return selectedWordSetNames.has(displayName);
      });

      // 建立单词集名称到ID的映射（包含现有单词集）
      const wordSetMap = new Map<string, number>();
      allExistingWordSets.forEach((set) => {
        wordSetMap.set(set.name, set.id);
      });
      // 添加默认单词集
      wordSetMap.set(DEFAULT_WORD_SET_NAME, DEFAULT_WORD_SET_ID);

      // 统计信息
      let successWordSets = 0;
      let successWords = 0;
      let skippedWordSets = 0;
      let renamedWordSets = 0;

      // 按单词集分组处理（支持 ID 和名称）
      const wordsByWordSet = new Map<string, any[]>();
      const wordSetIdMap = new Map<string, number | null>(); // key: 显示名称, value: 实际ID或null

      selectedWords.forEach((word) => {
        const wordSetValue = word.wordSet;
        let displayName: string;
        let setId: number | null = null;

        if (wordSetValue === undefined || wordSetValue === null) {
          displayName = DEFAULT_WORD_SET_NAME;
        } else {
          let setIdFromValue: number | null = null;
          let isNumericId = false;

          // 尝试将值转换为数字（支持数字类型和数字字符串）
          if (typeof wordSetValue === "number") {
            setIdFromValue = Number(wordSetValue);
            isNumericId = !Number.isNaN(setIdFromValue) && setIdFromValue > 0;
          } else if (
            typeof wordSetValue === "string" &&
            wordSetValue.trim() !== ""
          ) {
            // 字符串类型：先尝试转换为数字
            const trimmedValue = wordSetValue.trim();
            const numericValue = Number(trimmedValue);
            // 如果字符串可以完全转换为数字（不是 "3abc" 这样的混合字符串）
            if (
              !Number.isNaN(numericValue) &&
              numericValue > 0 &&
              String(numericValue) === trimmedValue
            ) {
              setIdFromValue = numericValue;
              isNumericId = true;
            }
          }

          // 如果是数字 ID，先检查数据库中是否存在
          if (isNumericId && setIdFromValue !== null) {
            const existingSet = existingWordSetMapForImport.get(setIdFromValue);
            if (existingSet) {
              // ID 存在，使用该单词集的名称作为显示名称，并记录 ID
              displayName = existingSet.name;
              setId = setIdFromValue;
            } else {
              // ID 不存在，将数字转换为字符串作为名称
              displayName = String(setIdFromValue);
            }
          } else {
            // 不是数字或数字 ID 不存在，作为名称处理
            displayName =
              typeof wordSetValue === "string"
                ? wordSetValue.trim() || DEFAULT_WORD_SET_NAME
                : String(wordSetValue) || DEFAULT_WORD_SET_NAME;
          }
        }

        if (!wordsByWordSet.has(displayName)) {
          wordsByWordSet.set(displayName, []);
        }
        wordsByWordSet.get(displayName)!.push(word);

        if (setId !== null) {
          wordSetIdMap.set(displayName, setId);
        }
      });

      const totalWordSets = wordsByWordSet.size;
      let processedWordSets = 0;

      // 逐个单词集导入
      for (const [wordSetName, words] of wordsByWordSet.entries()) {
        setImportProgress({
          current: processedWordSets,
          total: totalWordSets,
          currentWordSet: wordSetName,
        });

        const importInfo = wordSetImportInfos.find(
          (info) => info.name === wordSetName
        );
        if (!importInfo) continue;

        // 处理冲突
        let finalWordSetName = wordSetName;
        let finalWordSetId: number | undefined = undefined;

        // 首先检查是否是通过 ID 导入的
        const setIdFromMap = wordSetIdMap.get(wordSetName);
        const isIdMatched = setIdFromMap !== null && setIdFromMap !== undefined;

        if (importInfo.exists) {
          // 如果是通过 ID 匹配的，直接使用该 ID，不进入冲突处理流程
          if (isIdMatched && setIdFromMap !== null) {
            finalWordSetId = setIdFromMap;
          } else {
            // 通过名称匹配的，才需要冲突处理
            const resolution = importInfo.conflictResolution || "rename";
            if (resolution === "skip") {
              skippedWordSets++;
              processedWordSets++;
              continue;
            } else if (resolution === "overwrite") {
              finalWordSetId = importInfo.existingId;
              // 删除现有单词集中的所有单词
              if (finalWordSetId !== undefined) {
                const existingWords = await dbOperator.getWordsByWordSet(
                  finalWordSetId
                );
                for (const word of existingWords) {
                  if (word.id !== undefined) {
                    await dbOperator.deleteWord(word.id);
                  }
                }
              }
            } else if (resolution === "rename") {
              // 生成新名称
              let newName = wordSetName;
              let counter = 1;
              while (wordSetMap.has(newName)) {
                newName = `${wordSetName}_${counter}`;
                counter++;
              }
              finalWordSetName = newName;
              renamedWordSets++;
            }
          }
        }

        // 创建或获取单词集ID
        if (finalWordSetId === undefined) {
          // 如果还没有设置 ID，检查是否是通过 ID 导入的
          // 注意：如果之前通过 ID 匹配到了，finalWordSetId 应该已经被设置
          // 这里处理的是：单词集不存在，但原始数据中有 ID 的情况（应该作为名称处理）
          if (finalWordSetName === DEFAULT_WORD_SET_NAME) {
            finalWordSetId = DEFAULT_WORD_SET_ID;
          } else {
            // 通过名称查找或创建
            const existingId = wordSetMap.get(finalWordSetName);
            if (existingId !== undefined) {
              finalWordSetId = existingId;
            } else {
              finalWordSetId = await dbOperator.createWordSet({
                name: finalWordSetName,
                mark: "",
              });
              wordSetMap.set(finalWordSetName, finalWordSetId);
            }
          }
        }

        // 导入该单词集的所有单词
        let wordSuccessCount = 0;
        for (const wordData of words) {
          try {
            // 验证必填字段
            if (
              !wordData.kana ||
              wordData.kana.trim() === "" ||
              !wordData.meaning ||
              wordData.meaning.trim() === ""
            ) {
              continue;
            }

            // 验证难度系数
            const difficultyCoefficient = parseInt(
              wordData.difficultyCoefficient || "5",
              10
            );
            if (
              isNaN(difficultyCoefficient) ||
              difficultyCoefficient < 1 ||
              difficultyCoefficient > 5
            ) {
              continue;
            }

            // 创建单词
            const word: Omit<Word, "id" | "createdAt" | "updatedAt"> = {
              kana: wordData.kana,
              kanji: wordData.kanji || "",
              meaning: wordData.meaning,
              example: wordData.example || "",
              mark: wordData.mark || "",
              setId: finalWordSetId,
              review: {
                times: 0,
                difficulty: difficultyCoefficient,
              },
            };

            await dbOperator.createWord(word);
            wordSuccessCount++;
            successWords++;
          } catch (error) {
            console.error("导入单词失败:", error);
          }
        }

        if (wordSuccessCount > 0) {
          successWordSets++;
        }

        processedWordSets++;
      }

      // 更新统计信息
      setImportStats({
        successWordSets,
        successWords,
        skippedWordSets,
        renamedWordSets,
      });

      setImportStage("complete");
    } catch (error) {
      console.error("导入失败:", error);
      alert(
        (t("importFailed") || "导入失败") +
          `: ${error instanceof Error ? error.message : String(error)}`
      );
      setImportStage("wordset-selection"); // 回到选择阶段
    }
  };

  // 创建导入前备份
  const createBackupBeforeImport = async (): Promise<{
    success: boolean;
    error?: string;
    backupPath?: string;
  }> => {
    try {
      const data = await dbOperator.backupDatabase();
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const backupFileName = `backup_before_import_${timestamp}.json`;
      const langggerDBString = JSON.stringify(data, null, 2);
      const blob = new Blob([langggerDBString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupFileName;
      a.click();
      URL.revokeObjectURL(url);

      return {
        success: true,
        backupPath: backupFileName,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "备份失败：未知错误",
      };
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
      <div
        data-test-id="div-test-5"
        style={DialogContainerStyle(isDark, isPortrait)}
      >
        <CloseButton
          data-test-id="closebutton-test"
          onClick={closePopup}
          ariaLabel={t("close")}
          iconColor={isDark ? "#ffffff" : "#333333"}
          style={{
            position: "absolute",
            top: isPortrait ? "3vw" : "1vw",
            right: isPortrait ? "3vw" : "1vw",
          }}
        />
        <div data-test-id="div-test-4" style={ContentStyle(isPortrait)}>
          <h2 data-test-id="h2-test" style={TitleStyle(isDark, isPortrait)}>
            {t("importWords")}
          </h2>

          {/* 文件格式选择 */}
          <div
            data-test-id="div-test-3"
            style={SelectContainerStyle(isPortrait)}
          >
            <label
              data-test-id="label-test-1"
              style={LabelStyle(isDark, isPortrait)}
            >
              {t("fileFormat")}:
            </label>
            <select
              data-test-id="select-test-1"
              style={SelectStyle(isDark, isPortrait)}
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value as FileFormat)}
            >
              <option data-test-id="option-test-6" value="json">
                {t("json")}
              </option>
              <option data-test-id="option-test-5" value="xlsx">
                {t("xlsx")}
              </option>
              <option data-test-id="option-test-4" value="xls">
                {t("xls")}
              </option>
              <option data-test-id="option-test-3" value="xml">
                {t("xml")}
              </option>
            </select>
          </div>

          {/* 编码选择 */}
          <div
            data-test-id="div-test-2"
            style={SelectContainerStyle(isPortrait)}
          >
            <label
              data-test-id="label-test"
              style={LabelStyle(isDark, isPortrait)}
            >
              {t("encoding")}:
            </label>
            <select
              data-test-id="select-test"
              style={SelectStyle(isDark, isPortrait)}
              value={encoding}
              onChange={(e) => setEncoding(e.target.value as Encoding)}
            >
              <option data-test-id="option-test-2" value="utf-8">
                {t("utf8")}
              </option>
              <option data-test-id="option-test-1" value="utf-16">
                {t("utf16")}
              </option>
              <option data-test-id="option-test" value="gbk">
                {t("gbk")}
              </option>
            </select>
          </div>

          <div
            data-test-id="div-test-1"
            style={ButtonContainerStyle(isPortrait)}
          >
            <button
              data-test-id="button-test-2"
              style={ButtonStyle(isDark, false, isPortrait)}
              onClick={handleDownloadTemplate}
            >
              {t("downloadTemplate")}
            </button>
            <button
              data-test-id="button-test-1"
              style={ButtonStyle(isDark, false, isPortrait)}
              onClick={handleSelectFile}
            >
              {t("selectFile")}
            </button>
            <input
              data-test-id="input-test"
              ref={fileInputRef}
              type="file"
              accept={getAcceptAttribute()}
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button
              data-test-id="button-test"
              style={ButtonStyle(isDark, !selectedFile, isPortrait)}
              onClick={handleImport}
              disabled={!selectedFile || importStage !== "file-selection"}
            >
              {importStage === "file-selection"
                ? t("next") || "下一步"
                : t("import") || "导入"}
            </button>
          </div>

          {fileName && importStage === "file-selection" && (
            <div
              data-test-id="div-test"
              style={FileNameStyle(isDark, isPortrait)}
            >
              {t("selectedFile")}: {fileName}
            </div>
          )}

          {/* 单词集选择界面 */}
          {importStage === "wordset-selection" && (
            <div style={{ marginTop: isPortrait ? "3vw" : "1vw" }}>
              <h3
                style={{
                  fontSize: isPortrait ? "4vw" : "1.2vw",
                  color: isDark ? "#fff" : "#333",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                }}
              >
                {t("selectWordSetsToImport") || "选择要导入的单词集"}
              </h3>

              {/* 全选/反选 */}
              <button
                onClick={() => {
                  if (selectedWordSetNames.size === wordSetImportInfos.length) {
                    setSelectedWordSetNames(new Set());
                  } else {
                    setSelectedWordSetNames(
                      new Set(wordSetImportInfos.map((info) => info.name))
                    );
                  }
                }}
                style={{
                  ...ButtonStyle(isDark, false, isPortrait),
                  marginBottom: isPortrait ? "2vw" : "0.75vw",
                  width: "100%",
                }}
              >
                {selectedWordSetNames.size === wordSetImportInfos.length
                  ? t("deselectAll") || "取消全选"
                  : t("selectAll") || "全选"}
              </button>

              {/* 单词集列表 */}
              <div
                style={{
                  maxHeight: isPortrait ? "40vh" : "50vh",
                  overflowY: "auto",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                }}
              >
                {wordSetImportInfos.map((info) => {
                  const isSelected = selectedWordSetNames.has(info.name);
                  return (
                    <div
                      key={info.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: isPortrait ? "2.5vw" : "0.75vw",
                        marginBottom: isPortrait ? "1.5vw" : "0.5vw",
                        background: isSelected
                          ? isDark
                            ? "rgba(0, 180, 255, 0.2)"
                            : "rgba(0, 180, 255, 0.1)"
                          : isDark
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.02)",
                        borderRadius: isPortrait ? "1.5vw" : "0.4vw",
                        cursor: "pointer",
                        border: isSelected
                          ? "1px solid #00b4ff"
                          : "1px solid transparent",
                      }}
                      onClick={() => {
                        const newSelected = new Set(selectedWordSetNames);
                        if (newSelected.has(info.name)) {
                          newSelected.delete(info.name);
                        } else {
                          newSelected.add(info.name);
                        }
                        setSelectedWordSetNames(newSelected);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const newSelected = new Set(selectedWordSetNames);
                          if (newSelected.has(info.name)) {
                            newSelected.delete(info.name);
                          } else {
                            newSelected.add(info.name);
                          }
                          setSelectedWordSetNames(newSelected);
                        }}
                        style={{
                          width: isPortrait ? "4vw" : "1.2vw",
                          height: isPortrait ? "4vw" : "1.2vw",
                          marginRight: isPortrait ? "2vw" : "0.75vw",
                          cursor: "pointer",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: isPortrait ? "3.5vw" : "1vw",
                            color: isDark ? "#fff" : "#333",
                            fontWeight: "500",
                          }}
                        >
                          {info.name}
                        </div>
                        <div
                          style={{
                            fontSize: isPortrait ? "3vw" : "0.85vw",
                            color: isDark ? "#aaa" : "#666",
                            marginTop: isPortrait ? "0.5vw" : "0.2vw",
                          }}
                        >
                          {t("wordCount") || "单词数量"}: {info.wordCount}
                          {info.exists && (
                            <span
                              style={{
                                color: "#ff9800",
                                marginLeft: isPortrait ? "1vw" : "0.5vw",
                              }}
                            >
                              ({t("exists") || "已存在"})
                            </span>
                          )}
                        </div>
                        {info.exists && (
                          <select
                            value={info.conflictResolution || "rename"}
                            onChange={(e) => {
                              const newInfos = wordSetImportInfos.map((i) =>
                                i.name === info.name
                                  ? {
                                      ...i,
                                      conflictResolution: e.target.value as
                                        | "overwrite"
                                        | "skip"
                                        | "rename",
                                    }
                                  : i
                              );
                              setWordSetImportInfos(newInfos);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginTop: isPortrait ? "1vw" : "0.3vw",
                              fontSize: isPortrait ? "3vw" : "0.85vw",
                              padding: isPortrait ? "1vw" : "0.3vw",
                              borderRadius: isPortrait ? "1vw" : "0.3vw",
                              border: `1px solid ${isDark ? "#555" : "#ccc"}`,
                              background: isDark ? "#333" : "#fff",
                              color: isDark ? "#fff" : "#333",
                              cursor: "pointer",
                            }}
                          >
                            <option value="rename">
                              {t("rename") || "重命名"}
                            </option>
                            <option value="overwrite">
                              {t("overwrite") || "覆盖"}
                            </option>
                            <option value="skip">{t("skip") || "跳过"}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 统计信息 */}
              <div
                style={{
                  fontSize: isPortrait ? "3vw" : "0.9vw",
                  color: isDark ? "#aaa" : "#666",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                  textAlign: "center",
                }}
              >
                {t("selectedCount") || "已选择"}：{selectedWordSetNames.size} /{" "}
                {wordSetImportInfos.length}
              </div>

              {/* 操作按钮 */}
              <div style={ButtonContainerStyle(isPortrait)}>
                <button
                  onClick={() => {
                    setImportStage("file-selection");
                    setSelectedWordSetNames(new Set());
                    setWordSetImportInfos([]);
                  }}
                  style={ButtonStyle(isDark, false, isPortrait)}
                >
                  {t("back") || "返回"}
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedWordSetNames.size === 0}
                  style={ButtonStyle(
                    isDark,
                    selectedWordSetNames.size === 0,
                    isPortrait
                  )}
                >
                  {t("startImport") || "开始导入"}
                </button>
              </div>
            </div>
          )}

          {/* 导入进度界面 */}
          {importStage === "importing" && (
            <div style={{ marginTop: isPortrait ? "3vw" : "1vw" }}>
              <h3
                style={{
                  fontSize: isPortrait ? "4vw" : "1.2vw",
                  color: isDark ? "#fff" : "#333",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                  textAlign: "center",
                }}
              >
                {t("importing") || "正在导入..."}
              </h3>
              <div
                style={{
                  fontSize: isPortrait ? "3.5vw" : "1vw",
                  color: isDark ? "#aaa" : "#666",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                  textAlign: "center",
                }}
              >
                {t("currentWordSet") || "当前单词集"}:{" "}
                {importProgress.currentWordSet}
              </div>
              <div
                style={{
                  width: "100%",
                  height: isPortrait ? "2vw" : "0.5vw",
                  background: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                  borderRadius: isPortrait ? "1vw" : "0.25vw",
                  overflow: "hidden",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                }}
              >
                <div
                  style={{
                    width: `${
                      importProgress.total > 0
                        ? (importProgress.current / importProgress.total) * 100
                        : 0
                    }%`,
                    height: "100%",
                    background:
                      "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: isPortrait ? "3vw" : "0.9vw",
                  color: isDark ? "#aaa" : "#666",
                  textAlign: "center",
                }}
              >
                {importProgress.current} / {importProgress.total}
              </div>
            </div>
          )}

          {/* 完成界面 */}
          {importStage === "complete" && (
            <div style={{ marginTop: isPortrait ? "3vw" : "1vw" }}>
              <h3
                style={{
                  fontSize: isPortrait ? "4vw" : "1.2vw",
                  color: isDark ? "#fff" : "#333",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                  textAlign: "center",
                }}
              >
                {t("importComplete") || "导入完成"}
              </h3>
              <div
                style={{
                  fontSize: isPortrait ? "3.5vw" : "1vw",
                  color: isDark ? "#aaa" : "#666",
                  marginBottom: isPortrait ? "2vw" : "1vw",
                }}
              >
                <div>
                  {t("successWordSets") || "成功导入单词集"}:{" "}
                  {importStats.successWordSets}
                </div>
                <div>
                  {t("successWords") || "成功导入单词"}:{" "}
                  {importStats.successWords}
                </div>
                {importStats.skippedWordSets > 0 && (
                  <div>
                    {t("skippedWordSets") || "跳过的单词集"}:{" "}
                    {importStats.skippedWordSets}
                  </div>
                )}
                {importStats.renamedWordSets > 0 && (
                  <div>
                    {t("renamedWordSets") || "重命名的单词集"}:{" "}
                    {importStats.renamedWordSets}
                  </div>
                )}
              </div>
              <div style={ButtonContainerStyle(isPortrait)}>
                <button
                  onClick={() => {
                    onImportComplete?.();
                    closePopup();
                  }}
                  style={ButtonStyle(isDark, false, isPortrait)}
                >
                  {t("close") || "关闭"}
                </button>
              </div>
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

const DialogContainerStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
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

const TitleStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
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

const LabelStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  fontSize: isPortrait ? "4vw" : "1vw",
  fontWeight: "500",
  color: isDark ? "#eee" : "#333",
  minWidth: isPortrait ? "100%" : "30%",
  width: isPortrait ? "100%" : "auto",
});

const SelectStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
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

const ButtonStyle = (
  isDark: boolean,
  disabled?: boolean,
  isPortrait?: boolean
): React.CSSProperties => ({
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
    ? `${isPortrait ? "0.3vw" : "0.06vw"} solid ${
        disabled ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)"
      }`
    : `${isPortrait ? "0.3vw" : "0.06vw"} solid ${
        disabled ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.15)"
      }`,
});

const FileNameStyle = (
  isDark: boolean,
  isPortrait: boolean
): React.CSSProperties => ({
  fontSize: isPortrait ? "3.5vw" : "0.9vw",
  color: isDark ? "#ccc" : "#666",
  marginTop: isPortrait ? "2vw" : "0.5vh",
  textAlign: "center",
});
