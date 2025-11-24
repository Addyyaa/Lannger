import { useCallback, useEffect, useState, useRef } from "react";

declare global {
  interface Window {
    __lanngerSwWaiting?: ServiceWorker;
  }
}

/**
 * 监听 Service Worker 更新，返回可用于触发更新的操作
 * 优化：自动检测并应用更新，减少用户手动刷新
 */
export function useServiceWorkerUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const autoUpdateAttemptedRef = useRef(false);
  const checkIntervalRef = useRef<number | null>(null);

  // 检查 Service Worker 更新
  const checkForUpdate = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // 强制更新检查
          await registration.update();

          // 检查是否有等待中的 worker
          if (registration.waiting) {
            window.__lanngerSwWaiting = registration.waiting;
            window.dispatchEvent(new CustomEvent("sw-update-available"));
          }
        }
      } catch (error) {
        console.warn("检查 Service Worker 更新失败:", error);
      }
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setDismissed(false);
      setHasUpdate(true);

      // 自动应用更新（延迟 2 秒，给用户看到提示的机会）
      if (!autoUpdateAttemptedRef.current) {
        autoUpdateAttemptedRef.current = true;
        setTimeout(() => {
          const waitingWorker = window.__lanngerSwWaiting;
          if (waitingWorker) {
            console.log("自动应用 Service Worker 更新...");
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
            setHasUpdate(false);
          }
        }, 2000); // 2 秒后自动应用
      }
    };

    window.addEventListener("sw-update-available", handleUpdate);

    // 定期检查更新（每 5 分钟检查一次）
    checkForUpdate();
    checkIntervalRef.current = window.setInterval(
      checkForUpdate,
      5 * 60 * 1000
    );

    // 页面可见时检查更新
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("sw-update-available", handleUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkForUpdate]);

  const applyUpdate = useCallback(() => {
    const waitingWorker = window.__lanngerSwWaiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setHasUpdate(false);
    autoUpdateAttemptedRef.current = true;
  }, []);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    isUpdateAvailable: hasUpdate && !dismissed,
    applyUpdate,
    dismissUpdate,
    checkForUpdate, // 暴露手动检查方法
  };
}
