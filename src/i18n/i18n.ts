import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import languages from "./languages.json";

// 同步导入语言文件（避免异步问题）
import en from "./en.json";
import zh from "./zh.json";

// 根据 languages.json 动态构建 resources
const buildResources = () => {
  const resources: Record<string, { translation: any }> = {};

  // 映射语言代码到对应的导入文件
  const languageModules: Record<string, any> = {
    en,
    zh,
  };

  for (const [langCode] of Object.entries(languages)) {
    if (languageModules[langCode]) {
      resources[langCode] = { translation: languageModules[langCode] };
    } else {
      console.warn(`Language file not found for: ${langCode}`);
    }
  }

  return resources;
};

// 初始化 i18n（确保 initReactI18next 正确配置）
// 注意：init() 返回 Promise，但这里使用同步方式初始化
// 因为资源文件已经同步导入，所以可以立即初始化
if (!i18n.isInitialized) {
  // 先配置插件
  i18n.use(LanguageDetector); // 自动检测浏览器语言
  i18n.use(initReactI18next); // 必须在使用 useTranslation 之前初始化

  // 初始化 i18n（同步方式，因为资源已同步导入）
  i18n.init({
    resources: buildResources(),
    fallbackLng: "en",
    load: "languageOnly",
    supportedLngs: Object.keys(languages),
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false, // 禁用 Suspense，避免初始化问题
    },
    // 确保初始化是同步的
    initImmediate: true, // 立即初始化（默认值）
  });
}

export default i18n;
