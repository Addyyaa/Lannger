import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
import { StudyMode } from "../db";
import CloseButton from "./CloseButton";

interface StudyModeSelectorProps {
    closePopup: () => void;
    onSelectMode: (mode: StudyMode) => void;
}

/**
 * 学习模式选择弹窗组件
 */
export default function StudyModeSelector({ closePopup, onSelectMode }: StudyModeSelectorProps) {
    const { t } = useTranslation();
    const { isDark } = useTheme();

    const containerStyle: React.CSSProperties = {
        background: isDark
            ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        borderRadius: "12px",
        padding: "32px",
        minWidth: "500px",
        maxWidth: "700px",
        boxShadow: isDark
            ? "0 8px 32px rgba(0, 0, 0, 0.4)"
            : "0 8px 32px rgba(0, 0, 0, 0.15)",
        border: isDark ? "1px solid #444" : "1px solid #e0e0e0",
        position: "relative",
    };

    const titleStyle: React.CSSProperties = {
        fontSize: "24px",
        fontWeight: "bold",
        color: isDark ? "#fff" : "#333",
        marginBottom: "24px",
        textAlign: "center",
    };

    const modesGridStyle: React.CSSProperties = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px",
    };

    const modeCardStyle: React.CSSProperties = {
        padding: "24px",
        background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
        borderRadius: "8px",
        border: isDark ? "1px solid #555" : "1px solid #e0e0e0",
        cursor: "pointer",
        transition: "all 0.3s ease",
        textAlign: "center",
    };

    const modeIconStyle: React.CSSProperties = {
        fontSize: "48px",
        marginBottom: "12px",
    };

    const modeTitleStyle: React.CSSProperties = {
        fontSize: "18px",
        fontWeight: "bold",
        color: isDark ? "#fff" : "#333",
        marginBottom: "8px",
    };

    const modeDescStyle: React.CSSProperties = {
        fontSize: "14px",
        color: isDark ? "#ccc" : "#666",
        lineHeight: "1.5",
    };

    const modes: Array<{ mode: StudyMode; icon: string; title: string; desc: string }> = [
        {
            mode: "flashcard",
            icon: "🎴",
            title: t("flashcardMode"),
            desc: t("flashcardDesc"),
        },
        {
            mode: "test",
            icon: "📝",
            title: t("testMode"),
            desc: t("testDesc"),
        },
        {
            mode: "review",
            icon: "🔄",
            title: t("reviewMode"),
            desc: t("reviewDesc"),
        },
    ];

    return (
        <div style={containerStyle}>
            <CloseButton
                onClick={closePopup}
                style={{ position: "absolute", top: "16px", right: "16px" }}
                iconColor={isDark ? "#fff" : "#333"}
            />
            <h2 style={titleStyle}>{t("chooseStudyMode")}</h2>
            <div style={modesGridStyle}>
                {modes.map(({ mode, icon, title, desc }) => (
                    <div
                        key={mode}
                        style={modeCardStyle}
                        onClick={() => onSelectMode(mode)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = isDark
                                ? "0 8px 24px rgba(0, 0, 0, 0.5)"
                                : "0 8px 24px rgba(0, 180, 255, 0.2)";
                            e.currentTarget.style.borderColor = "#00b4ff";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.borderColor = isDark ? "#555" : "#e0e0e0";
                        }}
                    >
                        <div style={modeIconStyle}>{icon}</div>
                        <div style={modeTitleStyle}>{title}</div>
                        <div style={modeDescStyle}>{desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

