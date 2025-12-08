/**
 * 响应式工具
 * 提供统一的断点定义和响应式 Hook
 */

import { useState, useEffect } from "react";

/**
 * 响应式断点定义
 */
export const breakpoints = {
  /** 移动设备（手机） */
  mobile: 768,
  /** 平板设备 */
  tablet: 1024,
  /** 桌面设备 */
  desktop: 1280,
  /** 大桌面设备 */
  largeDesktop: 1920,
} as const;

/**
 * 媒体查询字符串
 */
export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.mobile - 1}px)`,
  tablet: `(min-width: ${breakpoints.mobile}px) and (max-width: ${breakpoints.tablet - 1}px)`,
  desktop: `(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  largeDesktop: `(min-width: ${breakpoints.desktop}px)`,
  /** 竖屏 */
  portrait: `(orientation: portrait)`,
  /** 横屏 */
  landscape: `(orientation: landscape)`,
} as const;

/**
 * 响应式配置
 */
export interface ResponsiveConfig {
  /** 当前是否为移动设备 */
  isMobile: boolean;
  /** 当前是否为平板设备 */
  isTablet: boolean;
  /** 当前是否为桌面设备 */
  isDesktop: boolean;
  /** 当前是否为竖屏 */
  isPortrait: boolean;
  /** 当前屏幕宽度 */
  width: number;
  /** 当前屏幕高度 */
  height: number;
}

/**
 * 获取响应式配置
 */
export function getResponsiveConfig(): ResponsiveConfig {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isPortrait: false,
      width: 1920,
      height: 1080,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    isMobile: width < breakpoints.mobile,
    isTablet: width >= breakpoints.mobile && width < breakpoints.tablet,
    isDesktop: width >= breakpoints.tablet,
    isPortrait: height > width,
    width,
    height,
  };
}

/**
 * useResponsive Hook
 * 提供响应式配置和断点信息
 */
export function useResponsive(): ResponsiveConfig {
  const [config, setConfig] = useState<ResponsiveConfig>(getResponsiveConfig);

  useEffect(() => {
    const updateConfig = () => {
      setConfig(getResponsiveConfig());
    };

    // 初始设置
    updateConfig();

    // 监听窗口大小变化
    window.addEventListener("resize", updateConfig);
    // 监听设备方向变化（移动端）
    window.addEventListener("orientationchange", updateConfig);

    return () => {
      window.removeEventListener("resize", updateConfig);
      window.removeEventListener("orientationchange", updateConfig);
    };
  }, []);

  return config;
}

/**
 * useMediaQuery Hook
 * 监听媒体查询匹配状态
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 使用 addEventListener（现代浏览器）
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => {
        mediaQuery.removeEventListener("change", handler);
      };
    } else {
      // 兼容旧浏览器
      mediaQuery.addListener(handler);
      return () => {
        mediaQuery.removeListener(handler);
      };
    }
  }, [query]);

  return matches;
}

/**
 * 响应式值工具
 * 根据断点返回不同的值
 */
export function responsiveValue<T>(
  values: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    default: T;
  },
  config: ResponsiveConfig
): T {
  if (config.isMobile && values.mobile !== undefined) {
    return values.mobile;
  }
  if (config.isTablet && values.tablet !== undefined) {
    return values.tablet;
  }
  if (config.isDesktop && values.desktop !== undefined) {
    return values.desktop;
  }
  return values.default;
}

/**
 * 响应式样式工具
 * 根据断点返回不同的样式值
 */
export function responsiveStyle(
  styles: {
    mobile?: React.CSSProperties;
    tablet?: React.CSSProperties;
    desktop?: React.CSSProperties;
    default: React.CSSProperties;
  },
  config: ResponsiveConfig
): React.CSSProperties {
  if (config.isMobile && styles.mobile) {
    return { ...styles.default, ...styles.mobile };
  }
  if (config.isTablet && styles.tablet) {
    return { ...styles.default, ...styles.tablet };
  }
  if (config.isDesktop && styles.desktop) {
    return { ...styles.default, ...styles.desktop };
  }
  return styles.default;
}

