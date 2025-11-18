/**
 * 共享主题令牌工具
 *
 * 用于统一 FlashcardStudy、TestStudy、ReviewStudy 三个组件的设计风格
 * 确保主题切换和响应式设计的一致性
 */

/**
 * 主题令牌类型定义
 */
export interface ThemeTokens {
  // 容器样式
  containerGradient: string;
  containerBorderColor: string;
  containerShadowPortrait: string;
  containerShadowLandscape: string;

  // 卡片样式
  cardSurface: string;
  cardBorderColor: string;
  cardShadowPortrait: string;
  cardShadowLandscape: string;

  // 玻璃态效果（用于切换按钮等）
  glassBackground: string;
  glassBorder: string;
  glassShadow: string;
  glassHighlightBackground: string;
  glassHighlightShadow: string;

  // 高亮效果
  highlightFluidColor: string;
  highlightFluidSheen: string;
  highlightHaloShadow: string;

  // 按钮图标颜色
  lightbulbActivePrimary: string;
  lightbulbInactivePrimary: string;
  lightbulbActiveAccent: string;
  lightbulbInactiveAccent: string;
  wandActivePrimary: string;
  wandInactivePrimary: string;
}

/**
 * 获取主题令牌
 *
 * @param isDark 是否为暗色主题
 * @returns 主题令牌对象
 */
export function getThemeTokens(isDark: boolean): ThemeTokens {
  if (isDark) {
    return {
      containerGradient:
        "linear-gradient(135deg, rgba(28, 28, 30, 0.96) 0%, rgba(44, 44, 46, 0.92) 100%)",
      containerBorderColor: "rgba(118, 118, 128, 0.35)",
      containerShadowPortrait: "0 4vw 8vw rgba(0, 0, 0, 0.55)",
      containerShadowLandscape: "0 1.5vw 3vw rgba(0, 0, 0, 0.55)",
      cardSurface:
        "linear-gradient(160deg, rgba(50, 50, 52, 0.7) 0%, rgba(30, 30, 32, 0.5) 100%)",
      cardBorderColor: "rgba(255, 255, 255, 0.08)",
      cardShadowPortrait: "0 2.5vw 6vw rgba(0, 0, 0, 0.45)",
      cardShadowLandscape: "0 1vw 2.5vw rgba(0, 0, 0, 0.45)",
      glassBackground:
        "linear-gradient(135deg, rgba(44, 44, 46, 0.65) 0%, rgba(22, 22, 24, 0.4) 100%)",
      glassBorder: "1px solid rgba(255, 255, 255, 0.16)",
      glassShadow: "0 18px 44px rgba(0, 0, 0, 0.55)",
      glassHighlightBackground:
        "linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(99, 102, 241, 0.08) 100%)",
      glassHighlightShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.18)",
      highlightFluidColor: "rgba(108, 126, 255, 0.34)",
      highlightFluidSheen: "rgba(255, 255, 255, 0.42)",
      highlightHaloShadow: "rgba(15, 23, 42, 0.28)",
      lightbulbActivePrimary: "rgba(255, 255, 255, 0.92)",
      lightbulbInactivePrimary: "rgba(142, 142, 147, 0.55)",
      lightbulbActiveAccent: "rgba(255, 232, 100, 1)",
      lightbulbInactiveAccent: "rgba(255, 232, 100, 0.25)",
      wandActivePrimary: "rgba(124, 116, 255, 1)",
      wandInactivePrimary: "rgba(124, 116, 255, 0.28)",
    };
  }

  return {
    containerGradient:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(243, 246, 255, 0.92) 100%)",
    containerBorderColor: "rgba(141, 153, 174, 0.25)",
    containerShadowPortrait: "0 4vw 8vw rgba(15, 23, 42, 0.15)",
    containerShadowLandscape: "0 1.5vw 3vw rgba(15, 23, 42, 0.12)",
    cardSurface:
      "linear-gradient(160deg, rgba(255, 255, 255, 0.88) 0%, rgba(235, 242, 255, 0.6) 100%)",
    cardBorderColor: "rgba(120, 144, 156, 0.16)",
    cardShadowPortrait: "0 2.5vw 6vw rgba(15, 23, 42, 0.12)",
    cardShadowLandscape: "0 1vw 2.5vw rgba(15, 23, 42, 0.1)",
    glassBackground:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.78) 0%, rgba(232, 237, 255, 0.35) 100%)",
    glassBorder: "1px solid rgba(255, 255, 255, 0.65)",
    glassShadow: "0 18px 40px rgba(15, 23, 42, 0.15)",
    glassHighlightBackground:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(210, 215, 255, 0.45) 100%)",
    glassHighlightShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.45)",
    highlightFluidColor:
      "linear-gradient(150deg, rgba(102, 126, 255, 0.95) 0%, rgba(78, 101, 255, 0.88) 42%, rgba(0, 174, 255, 0.72) 78%, rgba(181, 235, 255, 0.78) 100%)",
    highlightFluidSheen: "rgba(255, 255, 255, 0.88)",
    highlightHaloShadow: "rgba(96, 122, 255, 0.38)",
    lightbulbActivePrimary: "#3a3a3c",
    lightbulbInactivePrimary: "rgba(60, 60, 67, 0.45)",
    lightbulbActiveAccent: "rgba(255, 209, 67, 1)",
    lightbulbInactiveAccent: "rgba(255, 209, 67, 0.28)",
    wandActivePrimary: "#6f4bff",
    wandInactivePrimary: "rgba(111, 75, 255, 0.32)",
  };
}

