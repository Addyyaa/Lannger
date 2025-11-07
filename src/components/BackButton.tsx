import { useState, useMemo } from "react";
import { useTheme } from "../main";
import { useTranslation } from "react-i18next";

interface BackButtonProps {
    onClick: () => void;
    ariaLabel?: string;
    showText?: boolean;
    style?: React.CSSProperties;
}

/**
 * 返回按钮组件
 * 简约现代的返回按钮，支持主题和悬停效果
 */
export default function BackButton({
    onClick,
    ariaLabel,
    showText = true,
    style,
}: BackButtonProps) {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const [isHovered, setIsHovered] = useState(false);

    const baseButtonStyle = useMemo((): React.CSSProperties => ({
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        fontSize: "15px",
        fontWeight: "500",
        color: isDark ? "#f5f5f5" : "#333",
        backgroundColor: isHovered
            ? isDark
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(0, 0, 0, 0.06)"
            : isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.04)",
        border: isDark
            ? "1px solid rgba(255, 255, 255, 0.15)"
            : "1px solid rgba(0, 0, 0, 0.12)",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateX(-2px)" : "translateX(0)",
        boxShadow: isHovered
            ? isDark
                ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                : "0 4px 12px rgba(0, 0, 0, 0.15)"
            : "none",
        outline: "none",
    }), [isDark, isHovered]);

    // 合并外部样式，外部样式优先级更高
    const buttonStyle: React.CSSProperties = useMemo(() => {
        if (!style) return baseButtonStyle;
        
        return {
            ...baseButtonStyle,
            ...style,
            // 如果外部样式指定了 transform，需要与悬停效果合并
            transform: style.transform
                ? isHovered
                    ? `${style.transform} translateX(-2px)`
                    : style.transform
                : isHovered
                    ? "translateX(-2px)"
                    : "translateX(0)",
        };
    }, [baseButtonStyle, style, isHovered]);

    return (
        <button
            onClick={onClick}
            style={buttonStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={ariaLabel || t("back")}
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: "block", flexShrink: 0 }}
            >
                <path
                    d="M11 13L6 8L11 3"
                    stroke={isDark ? "#f5f5f5" : "#333"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            {showText && <span>{t("back")}</span>}
        </button>
    );
}

