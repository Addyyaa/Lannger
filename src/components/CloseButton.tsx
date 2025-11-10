import { useState } from "react";
import { useTheme } from "../main";

interface CloseButtonProps {
    onClick: () => void;
    ariaLabel?: string;
    size?: number | string;
    position?: "absolute" | "relative" | "static";
    top?: string;
    right?: string;
    style?: React.CSSProperties;
    iconColor?: string; // 自定义图标颜色
}

/**
 * 关闭按钮组件
 * 简约现代的圆形关闭按钮，支持主题和悬停效果
 */
export default function CloseButton({
    onClick,
    ariaLabel = "关闭",
    size = 40,
    position = "absolute",
    top = "1.5%",
    right = "1.2%",
    style,
    iconColor,
}: CloseButtonProps) {
    const { isDark } = useTheme();
    const [isHovered, setIsHovered] = useState(false);

    // 确定图标颜色：优先使用外部传入的颜色，否则使用默认主题颜色
    const finalIconColor = iconColor || (isDark ? "#ffffff" : "#000000");

    const resolvedButtonSize = typeof size === "number" ? `${size}px` : size;
    const iconDimension = typeof size === "number" ? `${Math.floor(size * 0.5)}px` : "50%";

    const baseButtonStyle: React.CSSProperties = {
        position,
        top: position === "absolute" ? top : undefined,
        right: position === "absolute" ? right : undefined,
        width: resolvedButtonSize,
        height: resolvedButtonSize,
        padding: 0,
        minWidth: resolvedButtonSize,
        minHeight: resolvedButtonSize,
        aspectRatio: "1 / 1",
        borderRadius: "50%",
        border: isDark
            ? "1.5px solid rgba(255, 255, 255, 0.4)"
            : "1.5px solid rgba(0, 0, 0, 0.25)",
        outline: "none",
        cursor: "pointer",
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isHovered
            ? isDark
                ? "rgba(255, 255, 255, 0.25)"
                : "rgba(0, 0, 0, 0.15)"
            : isDark
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(255, 255, 255, 0.9)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "scale(1.1)" : "scale(1)",
        boxShadow: isHovered
            ? isDark
                ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                : "0 4px 12px rgba(0, 0, 0, 0.25)"
            : isDark
                ? "0 2px 8px rgba(0, 0, 0, 0.3)"
                : "0 2px 8px rgba(0, 0, 0, 0.15)",
        zIndex: 10,
    };

    // 合并外部样式，外部样式优先级更高
    const buttonStyle: React.CSSProperties = {
        ...baseButtonStyle,
        ...style,
        // 如果外部样式指定了 transform，需要与悬停效果合并
        transform: style?.transform
            ? isHovered
                ? `${style.transform} scale(1.1)`
                : style.transform
            : isHovered
                ? "scale(1.1)"
                : "scale(1)",
    };

    return (
        <button
            data-test-id="button-test" onClick={onClick}
            style={buttonStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label={ariaLabel}
        >
            <svg
                data-test-id="svg-test" width={iconDimension}
                height={iconDimension}
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    display: "block",
                    pointerEvents: "none",
                    flexShrink: 0,
                    width: iconDimension,
                    height: iconDimension,
                }}
            >
                <line
                    data-test-id="line-test-1" x1="4"
                    y1="4"
                    x2="12"
                    y2="12"
                    stroke={finalIconColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeOpacity="1"
                />
                <line
                    data-test-id="line-test" x1="12"
                    y1="4"
                    x2="4"
                    y2="12"
                    stroke={finalIconColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeOpacity="1"
                />
            </svg>
        </button>
    );
}

