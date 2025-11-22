/**
 * 通告管理器组件
 * 负责在应用启动时检查并显示通告
 */

import { useEffect, useState } from "react";
import AnnouncementDialog from "./AnnouncementDialog";
import {
  AnnouncementData,
  AnnouncementConfig,
  getAnnouncementConfig,
  shouldShowAnnouncement,
  loadAnnouncementHTML,
} from "../services/announcementService";

/**
 * 通告管理器组件
 * 在应用启动时自动检查并显示通告
 */
export default function AnnouncementManager() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 检查并加载通告
  useEffect(() => {
    const checkAndShowAnnouncement = async () => {
      try {
        // 获取配置（异步）
        const config: AnnouncementConfig = await getAnnouncementConfig();

        // 如果未启用，直接返回
        if (!config.enabled) {
          return;
        }

        // 检查是否应该显示
        if (!shouldShowAnnouncement(config)) {
          return;
        }

        // 加载HTML内容
        setIsLoading(true);
        const html = await loadAnnouncementHTML(config.filename);

        // 设置通告数据
        setAnnouncement({
          html,
          config,
        });

        // 显示对话框
        setIsVisible(true);
      } catch (error) {
        // 静默处理错误，避免影响应用正常使用
        console.warn("加载通告失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // 延迟检查，确保应用已完全加载
    const timer = setTimeout(() => {
      void checkAndShowAnnouncement();
    }, 1000); // 延迟 1 秒，避免阻塞应用启动

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // 处理关闭
  const handleClose = () => {
    setIsVisible(false);
    // 延迟清理数据，确保关闭动画完成
    setTimeout(() => {
      setAnnouncement(null);
    }, 300);
  };

  // 如果正在加载或没有通告，不渲染
  if (isLoading || !announcement || !isVisible) {
    return null;
  }

  return (
    <AnnouncementDialog announcement={announcement} onClose={handleClose} />
  );
}
