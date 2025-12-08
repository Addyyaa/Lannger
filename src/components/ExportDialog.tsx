import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import * as dbOperator from "../store/wordStore";
import { WordSet, DEFAULT_WORD_SET_ID } from "../db";
import CloseButton from "./CloseButton";

interface ExportDialogProps {
  closePopup: () => void;
  onExportComplete?: () => void;
}

/**
 * 数据导出对话框组件
 * 支持选择性导出单词集和学习进度
 */
export default function ExportDialog({
  closePopup,
  onExportComplete,
}: ExportDialogProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWordSetIds, setSelectedWordSetIds] = useState<Set<number>>(
    new Set()
  );
  const [exporting, setExporting] = useState(false);
  const [includeProgress, setIncludeProgress] = useState(false); // 是否包含学习进度

  const wordStore = useWordStore();
  const setUILoading = useUIStore((state) => state.setLoading);

  // 加载单词集列表
  useEffect(() => {
    const loadWordSets = async () => {
      try {
        setLoading(true);
        setUILoading(true);
        await wordStore.loadWordSets();
        const sets = wordStore.wordSets;
        // 排除默认单词集
        const filteredSets = sets.filter(
          (set) => set.id !== DEFAULT_WORD_SET_ID
        );
        setWordSets(filteredSets);
        // 默认全选
        setSelectedWordSetIds(new Set(filteredSets.map((set) => set.id)));
      } catch (error) {
        handleErrorSync(error, { operation: "loadWordSets" });
      } finally {
        setLoading(false);
        setUILoading(false);
      }
    };

    loadWordSets();
  }, []);

  // 全选/反选
  const handleToggleAll = () => {
    if (selectedWordSetIds.size === wordSets.length) {
      setSelectedWordSetIds(new Set());
    } else {
      setSelectedWordSetIds(new Set(wordSets.map((set) => set.id)));
    }
  };

  // 切换单个单词集选择
  const handleToggleWordSet = (wordSetId: number) => {
    const newSelected = new Set(selectedWordSetIds);
    if (newSelected.has(wordSetId)) {
      newSelected.delete(wordSetId);
    } else {
      newSelected.add(wordSetId);
    }
    setSelectedWordSetIds(newSelected);
  };

  // 执行导出
  const handleExport = async () => {
    if (selectedWordSetIds.size === 0) {
      alert(t("pleaseSelectWordSet") || "请至少选择一个单词集");
      return;
    }

    try {
      setExporting(true);
      const selectedIds = Array.from(selectedWordSetIds);
      const data = await dbOperator.backupDatabase({
        selectedWordSetIds: selectedIds,
        includeProgress,
      });

      // 创建下载
      const langggerDBString = JSON.stringify(data, null, 2);
      const blob = new Blob([langggerDBString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const suffix = includeProgress ? "_with_progress" : "";
      a.download = `langggerDB_${timestamp}${suffix}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const progressInfo = includeProgress
        ? t("exportWithProgress") || "（含学习进度）"
        : "";
      alert(
        (t("exportComplete") ||
          `导出完成！已导出 ${selectedIds.length} 个单词集`) + progressInfo
      );
      onExportComplete?.();
      closePopup();
    } catch (error) {
      console.error("导出失败:", error);
      alert(
        (t("exportFailed") || "导出失败") +
          `: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setExporting(false);
    }
  };

  // 样式定义
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    background: isDark
      ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    borderRadius: isPortrait ? "3vw" : "0.75vw",
    padding: isPortrait ? "5vw 4vw" : "2vw",
    minWidth: isPortrait ? "85%" : "30vw",
    maxWidth: isPortrait ? "85%" : "50vw",
    width: isPortrait ? "85%" : "auto",
    maxHeight: isPortrait ? "70vh" : "80vh",
    overflowY: "auto",
    boxShadow: isDark
      ? isPortrait
        ? "0 1.5vw 6vw rgba(0, 0, 0, 0.5)"
        : "0 0.5vw 2vw rgba(0, 0, 0, 0.4)"
      : isPortrait
      ? "0 1.5vw 6vw rgba(0, 0, 0, 0.2)"
      : "0 0.5vw 2vw rgba(0, 0, 0, 0.15)",
    border: isDark
      ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #444`
      : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
    position: "relative",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "4.5vw" : "1.5vw",
    fontWeight: "bold",
    color: isDark ? "#fff" : "#333",
    marginBottom: isPortrait ? "3.5vw" : "1.5vw",
    textAlign: "center",
  };

  const listContainerStyle: React.CSSProperties = {
    maxHeight: isPortrait ? "40vh" : "50vh",
    overflowY: "auto",
    marginBottom: isPortrait ? "3vw" : "1vw",
    padding: isPortrait ? "2vw" : "1vw",
    background: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.02)",
    borderRadius: isPortrait ? "2vw" : "0.5vw",
  };

  const wordSetItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: isPortrait ? "2.5vw" : "0.75vw",
    marginBottom: isPortrait ? "1.5vw" : "0.5vw",
    background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
    borderRadius: isPortrait ? "1.5vw" : "0.4vw",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  const checkboxStyle: React.CSSProperties = {
    width: isPortrait ? "4vw" : "1.2vw",
    height: isPortrait ? "4vw" : "1.2vw",
    marginRight: isPortrait ? "2vw" : "0.75vw",
    cursor: "pointer",
  };

  const wordSetNameStyle: React.CSSProperties = {
    fontSize: isPortrait ? "3.5vw" : "1vw",
    color: isDark ? "#fff" : "#333",
    flex: 1,
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: isPortrait ? "2vw" : "0.75vw",
    marginTop: isPortrait ? "2vw" : "1vw",
  };

  const buttonStyle: React.CSSProperties = {
    flex: 1,
    padding: isPortrait ? "2.5vw 4vw" : "0.75vw 1.5vw",
    fontSize: isPortrait ? "3.5vw" : "1vw",
    border: "none",
    borderRadius: isPortrait ? "1.5vw" : "0.5vw",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.3s ease",
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
    color: "#fff",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    color: isDark ? "#fff" : "#333",
  };

  const allSelected = selectedWordSetIds.size === wordSets.length;

  return (
    <div style={containerStyle}>
      <CloseButton
        onClick={closePopup}
        style={{
          position: "absolute",
          top: isPortrait ? "3.5vw" : "1vw",
          right: isPortrait ? "3.5vw" : "1vw",
          zIndex: 10,
        }}
        iconColor={isDark ? "#fff" : "#333"}
      />
      <h2 style={titleStyle}>{t("exportData") || "导出数据"}</h2>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: isPortrait ? "6vw" : "2.5vw",
            color: isDark ? "#ccc" : "#666",
            fontSize: isPortrait ? "3.5vw" : "1vw",
          }}
        >
          {t("loading") || "加载中..."}
        </div>
      ) : wordSets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: isPortrait ? "6vw" : "2.5vw",
            color: isDark ? "#ccc" : "#666",
            fontSize: isPortrait ? "3.5vw" : "1vw",
          }}
        >
          {t("noWordSets") || "暂无单词集"}
        </div>
      ) : (
        <>
          {/* 全选/反选按钮 */}
          <div style={{ marginBottom: isPortrait ? "2vw" : "1vw" }}>
            <button
              onClick={handleToggleAll}
              style={secondaryButtonStyle}
              type="button"
            >
              {allSelected
                ? t("deselectAll") || "取消全选"
                : t("selectAll") || "全选"}
            </button>
          </div>

          {/* 单词集列表 */}
          <div style={listContainerStyle}>
            {wordSets.map((wordSet) => {
              const isSelected = selectedWordSetIds.has(wordSet.id);
              return (
                <div
                  key={wordSet.id}
                  style={{
                    ...wordSetItemStyle,
                    background: isSelected
                      ? isDark
                        ? "rgba(0, 180, 255, 0.2)"
                        : "rgba(0, 180, 255, 0.1)"
                      : wordSetItemStyle.background,
                    border: isSelected
                      ? `1px solid #00b4ff`
                      : "1px solid transparent",
                  }}
                  onClick={() => handleToggleWordSet(wordSet.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleWordSet(wordSet.id)}
                    style={checkboxStyle}
                  />
                  <span style={wordSetNameStyle}>
                    {wordSet.name || t("unnamed")}
                  </span>
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
            {t("selectedCount") || "已选择"}：{selectedWordSetIds.size} /{" "}
            {wordSets.length}
          </div>

          {/* 导出学习进度选项 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isPortrait ? "2vw" : "0.75vw",
              padding: isPortrait ? "2.5vw" : "0.75vw",
              marginBottom: isPortrait ? "2vw" : "1vw",
              background: isDark
                ? "rgba(0, 180, 255, 0.1)"
                : "rgba(0, 180, 255, 0.05)",
              borderRadius: isPortrait ? "1.5vw" : "0.4vw",
              border: includeProgress
                ? "1px solid #00b4ff"
                : `1px solid ${isDark ? "#444" : "#e0e0e0"}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => setIncludeProgress(!includeProgress)}
          >
            <input
              type="checkbox"
              checked={includeProgress}
              onChange={() => setIncludeProgress(!includeProgress)}
              style={{
                width: isPortrait ? "4vw" : "1.2vw",
                height: isPortrait ? "4vw" : "1.2vw",
                cursor: "pointer",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: isPortrait ? "3.5vw" : "1vw",
                  color: isDark ? "#fff" : "#333",
                  fontWeight: 500,
                }}
              >
                {t("includeProgress") || "包含学习进度"}
              </div>
              <div
                style={{
                  fontSize: isPortrait ? "2.5vw" : "0.8vw",
                  color: isDark ? "#888" : "#999",
                  marginTop: isPortrait ? "0.5vw" : "0.2vw",
                }}
              >
                {t("includeProgressDesc") || "导出单词掌握程度、复习计划等数据"}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={buttonContainerStyle}>
            <button
              onClick={closePopup}
              style={secondaryButtonStyle}
              type="button"
              disabled={exporting}
            >
              {t("cancel") || "取消"}
            </button>
            <button
              onClick={handleExport}
              style={primaryButtonStyle}
              type="button"
              disabled={exporting || selectedWordSetIds.size === 0}
            >
              {exporting
                ? t("exporting") || "导出中..."
                : t("export") || "导出"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
