import { useState, useEffect } from "react";
import * as dbOperator from "../store/wordStore";
import { useTranslation } from "react-i18next";

export default function WordSetsTable({
  wordSets,
  loading,
}: {
  wordSets: any[];
  loading: boolean;
}) {
  const { t } = useTranslation();
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
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t("tableName")}</th>
              <th style={thStyle}>{t("tableWordCount")}</th>
              <th style={thStyle}>{t("tableCreatedAt")}</th>
              <th style={thStyle}>{t("tableActions")}</th>
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
                  <div style={{ display: "flex", gap: "8px" }}>
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
                    >
                      {t("delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

const emptyStateStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "60px 20px",
};

const tdStyle: React.CSSProperties = {
  padding: "16px",
};

const buttonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #00b4ff 0%, #0096d4 100%)",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "12px 24px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 15px rgba(0, 180, 255, 0.3)",
};

const thStyle: React.CSSProperties = {
  padding: "16px",
  textAlign: "left",
  fontWeight: "bold",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  borderRadius: "8px",
  overflow: "hidden",
};
