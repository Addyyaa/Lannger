/**
 * 统一的学习卡片容器组件
 * 用于 FlashcardStudy、TestStudy、ReviewStudy 等学习模式
 */

import React from "react";
import { useTheme, useOrientation } from "../main";
import { getContainerStyle, getCardStyle } from "../utils/themeTokens";
import CloseButton from "./CloseButton";

export interface StudyCardProps {
  /** 关闭回调 */
  onClose: () => void;
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义容器样式 */
  containerStyle?: React.CSSProperties;
  /** 自定义卡片样式 */
  cardStyle?: React.CSSProperties;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 关闭按钮位置（默认右上角） */
  closeButtonPosition?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * StudyCard 组件
 * 提供统一的学习卡片容器样式和布局
 */
export default function StudyCard({
  onClose,
  children,
  containerStyle,
  cardStyle,
  showCloseButton = true,
  closeButtonPosition,
}: StudyCardProps) {
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

  const defaultContainerStyle = getContainerStyle(isPortrait);
  const defaultCardStyle = getCardStyle(isDark, isPortrait);

  const finalContainerStyle: React.CSSProperties = {
    ...defaultContainerStyle,
    ...containerStyle,
  };

  const finalCardStyle: React.CSSProperties = {
    ...defaultCardStyle,
    position: "relative",
    ...cardStyle,
  };

  const defaultCloseButtonPosition = {
    top: isPortrait ? "3vw" : "1vw",
    right: isPortrait ? "3vw" : "1vw",
  };

  const closeButtonPos = closeButtonPosition || defaultCloseButtonPosition;

  return (
    <div style={finalContainerStyle}>
      <div style={finalCardStyle}>
        {showCloseButton && (
          <CloseButton
            onClick={onClose}
            style={{
              position: "absolute",
              ...closeButtonPos,
              zIndex: 10,
            }}
            iconColor={isDark ? "#fff" : "#333"}
            ariaLabel="关闭学习"
          />
        )}
        {children}
      </div>
    </div>
  );
}

