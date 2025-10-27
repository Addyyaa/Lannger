import { useTranslation } from "react-i18next";
import { useTheme } from "../main";
interface ConfirmWidgetProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void>;
    onCancel?: () => void;
    containerStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    messageStyle?: React.CSSProperties;
    confirmButtonStyle?: React.CSSProperties;
    cancelButtonStyle?: React.CSSProperties;
}

/**
 * 
 * @param title 标题
 * @param message
 * @confirmText 确认按钮文本 可选
 * @cancelText 取消按钮文本 可选
 * @onConfirm 确认按钮点击事件
 * @onCancel 取消按钮点击事件
 * @containerStyle 容器样式 可选
 * @titleStyle 标题样式 可选
 * @messageStyle 消息样式 可选
 * @confirmButtonStyle 确认按钮样式 可选
 * @cancelButtonStyle 取消按钮样式 可选
 * @returns 
 */

export default function ConfirmWidget({ title, message, confirmText, cancelText, onConfirm, onCancel, containerStyle, titleStyle, messageStyle, confirmButtonStyle, cancelButtonStyle }: ConfirmWidgetProps) {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    return (
        <div style={Container}>
            <div style={{ ...confirmWidgetStyle(isDark), ...containerStyle }} data-testid="confirm-widget">
                <h1 style={{ ...titleStyleInner(isDark), ...titleStyle }} data-testid="confirm-widget-title">{title}</h1>
                <p style={{ ...messageStyleInner, ...messageStyle }} data-testid="confirm-widget-message">{message}</p>
                <button
                    style={{ ...confirmButtonStyleInner(isDark), ...confirmButtonStyle }}
                    onClick={onConfirm}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = isDark
                            ? "0 6px 20px rgba(0, 0, 0, 0.4)"
                            : "0 6px 20px rgba(0, 180, 255, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = isDark
                            ? "0 4px 15px rgba(0, 0, 0, 0.3)"
                            : "0 4px 15px rgba(0, 180, 255, 0.3)";
                    }}
                    data-testid="confirm-widget-confirm-button"
                >
                    {confirmText || t("confirm")}
                </button>
                <button
                    style={{ ...cancelButtonStyleInner(isDark), ...cancelButtonStyle }}
                    onClick={onCancel}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = isDark
                            ? "0 6px 20px rgba(0, 0, 0, 0.4)"
                            : "0 6px 20px rgba(0, 180, 255, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = isDark
                            ? "0 4px 15px rgba(0, 0, 0, 0.3)"
                            : "0 4px 15px rgba(0, 180, 255, 0.3)";
                    }}
                    data-testid="confirm-widget-cancel-button"
                >
                    {cancelText || t("cancel")}
                </button>
            </div>
        </div>
    );
}

const confirmWidgetStyle = (isDark: boolean): React.CSSProperties => ({
    width: "30%",
    aspectRatio: 2 / 1.3,
    display: "flex",
    position: "relative",
    borderRadius: "0.73vw",
    background: isDark ? "rgb(236, 235, 235)" : "#eeeeee",
    boxShadow: isDark ? "0 0 10px 0 rgba(0, 0, 0, 0.3)" : "0 0 10px 0 rgba(0, 0, 0, 0.1)",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
});

const titleStyleInner = (isDark: boolean): React.CSSProperties => ({
    position: "absolute",
    top: '2%',
    left: '2%',
    fontSize: "0.9vw",
    fontWeight: "bold",
    color: isDark ? "rgb(104, 95, 95)" : "rgba(0, 0, 0, 1)",
});

const messageStyleInner: React.CSSProperties = {
    fontSize: "1vw",
    maxWidth: "80%",
    textAlign: "left",
    overflowWrap: "break-word",
    color: "#333",
};

const confirmButtonStyleInner = (isDark: boolean): React.CSSProperties => ({
    position: "absolute",
    width: "20%",
    bottom: '6%',
    right: '8%',
    background: "rgb(87, 152, 236)",
    color: "rgba(0, 0, 0, 1)",
    border: "none",
    borderRadius: "0.73vw",
    padding: "12px 24px",
    fontSize: "0.9vw",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isDark ? "0 4px 15px rgba(0, 0, 0, 0.3)" : "0 4px 15px rgba(0, 180, 255, 0.3)",
});

const cancelButtonStyleInner = (isDark: boolean): React.CSSProperties => ({
    width: "20%",
    bottom: '6%',
    left: '8%',
    position: "absolute",
    background: "rgb(233, 231, 231)",
    color: "rgb(104, 95, 95)",
    border: "none",
    borderRadius: "0.73vw",
    padding: "12px 24px",
    fontSize: "0.9vw",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isDark ? "0 4px 15px rgba(0, 0, 0, 0.3)" : "0 4px 15px rgba(0, 180, 255, 0.3)",
});

const Container: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
};