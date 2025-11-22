/**
 * 通告对话框组件
 * 用于显示从HTML文件加载的通告内容
 */

import { useEffect, useState } from "react";
import { useTheme, useOrientation } from "../main";
import { useTranslation } from "react-i18next";
import CloseButton from "./CloseButton";
import {
  AnnouncementData,
  markAnnouncementShown,
} from "../services/announcementService";

interface AnnouncementDialogProps {
  /**
   * 通告数据
   */
  announcement: AnnouncementData;
  /**
   * 关闭回调
   */
  onClose: () => void;
}

/**
 * 通告对话框组件
 */
export default function AnnouncementDialog({
  announcement,
  onClose,
}: AnnouncementDialogProps) {
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();
  const { t } = useTranslation();
  const [content, setContent] = useState<string>("");

  // 解析HTML内容
  useEffect(() => {
    try {
      // 将HTML字符串转换为可显示的内容
      // 这里直接使用 dangerouslySetInnerHTML，但需要确保HTML内容安全
      setContent(announcement.html);
    } catch (error) {
      console.error("解析通告内容失败:", error);
      setContent("<p>加载通告内容失败</p>");
    }
  }, [announcement.html]);

  // 处理关闭
  const handleClose = () => {
    // 标记已显示
    markAnnouncementShown(announcement.config);
    onClose();
  };

  // 容器样式
  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
    padding: isPortrait ? "3vw" : "2vw",
    boxSizing: "border-box",
  };

  // 对话框样式
  const dialogStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: isPortrait ? "95%" : "800px",
    maxHeight: isPortrait ? "90vh" : "85vh",
    background: isDark
      ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    borderRadius: isPortrait ? "3vw" : "1.5vw",
    padding: isPortrait ? "5vw" : "3vw",
    boxShadow: isDark
      ? "0 2vw 8vw rgba(0, 0, 0, 0.5)"
      : "0 1vw 4vw rgba(0, 0, 0, 0.15)",
    border: isDark ? "0.3vw solid #444" : "0.1vw solid #e0e0e0",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
  };

  // 内容区域样式
  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: "auto",
    fontSize: isPortrait ? "3.5vw" : "1.1vw",
    lineHeight: 1.6,
    color: isDark ? "#e0e0e0" : "#333",
    wordWrap: "break-word",
  };

  // 关闭按钮样式
  const closeButtonStyle: React.CSSProperties = {
    position: "absolute",
    top: isPortrait ? "2vw" : "1.5vw",
    right: isPortrait ? "2vw" : "1.5vw",
    zIndex: 10001,
  };

  // 底部按钮容器样式
  const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: isPortrait ? "4vw" : "2vw",
    gap: isPortrait ? "3vw" : "1.5vw",
  };

  // 确认按钮样式
  const confirmButtonStyle: React.CSSProperties = {
    padding: isPortrait ? "3vw 8vw" : "1vw 3vw",
    borderRadius: isPortrait ? "2vw" : "0.8vw",
    border: "none",
    background: "linear-gradient(135deg, #00b4ff 0%, #007bff 100%)",
    color: "#fff",
    fontSize: isPortrait ? "3.5vw" : "1.1vw",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: isDark
      ? "0 0.5vw 1.5vw rgba(0, 180, 255, 0.4)"
      : "0 0.3vw 1vw rgba(0, 180, 255, 0.3)",
  };

  return (
    <div
      style={containerStyle}
      onClick={(e) => {
        // 点击背景关闭（可选）
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      data-testid="announcement-dialog"
    >
      <div
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
        data-testid="announcement-dialog-content"
      >
        {/* 关闭按钮 */}
        <div style={closeButtonStyle}>
          <CloseButton
            onClick={handleClose}
            ariaLabel={t("close")}
            iconColor={isDark ? "#e0e0e0" : "#333"}
            size={isPortrait ? 30 : 40}
          />
        </div>

        {/* 内容区域 */}
        <div
          style={contentStyle}
          dangerouslySetInnerHTML={{ __html: content }}
          data-testid="announcement-content"
        />

        {/* 底部确认按钮 */}
        <div style={buttonContainerStyle}>
          <button
            style={confirmButtonStyle}
            onClick={handleClose}
            onMouseEnter={(e) => {
              if (!isPortrait) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = isDark
                  ? "0 0.8vw 2vw rgba(0, 180, 255, 0.5)"
                  : "0 0.5vw 1.5vw rgba(0, 180, 255, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPortrait) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isDark
                  ? "0 0.5vw 1.5vw rgba(0, 180, 255, 0.4)"
                  : "0 0.3vw 1vw rgba(0, 180, 255, 0.3)";
              }
            }}
            data-testid="announcement-confirm-button"
          >
            {t("confirm") || "我知道了"}
          </button>
        </div>
      </div>
    </div>
  );
}

