/**
 * 骨架屏组件
 * 用于列表加载时显示占位内容
 */

import React from "react";
import { useTheme } from "../main";

export interface SkeletonProps {
  /** 骨架屏类型 */
  variant?: "text" | "rectangular" | "circular" | "card" | "listItem";
  /** 宽度（CSS 值，如 "100%", "200px"） */
  width?: string | number;
  /** 高度（CSS 值，如 "20px", "100%"） */
  height?: string | number;
  /** 是否显示动画 */
  animated?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 圆角大小 */
  borderRadius?: string | number;
}

/**
 * Skeleton 组件
 */
export default function Skeleton({
  variant = "rectangular",
  width,
  height,
  animated = true,
  style,
  className,
  borderRadius,
}: SkeletonProps) {
  const { isDark } = useTheme();

  // 根据 variant 设置默认尺寸
  const getDefaultDimensions = () => {
    switch (variant) {
      case "text":
        return { width: width || "100%", height: height || "1em" };
      case "rectangular":
        return { width: width || "100%", height: height || "100px" };
      case "circular":
        const size = width || height || "40px";
        return {
          width: size,
          height: size,
          borderRadius: "50%",
        };
      case "card":
        return { width: width || "100%", height: height || "200px" };
      case "listItem":
        return { width: width || "100%", height: height || "60px" };
      default:
        return { width: width || "100%", height: height || "100px" };
    }
  };

  const dimensions = getDefaultDimensions();
  const defaultBorderRadius =
    borderRadius ||
    (variant === "circular"
      ? "50%"
      : variant === "card"
      ? "8px"
      : variant === "text"
      ? "4px"
      : "4px");

  const skeletonStyle: React.CSSProperties = {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: defaultBorderRadius,
    backgroundColor: isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.06)",
    ...(animated && {
      background: isDark
        ? "linear-gradient(90deg, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.1) 75%)"
        : "linear-gradient(90deg, rgba(0, 0, 0, 0.06) 25%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.06) 75%)",
      backgroundSize: "200% 100%",
      animation: "skeleton-shimmer 1.5s ease-in-out infinite",
    }),
    ...style,
  };

  return <div style={skeletonStyle} className={className} />;
}

/**
 * Skeleton 文本组件（多行文本骨架屏）
 */
export function SkeletonText({
  lines = 3,
  width,
  lineHeight = "1.2em",
  gap = "0.5em",
  ...props
}: Omit<SkeletonProps, "variant" | "height"> & {
  lines?: number;
  lineHeight?: string;
  gap?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? "80%" : width || "100%"}
          height={lineHeight}
          {...props}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton 卡片组件（带标题和内容的卡片骨架屏）
 */
export function SkeletonCard({
  width,
  height,
  showTitle = true,
  showContent = true,
  ...props
}: Omit<SkeletonProps, "variant"> & {
  showTitle?: boolean;
  showContent?: boolean;
}) {
  return (
    <div
      style={{
        width: width || "100%",
        height: height,
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {showTitle && <Skeleton variant="text" width="60%" height="1.5em" />}
      {showContent && (
        <SkeletonText lines={3} width="100%" lineHeight="1em" gap="0.5em" />
      )}
    </div>
  );
}

// 添加 CSS 动画（如果还没有）
if (typeof document !== "undefined") {
  const styleId = "skeleton-shimmer-animation";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes skeleton-shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

