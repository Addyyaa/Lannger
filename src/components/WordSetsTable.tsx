import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import * as dbOperator from "../store/wordStore";
import ConfirmWidget from "./ConfirmWidget";

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
  const emptyStateStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "6vh 0",
  };

  const tdStyle: React.CSSProperties = {
    padding: "16px",
    textAlign: "center",
  };

  const buttonStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
    color: "white",
    border: "none",
    borderRadius: "0.3vw",
    fontSize: "1vw",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(0, 180, 255, 0.3)",
  };

  const thStyle: React.CSSProperties = {
    padding: "1vh",
    textAlign: "left",
    fontWeight: "bold",
  };

  const tableContainerStyle: React.CSSProperties = {
    width: "100%",
    maxHeight: "40vh",
    overflowY: "auto",
    overflowX: "auto",
    // 隐藏滚动条
    scrollbarWidth: "none",
    borderRadius: "8px",
    // border: "1px solid #e0e0e0",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
  };
  const stickyThStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: "center",
    background: isDark ? 'black' : '#eeeeee',
    color: isDark ? 'white' : 'rgb(77, 76, 76)',
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
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
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={stickyThStyle}>{t("tableName")}</th>
                <th style={stickyThStyle}>{t("tableWordCount")}</th>
                <th style={stickyThStyle}>{t("tableCreatedAt")}</th>
                <th style={stickyThStyle}>{t("tableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {wordSets.map((set, index) => (
                <tr key={set.id || index}>
                  <td style={tdStyle}>{set.name || t("unnamed")}</td>
                  <td style={tdStyle}>{set.words?.length || 0}</td>
                  <td style={tdStyle}>
                    {set.createdAt
                      ? new Date(set.createdAt).toLocaleDateString()
                      : t("unknown")}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        style={{
                          ...buttonStyle,
                          fontSize: "14px",
                          padding: "6px 12px",
                        }}
                      >
                        {t("edit")}
                      </button>
                      <button
                        style={{
                          ...buttonStyle,
                          background:
                            "linear-gradient(135deg, #ff4757 0%, #ff3742 100%)",
                          fontSize: "14px",
                          padding: "6px 12px",
                        }}
                        onClick={() => { setDeleteId(set.id); setPopup(true); }}
                        data-testid="delete-word-set-button"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {popup && <ConfirmWidget title={t("deleteWordSet")} message={t("deleteWordSetMessage")} onConfirm={async () => { if (deleteId) { await deleteWordSet(deleteId); } }} onCancel={() => { setPopup(false); }} />}
    </>
  );
}




