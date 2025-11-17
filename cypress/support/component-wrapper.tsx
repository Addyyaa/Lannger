/**
 * 组件测试包装器
 * 
 * 为组件测试提供必要的 Context 和依赖
 */

import React from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../src/i18n/i18n";

// 创建主题上下文
const ThemeContext = React.createContext<{
  isDark: boolean;
  toggleTheme: () => void;
}>({
  isDark: false,
  toggleTheme: () => {},
});

// 主题提供者组件
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);
    if (mediaQuery.matches) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      if (e.matches) {
        document.body.classList.add("dark");
      } else {
        document.body.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 创建竖屏检测上下文
const OrientationContext = React.createContext<{
  isPortrait: boolean;
  width: number;
  height: number;
}>({
  isPortrait: false,
  width: 0,
  height: 0,
});

// 竖屏检测提供者组件
function OrientationProvider({ children }: { children: React.ReactNode }) {
  const [orientation, setOrientation] = React.useState(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      isPortrait: height > width,
      width,
      height,
    };
  });

  React.useEffect(() => {
    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      setOrientation({
        isPortrait,
        width,
        height,
      });
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return (
    <OrientationContext.Provider value={orientation}>
      {children}
    </OrientationContext.Provider>
  );
}

/**
 * 组件测试包装器
 * 提供所有必要的 Context 和依赖
 */
export function ComponentTestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <OrientationProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </OrientationProvider>
    </I18nextProvider>
  );
}

