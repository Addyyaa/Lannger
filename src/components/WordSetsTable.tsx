import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import * as dbOperator from "../store/wordStore";
import ConfirmWidget from "./ConfirmWidget";
import { Tooltip } from "antd";
import { List, RowComponentProps } from "react-window";

export default function WordSetsTable({
  wordSets,
  loading,
  setLoading,
}: {
  wordSets: any[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [popup, setPopup] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const COLUMN_TEMPLATE = "2fr 1fr 1fr 1.2fr";
  const ROW_HEIGHT = 72;
  const MAX_LIST_HEIGHT = 320;
  const emptyStateStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "6vh 0",
    borderRadius: "0.7vw",
  };

  const buttonStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
    border: "none",
    borderRadius: "0.3vw",
    fontSize: "1vw",
    width: "auto",
    height: "auto",
    minWidth: "1vw",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(0, 180, 255, 0.3)",
  };

  const thStyle: React.CSSProperties = {
    padding: "1vh",
    textAlign: "center",
    fontWeight: "bold",
  };

  const listContainerStyle: React.CSSProperties = {
    width: "100%",
    maxHeight: MAX_LIST_HEIGHT + 56,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: "0.7vw",
    background: isDark ? "#111" : "#fff",
    boxShadow: isDark
      ? "0 4px 20px rgba(0, 0, 0, 0.3)"
      : "0 4px 20px rgba(0, 0, 0, 0.1)",
  };

  const stickyThStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: "center",
    background: isDark ? "rgb(0, 0, 0)" : "#eeeeee",
    color: isDark ? "white" : "rgb(77, 76, 76)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    display: "grid",
    gridTemplateColumns: COLUMN_TEMPLATE,
    alignItems: "center",
    borderRadius: "1.5vw",
    minHeight: "56px",
  };

  async function deleteWordSet(id: number) {
    try {
      await dbOperator.deleteWordSet(id);
    } catch (e) {
      console.error("删除单词集失败:", e);
      alert(t("deleteWordSetFailed"));
    } finally {
      setPopup(false);
      setLoading(true);
    }
  }

  const getWordSet = useCallback(
    (index: number) => wordSets[index],
    [wordSets]
  );

  const listHeight = useMemo(() => {
    return Math.min(MAX_LIST_HEIGHT, wordSets.length * ROW_HEIGHT);
  }, [wordSets.length]);

  const listStyle = useMemo<React.CSSProperties>(
    () => ({
      height: listHeight,
      width: "100%",
      overflowX: "hidden",
      background: isDark ? "#111" : "#fff",
      scrollbarWidth: "none",
    }),
    [isDark, listHeight]
  );

  type VirtualRowExtraProps = {
    getWordSet: (index: number) => (typeof wordSets)[number];
  };

  const VirtualRow = ({
    index,
    style,
    ariaAttributes,
    getWordSet: getSet,
  }: RowComponentProps<VirtualRowExtraProps>) => {
    const currentSet = getSet(index);
    const baseCellStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "0 8px",
      fontSize: "14px",
    };

    const rowBackground = 'rgb(41, 40, 40)'

    // 使用虚拟列表渲染，避免在大数据量时一次性渲染所有行导致卡顿
    return (
      <div
        {...ariaAttributes}
        role="row"
        aria-rowindex={index + 2}
        style={{
          ...style,
          display: "grid",
          gridTemplateColumns: COLUMN_TEMPLATE,
          alignItems: "center",
          boxSizing: "border-box",
          padding: "0 16px",
          height: ROW_HEIGHT,
          background: rowBackground,
          borderBottom: isDark
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div style={baseCellStyle}>{currentSet?.name || t("unnamed")}</div>
        <div style={baseCellStyle}>{currentSet?.words?.length || 0}</div>
        <Tooltip
          title={
            currentSet?.createdAt
              ? new Date(currentSet.createdAt).toLocaleString()
              : t("unknown")
          }
        >
          <div style={baseCellStyle}>
            {currentSet?.createdAt
              ? new Date(currentSet.createdAt).toLocaleDateString()
              : t("unknown")}
          </div>
        </Tooltip>
        <div
          style={{
            ...baseCellStyle,
            gap: "0.4vw",
          }}
        >
          <button
            style={{
              ...buttonStyle,
              fontSize: "0.8vw",
            }}
          >
            {t("edit")}
          </button>
          <button
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #ff4757 0%, #ff3742 100%)",
              fontSize: "0.8vw",
            }}
            onClick={() => {
              setDeleteId(currentSet?.id ?? null);
              setPopup(true);
            }}
            data-testid="delete-word-set-button"
          >
            {t("delete")}
          </button>
        </div>
      </div>
    );
  };


  return (
    <>
      {loading ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
          <p>{t("loading")}</p>
        </div>
      ) : wordSets.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
          <h3 style={{ margin: "0 0 8px 0" }}>{t("noWordSets")}</h3>
          <p>{t("clickToCreateFirst")}</p>
        </div>
      ) : (
        <div style={listContainerStyle} role="table" aria-label={t("wordSetManagement")}>
          <div style={stickyThStyle} role="row">
            <span role="columnheader">{t("tableName")}</span>
            <span role="columnheader">{t("tableWordCount")}</span>
            <span role="columnheader">{t("tableCreatedAt")}</span>
            <span role="columnheader">{t("tableActions")}</span>
          </div>
          <List
            style={listStyle}
            overscanCount={6}
            rowCount={wordSets.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={VirtualRow}
            rowProps={{ getWordSet }}
            aria-label={t("wordSetManagement")}
          />
        </div>
      )}
      {popup && (
        <ConfirmWidget
          title={t("deleteWordSet")}
          message={t("deleteWordSetMessage")}
          onConfirm={async () => {
            if (deleteId !== null) {
              await deleteWordSet(deleteId);
            }
          }}
          onCancel={() => {
            setPopup(false);
          }}
        />
      )}
    </>
  );
}




