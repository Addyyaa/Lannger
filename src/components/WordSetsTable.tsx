import { useCallback, useMemo, useRef, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import * as dbOperator from "../store/wordStore";
import ConfirmWidget from "./ConfirmWidget";
import { Tooltip } from "antd";
import { List, RowComponentProps } from "react-window";
import type { PointerEvent as ReactPointerEvent } from "react";
import EditWordSets from "./EditWordSets";
import { ManageContext } from "../pages/Manage";

export default function WordSetsTable({
  wordSets,
  loading,
  setLoading

}: {
  wordSets: any[];
  loading: boolean;
  setLoading: (loading: boolean) => void;

}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [popup, setPopup] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const { state, dispatch } = useContext(ManageContext);
  const COLUMN_TEMPLATE = "1fr 2fr 1fr 1fr 1fr 1.5fr";
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
    color: "#fff",
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
    borderRadius: "1.5vw 1.5vw 0 0",
    minHeight: "56px",
  };
  const markHeaderStyle: React.CSSProperties = {
    textAlign: "center",
    fontWeight: "bold",
    paddingLeft: "1vw",
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
    const markPointerIdRef = useRef<number | null>(null);
    const markDragStartXRef = useRef(0);
    const markScrollLeftRef = useRef(0);
    const markElementRef = useRef<HTMLDivElement | null>(null);

    const baseCellStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontSize: "0.9rem",
      padding: "0 1vw",
      color: isDark ? "#f5f5f5" : "#333",
      overflow: "hidden",
    };
    const markCellStyle = useMemo<React.CSSProperties>(() => ({
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: "100%",
      padding: "0.4rem 1vw",
      color: isDark ? "#f5f5f5" : "#333",
      textAlign: "left",
      whiteSpace: "nowrap",
      overflowX: "auto",
      overflowY: "hidden",
      cursor: "grab",
      userSelect: "none",
      WebkitUserSelect: "none",
      MozUserSelect: "none",
      msUserSelect: "none",
      scrollbarWidth: "thin",
    }), [isDark]);
    const handleMarkPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      markPointerIdRef.current = event.pointerId;
      markDragStartXRef.current = event.clientX;
      if (markElementRef.current) {
        markScrollLeftRef.current = markElementRef.current.scrollLeft;
        markElementRef.current.setPointerCapture?.(event.pointerId);
        markElementRef.current.style.cursor = "grabbing";
      }
    };

    const handleMarkPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (markPointerIdRef.current === null || !markElementRef.current) return;
      const deltaX = event.clientX - markDragStartXRef.current;
      markElementRef.current.scrollLeft = markScrollLeftRef.current - deltaX;
    };

    const finalizeMarkDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (markPointerIdRef.current === null || !markElementRef.current) return;
      if (markElementRef.current.hasPointerCapture?.(event.pointerId)) {
        markElementRef.current.releasePointerCapture(event.pointerId);
      }
      markPointerIdRef.current = null;
      markElementRef.current.style.cursor = "grab";
    };

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
      if (!markElementRef.current) return;
      const isHorizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!isHorizontalGesture) return;
      event.preventDefault();
      markElementRef.current.scrollLeft += event.deltaX;
    };
    const actionCellStyle: React.CSSProperties = {
      ...baseCellStyle,
      justifyContent: "center",
      gap: "0.8vw",
    };

    const rowBackground = isDark ? "rgb(41, 40, 40)" : "rgb(243, 240, 240)";

    // 使用虚拟列表渲染，避免在大数据量时一次性渲染所有行导致卡顿
    return (
      <div
        {...ariaAttributes}
        role="row"
        aria-rowindex={index + 2}
        style={{
          ...style,
          width: "100%",
          display: "grid",
          gridTemplateColumns: COLUMN_TEMPLATE,
          alignItems: "stretch",
          boxSizing: "border-box",
          padding: "0 16px",
          height: ROW_HEIGHT,
          background: rowBackground,
          borderBottom: isDark
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <Tooltip
          title={
            <div>
              {currentSet?.name
                ? currentSet.name
                : t("noMark")
              }
            </div>
          }

          placement="right"
          styles={{
            body: {
              backgroundColor: isDark ? "black" : "pink",
              color: isDark ? "white" : "black",
              maxHeight: "30vh",
              width: "100%",
              overflow: "auto",
              scrollbarWidth: "thin",
            },
          }}

        >
          <div style={{ ...baseCellStyle, justifyContent: "center", overflow: "hidden" }}>
            {currentSet?.name ?? t("noName")}
          </div>
        </Tooltip>
        <Tooltip
          title={
            <div>
              {currentSet?.mark
                ? currentSet.mark
                : t("noMark")
              }
            </div>
          }

          placement="right"
          styles={{
            body: {
              backgroundColor: isDark ? "black" : "pink",
              color: isDark ? "white" : "black",
              maxHeight: "30vh",
              width: "100%",
              overflow: "auto",
              scrollbarWidth: "thin",
            },
          }}

        >
          <div
            style={markCellStyle}
            data-testid="word-set-mark"
            ref={markElementRef}
            onPointerDown={handleMarkPointerDown}
            onPointerMove={handleMarkPointerMove}
            onPointerUp={finalizeMarkDrag}
            onPointerCancel={finalizeMarkDrag}
            onPointerLeave={finalizeMarkDrag}
            onWheel={handleWheel}
          >
            {currentSet?.mark ?? t("noMark")}
          </div>
        </Tooltip>
        <div style={baseCellStyle}>{currentSet?.words?.length || 0}</div>
        <Tooltip
          title={
            <div>
              {currentSet?.createdAt
                ? new Date(currentSet.createdAt).toLocaleDateString()
                : t("unknown")
              }
            </div>
          }

          placement="right"
          styles={{
            body: {
              backgroundColor: isDark ? "black" : "pink",
              color: isDark ? "white" : "black",
              maxHeight: "30vh",
              width: "100%",
              overflow: "auto",
              scrollbarWidth: "thin",
            },
          }}

        >
          <div style={baseCellStyle}>
            {currentSet?.createdAt
              ? new Date(currentSet.createdAt).toLocaleDateString()
              : t("unknown")}
          </div>
        </Tooltip>
        <Tooltip
          title={
            <div>
              {currentSet?.updatedAt
                ? new Date(currentSet.updatedAt).toLocaleDateString()
                : t("noUpdate")
              }
            </div>
          }
          placement="right"
          styles={{
            body: {
              backgroundColor: isDark ? "black" : "pink",
              color: isDark ? "white" : "black",
              maxHeight: "30vh",
              width: "100%",
              overflow: "auto",
              scrollbarWidth: "thin",
            },
          }}
        >
          <div style={baseCellStyle}>
            {currentSet?.updatedAt
              ? new Date(currentSet.updatedAt).toLocaleDateString()
              : t("noUpdate")}
          </div>

        </Tooltip>
        <div style={actionCellStyle}>
          <button
            style={{
              ...buttonStyle,
              fontSize: "0.9rem",
            }}
            onClick={() => {
              setEditIndex(index);
              dispatch({ type: "SET_EDIT_WORD_SET", payload: {} });
            }}
          >
            {t("edit")}
          </button>
          <button
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #ff4757 0%, #ff3742 100%)",
              fontSize: "0.9rem",
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
          <div style={stickyThStyle} role="row" data-testid="word-sets-table-header">
            <span role="columnheader" data-testid="word-sets-table-header-name">{t("tableName")}</span>
            <span
              role="columnheader"
              data-testid="word-sets-table-header-mark"
              style={markHeaderStyle}
            >
              {t("tableMark")}
            </span>
            <span role="columnheader" data-testid="word-sets-table-header-word-count">{t("tableWordCount")}</span>
            <span role="columnheader" data-testid="word-sets-table-header-created-at">{t("tableCreatedAt")}</span>
            <span role="columnheader" data-testid="word-sets-table-header-updated-at">{t("tableUpdatedAt")}</span>
            <span role="columnheader" data-testid="word-sets-table-header-actions">{t("tableActions")}</span>
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
      {state.popup === "SET_EDIT_WORD_SET" && (
        <EditWordSets
          setLoading={setLoading}
          outterWordSetList={wordSets}
          index={editIndex as number}
        />
      )}
    </>
  );
}




