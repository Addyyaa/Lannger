import { useCallback, useEffect, useState } from "react";

// Chrome 扩展的 beforeinstallprompt 事件类型声明
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * PWA 安装提示逻辑封装
 * - 监听 beforeinstallprompt 事件，保存原始事件对象
 * - 提供 promptInstall 方法触发浏览器安装流程
 * - 监听 appinstalled 事件，记录安装状态
 */
export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isPromptVisible, setPromptVisible] = useState(false);
  const [isInstalled, setInstalled] = useState(false);

  useEffect(() => {
    // 检测当前显示模式，判断是否已安装
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    if (isStandalone) {
      setInstalled(true);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setPromptVisible(true);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setPromptVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: "unavailable" as const };
    }
    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setPromptVisible(false);
      return result;
    } catch (error) {
      console.error("触发 PWA 安装提示失败:", error);
      return { outcome: "error" as const };
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setPromptVisible(false);
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isPromptVisible,
    isInstalled,
    promptInstall,
    dismissPrompt,
  };
}
