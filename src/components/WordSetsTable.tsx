import { useCallback, useMemo, useRef, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import * as dbOperator from "../store/wordStore";
import ConfirmWidget from "./ConfirmWidget";
import { Tooltip } from "antd";
import { List, RowComponentProps } from "react-window";
import type { PointerEvent as ReactPointerEvent } from "react";
import EditWordSets from "./EditWordSets";
import { ManageContext } from "../pages/Manage";
import { DEFAULT_WORD_SET_ID } from "../db";
import { Link } from "react-router-dom";

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
  const { isPortrait } = useOrientation();
  const [popup, setPopup] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const { state, dispatch } = useContext(ManageContext);
  const COLUMN_TEMPLATE = isPortrait ? "2fr 3fr 1.5fr 1.5fr 1.5fr 2.5fr" : "1fr 2fr 1fr 1fr 1fr 1.5fr";
  const ROW_HEIGHT = isPortrait ? 90 : 72;
  const MAX_LIST_HEIGHT = isPortrait ? 400 : 320;
  const emptyStateStyle: React.CSSProperties = {
    textAlign: "center",
    padding: isPortrait ? "8vh 0" : "6vh 0",
    borderRadius: isPortrait ? "2vw" : "0.7vw",
    fontSize: isPortrait ? "3.5vw" : "1vw",
  };

  const buttonStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
    border: "none",
    borderRadius: isPortrait ? "1.5vw" : "0.3vw",
    fontSize: isPortrait ? "3vw" : "1vw",
    width: "auto",
    height: "auto",
    minWidth: isPortrait ? "12vw" : "1vw",
    padding: isPortrait ? "2vw 3vw" : "0.5vw 0.8vw",
    color: "#fff",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)",
  };

  const thStyle: React.CSSProperties = {
    padding: isPortrait ? "2vw 1vw" : "1vh",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: isPortrait ? "3vw" : "0.9rem",
  };

  const listContainerStyle: React.CSSProperties = {
    width: "100%",
    maxHeight: MAX_LIST_HEIGHT + (isPortrait ? 70 : 56),
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: isPortrait ? "2vw" : "0.7vw",
    background: isDark ? "#111" : "#fff",
    boxShadow: isDark
      ? isPortrait ? "0 1vw 5vw rgba(0, 0, 0, 0.3)" : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.3)"
      : isPortrait ? "0 1vw 5vw rgba(0, 0, 0, 0.1)" : "0 0.25vw 1.25vw rgba(0, 0, 0, 0.1)",
    border: isDark ? `${isPortrait ? "0.25vw" : "0.06vw"} solid #444` : `${isPortrait ? "0.25vw" : "0.06vw"} solid #e0e0e0`,
  };

  const stickyThStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: "center",
    background: isDark ? "rgb(0, 0, 0)" : "#eeeeee",
    color: isDark ? "white" : "rgb(77, 76, 76)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 0.125vw 0.25vw rgba(0, 0, 0, 0.1)",
    display: "grid",
    gridTemplateColumns: COLUMN_TEMPLATE,
    alignItems: "center",
    borderRadius: isPortrait ? "2vw 2vw 0 0" : "1.5vw 1.5vw 0 0",
    minHeight: isPortrait ? "70px" : "56px",
  };
  const markHeaderStyle: React.CSSProperties = {
    textAlign: "center",
    fontWeight: "bold",
    paddingLeft: isPortrait ? "2vw" : "1vw",
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
      fontSize: isPortrait ? "3vw" : "0.9rem",
      padding: isPortrait ? "0 2vw" : "0 1vw",
      color: isDark ? "#f5f5f5" : "#333",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      width: "100%",
    };
    const markCellStyle = useMemo<React.CSSProperties>(() => ({
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: "100%",
      padding: isPortrait ? "1vw 2vw" : "0.4rem 1vw",
      color: isDark ? "#f5f5f5" : "#333",
      textAlign: "left",
      whiteSpace: "nowrap",
      overflowX: isPortrait ? "hidden" : "auto",
      overflowY: "hidden",
      textOverflow: isPortrait ? "ellipsis" : "clip",
      cursor: isPortrait ? "pointer" : "grab",
      userSelect: "none",
      WebkitUserSelect: "none",
      MozUserSelect: "none",
      msUserSelect: "none",
      scrollbarWidth: "thin",
      fontSize: isPortrait ? "3vw" : "0.9rem",
    }), [isDark, isPortrait]);
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
      gap: isPortrait ? "2vw" : "0.8vw",
      flexWrap: isPortrait ? "wrap" : "nowrap",
    };

    const rowBackground = isDark ? "rgb(41, 40, 40)" : "rgb(243, 240, 240)";

    // 使用虚拟列表渲染，避免在大数据量时一次性渲染所有行导致卡顿
    return (
      <div
        data-test-id="div-test-6" {...ariaAttributes}
        role="row"
        aria-rowindex={index + 2}
        style={{
          ...style,
          width: "100%",
          display: "grid",
          gridTemplateColumns: COLUMN_TEMPLATE,
          alignItems: "stretch",
          boxSizing: "border-box",
          padding: isPortrait ? "0 2vw" : "0 16px",
          height: ROW_HEIGHT,
          background: rowBackground,
          borderBottom: isDark
            ? `${isPortrait ? "0.25vw" : "0.06vw"} solid rgba(255,255,255,0.06)`
            : `${isPortrait ? "0.25vw" : "0.06vw"} solid rgba(0,0,0,0.05)`,
        }}
      >
        <Tooltip
          data-test-id="tooltip-test-3" title={
            <div>
              {currentSet?.name
                ? currentSet.name
                : t("noMark")
              }
            </div>
          }
          mouseEnterDelay={0.5}
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
          <div data-test-id="div-test-5" style={{ ...baseCellStyle, justifyContent: "center", overflow: "hidden" }}>
            <Link data-test-id="link-test" to={`/wordsList/${currentSet?.id}`}>{currentSet?.name ?? t("noName")}</Link>
          </div>
        </Tooltip>
        <Tooltip
          data-test-id="tooltip-test-2" title={
            <div>
              {currentSet?.id === DEFAULT_WORD_SET_ID
                ? t("defaultWordSetMark")
                : currentSet?.mark
                  ? currentSet.mark
                  : t("noMark")
              }
            </div>
          }
          mouseEnterDelay={isPortrait ? 0.1 : 0.5}
          placement={isPortrait ? "top" : "right"}
          styles={{
            body: {
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
              color: isDark ? "#fff" : "#333",
              maxHeight: "30vh",
              maxWidth: isPortrait ? "80vw" : "400px",
              overflow: "auto",
              scrollbarWidth: "thin",
              padding: "8px 12px",
              borderRadius: "8px",
            },
          }}
        >
          <div
            data-test-id="div-test-4" style={markCellStyle}
            data-testid="word-set-mark"
            ref={markElementRef}
            onPointerDown={isPortrait ? undefined : handleMarkPointerDown}
            onPointerMove={isPortrait ? undefined : handleMarkPointerMove}
            onPointerUp={isPortrait ? undefined : finalizeMarkDrag}
            onPointerCancel={isPortrait ? undefined : finalizeMarkDrag}
            onPointerLeave={isPortrait ? undefined : finalizeMarkDrag}
            onWheel={isPortrait ? undefined : handleWheel}
          >
            {currentSet?.id === DEFAULT_WORD_SET_ID
              ? t("defaultWordSetMark")
              : currentSet?.mark ?? t("noMark")}
          </div>
        </Tooltip>
        <div data-test-id="div-test-3" style={baseCellStyle}>{currentSet?.words?.length || 0}</div>
        <Tooltip
          data-test-id="tooltip-test-1" title={
            <div>
              {currentSet?.createdAt
                ? new Date(currentSet.createdAt).toLocaleDateString()
                : t("unknown")
              }
            </div>
          }
          mouseEnterDelay={isPortrait ? 0.1 : 0.5}
          placement={isPortrait ? "top" : "right"}
          styles={{
            body: {
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
              color: isDark ? "#fff" : "#333",
              maxHeight: "30vh",
              maxWidth: isPortrait ? "80vw" : "400px",
              overflow: "auto",
              scrollbarWidth: "thin",
              padding: "8px 12px",
              borderRadius: "8px",
            },
          }}
        >
          <div
            data-test-id="div-test-2"
            style={{
              ...baseCellStyle,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentSet?.createdAt
              ? new Date(currentSet.createdAt).toLocaleDateString()
              : t("unknown")}
          </div>
        </Tooltip>
        <Tooltip
          data-test-id="tooltip-test" title={
            <div>
              {currentSet?.updatedAt
                ? new Date(currentSet.updatedAt).toLocaleDateString()
                : t("noUpdate")
              }
            </div>
          }
          mouseEnterDelay={isPortrait ? 0.1 : 0.5}
          placement={isPortrait ? "top" : "right"}
          styles={{
            body: {
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)",
              color: isDark ? "#fff" : "#333",
              maxHeight: "30vh",
              maxWidth: isPortrait ? "80vw" : "400px",
              overflow: "auto",
              scrollbarWidth: "thin",
              padding: "8px 12px",
              borderRadius: "8px",
            },
          }}
        >
          <div
            data-test-id="div-test-1"
            style={{
              ...baseCellStyle,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentSet?.updatedAt
              ? new Date(currentSet.updatedAt).toLocaleDateString()
              : t("noUpdate")}
          </div>
        </Tooltip>
        <div data-test-id="div-test" style={actionCellStyle}>
          <button
            data-test-id="button-test-1" style={{
              ...buttonStyle,
              fontSize: isPortrait ? "2.8vw" : "0.9rem",
            }}
            onClick={() => {
              setEditIndex(index);
              dispatch({ type: "SET_EDIT_WORD_SET", payload: {} });
            }}
            onMouseEnter={(e) => {
              if (!isPortrait) {
                e.currentTarget.style.transform = "translateY(-0.125vw)";
                e.currentTarget.style.boxShadow = "0 0.375vw 1.25vw rgba(0, 180, 255, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPortrait) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
              }
            }}
          >
            {t("edit")}
          </button>
          <button
            data-test-id="button-test" style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #ff4757 0%, #ff3742 100%)",
              fontSize: isPortrait ? "2.8vw" : "0.9rem",
            }}
            onClick={() => {
              setDeleteId(currentSet?.id ?? null);
              setPopup(true);
            }}
            data-testid="delete-word-set-button"
            onMouseEnter={(e) => {
              if (!isPortrait) {
                e.currentTarget.style.transform = "translateY(-0.125vw)";
                e.currentTarget.style.boxShadow = "0 0.375vw 1.25vw rgba(255, 71, 87, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPortrait) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isPortrait ? "0 1vw 3.75vw rgba(255, 71, 87, 0.3)" : "0 0.25vw 0.9375vw rgba(255, 71, 87, 0.3)";
              }
            }}
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
        <div data-test-id="div-test-12" style={emptyStateStyle}>
          <div data-test-id="div-test-11" style={{ fontSize: isPortrait ? "12vw" : "48px", marginBottom: isPortrait ? "4vw" : "16px" }}>⏳</div>
          <p data-test-id="p-test-1">{t("loading")}</p>
        </div>
      ) : wordSets.length === 0 ? (
        <div data-test-id="div-test-10" style={emptyStateStyle}>
          <div data-test-id="div-test-9" style={{ fontSize: isPortrait ? "12vw" : "48px", marginBottom: isPortrait ? "4vw" : "16px" }}>📚</div>
          <h3 data-test-id="h3-test" style={{ margin: `0 0 ${isPortrait ? "2vw" : "8px"} 0`, fontSize: isPortrait ? "4vw" : "1.125rem" }}>{t("noWordSets")}</h3>
          <p data-test-id="p-test">{t("clickToCreateFirst")}</p>
        </div>
      ) : (
        <div data-test-id="div-test-8" style={listContainerStyle} role="table" aria-label={t("wordSetManagement")}>
          <div data-test-id="div-test-7" style={stickyThStyle} role="row" data-testid="word-sets-table-header">
            <span data-test-id="span-test-5" role="columnheader" data-testid="word-sets-table-header-name">{t("tableName")}</span>
            <span
              data-test-id="span-test-4" role="columnheader"
              data-testid="word-sets-table-header-mark"
              style={markHeaderStyle}
            >
              {t("tableMark")}
            </span>
            <span data-test-id="span-test-3" role="columnheader" data-testid="word-sets-table-header-word-count">{t("tableWordCount")}</span>
            <span data-test-id="span-test-2" role="columnheader" data-testid="word-sets-table-header-created-at">{t("tableCreatedAt")}</span>
            <span data-test-id="span-test-1" role="columnheader" data-testid="word-sets-table-header-updated-at">{t("tableUpdatedAt")}</span>
            <span data-test-id="span-test" role="columnheader" data-testid="word-sets-table-header-actions">{t("tableActions")}</span>
          </div>
          <List
            data-test-id="list-test" style={listStyle}
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
          data-test-id="confirmwidget-test" title={t("deleteWordSet")}
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
          data-test-id="editwordsets-test" setLoading={setLoading}
          outterWordSetList={wordSets}
          index={editIndex as number}
        />
      )}
    </>
  );
}




