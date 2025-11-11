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
        zh
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

// 同步初始化 i18n
i18n
    .use(LanguageDetector) // 自动检测浏览器语言
    .use(initReactI18next)
    .init({
        resources: buildResources(),
        fallbackLng: "en",
        load: "languageOnly",
        supportedLngs: Object.keys(languages),
        interpolation: { escapeValue: false },
    });

export default i18n;