/**
 * 获取容器样式
 *
 * @param themeTokens 主题令牌
 * @param isPortrait 是否为竖屏
 * @returns 容器样式对象
 */
export function getContainerStyle(
  themeTokens: ThemeTokens,
  isPortrait: boolean
): React.CSSProperties {
  return {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: themeTokens.containerGradient,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: isPortrait ? "5vw" : "2vw",
    boxSizing: "border-box",
  };
}

/**
 * 获取卡片样式
 *
 * @param themeTokens 主题令牌
 * @param isPortrait 是否为竖屏
 * @returns 卡片样式对象
 */
export function getCardStyle(
  themeTokens: ThemeTokens,
  isPortrait: boolean
): React.CSSProperties {
  return {
    background: themeTokens.cardSurface,
    borderRadius: isPortrait ? "4vw" : "1.5vw",
    padding: isPortrait ? "8vw" : "3vw",
    maxWidth: isPortrait ? "90%" : "700px",
    width: "100%",
    boxShadow: isPortrait
      ? themeTokens.cardShadowPortrait
      : themeTokens.cardShadowLandscape,
    border: `${isPortrait ? "0.3vw" : "0.1vw"} solid ${
      themeTokens.cardBorderColor
    }`,
    position: "relative",
    minHeight: isPortrait ? "60vh" : "400px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  };
}

/**
 * 获取玻璃态按钮容器样式
 *
 * @param themeTokens 主题令牌
 * @param isPortrait 是否为竖屏
 * @returns 玻璃态按钮容器样式对象
 */
export function getGlassButtonContainerStyle(
  themeTokens: ThemeTokens,
  isPortrait: boolean
): React.CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: isPortrait ? "30%" : "12%",
    aspectRatio: isPortrait ? "3/1.2" : "3/1",
    borderRadius: isPortrait ? "7vw" : "3vw",
    background: themeTokens.glassBackground,
    border: themeTokens.glassBorder,
    boxShadow: themeTokens.glassShadow,
    backdropFilter: "blur(22px) saturate(135%)",
    WebkitBackdropFilter: "blur(22px) saturate(135%)",
    backgroundClip: "padding-box",
    transition:
      "background 0.35s ease, border 0.35s ease, box-shadow 0.35s ease",
    overflow: "hidden",
  };
}

/**
 * 获取高亮背景样式
 *
 * @param themeTokens 主题令牌
 * @param isPortrait 是否为竖屏
 * @param isLeft 是否在左侧
 * @returns 高亮背景样式对象
 */
export function getHighlightBackgroundStyle(
  themeTokens: ThemeTokens,
  isPortrait: boolean,
  isLeft: boolean
): React.CSSProperties {
  return {
    position: "absolute",
    top: 0,
    left: isLeft ? 0 : "50%",
    width: "50%",
    height: "100%",
    borderRadius: isPortrait ? "7vw" : "3vw",
    background: themeTokens.glassHighlightBackground,
    boxShadow: themeTokens.glassHighlightShadow,
    zIndex: 0,
    ["--mode-fluid-color" as any]: themeTokens.highlightFluidColor,
    ["--mode-fluid-sheen" as any]: themeTokens.highlightFluidSheen,
    ["--mode-fluid-halo" as any]: themeTokens.highlightHaloShadow,
  };
}
