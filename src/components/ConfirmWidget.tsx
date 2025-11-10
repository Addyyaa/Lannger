import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";
import CloseButton from "./CloseButton";
interface ConfirmWidgetProps {
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void>;
    onCancel?: () => void;
    containerStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
    messageStyle?: React.CSSProperties;
    confirmButtonStyle?: React.CSSProperties;
    cancelButtonStyle?: React.CSSProperties;
    showCloseButton?: boolean;
    close?: () => void;
    confirmDisabled?: boolean;
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

export default function ConfirmWidget({ title, message, confirmText, cancelText, onConfirm, onCancel, containerStyle, titleStyle, messageStyle, confirmButtonStyle, cancelButtonStyle, showCloseButton = false, close, confirmDisabled = false }: ConfirmWidgetProps) {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const { isPortrait } = useOrientation();
    const disabledStyles: React.CSSProperties = confirmDisabled
        ? {
            opacity: 0.5,
            cursor: "not-allowed",
            boxShadow: "none",
        }
        : {};
    return (
        <div data-test-id="div-test-1" style={Container}>
            <div data-test-id="div-test" style={{ ...confirmWidgetStyle(isDark, isPortrait), ...containerStyle }} data-testid="confirm-widget">
                {showCloseButton && close && (
                    <CloseButton
                        data-test-id="closebutton-test" onClick={close}
                        ariaLabel={t("close")}
                        iconColor="#333333"
                        size={isPortrait ? 30 : 40}
                        position="absolute"
                        top={isPortrait ? "3vw" : "2%"}
                        right={isPortrait ? "3vw" : "2%"}
                    />
                )}
                <h1 data-test-id="h1-test" style={{ ...titleStyleInner(isDark, isPortrait), ...titleStyle }} data-testid="confirm-widget-title">{title}</h1>
                <p data-test-id="p-test" style={{ ...messageStyleInner(isPortrait), ...messageStyle }} data-testid="confirm-widget-message">{message}</p>
                <div style={{ display: "flex", flexDirection: isPortrait ? "column" : "row", gap: isPortrait ? "2vw" : "1vw", width: "100%", justifyContent: "center", alignItems: "center" }}>
                    <button
                        data-test-id="button-test-1" style={{ ...confirmButtonStyleInner(isDark, isPortrait), ...confirmButtonStyle, ...disabledStyles }}
                        disabled={confirmDisabled}
                        onClick={() => {
                            if (confirmDisabled) return;
                            void onConfirm();
                        }}
                        onMouseEnter={(e) => {
                            if (confirmDisabled || isPortrait) return;
                            e.currentTarget.style.transform = "translateY(-0.125vw)";
                            e.currentTarget.style.boxShadow = isDark
                                ? "0 0.375vw 1.25vw rgba(0, 0, 0, 0.4)"
                                : "0 0.375vw 1.25vw rgba(0, 180, 255, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                            if (confirmDisabled || isPortrait) return;
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = isDark
                                ? "0 0.25vw 0.9375vw rgba(0, 0, 0, 0.3)"
                                : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
                        }}
                        data-testid="confirm-widget-confirm-button"
                    >
                        {confirmText || t("confirm")}
                    </button>
                    <button
                        data-test-id="button-test" style={{ ...cancelButtonStyleInner(isDark, isPortrait), ...cancelButtonStyle }}
                        onClick={onCancel}
                        onMouseEnter={(e) => {
                            if (isPortrait) return;
                            e.currentTarget.style.transform = "translateY(-0.125vw)";
                            e.currentTarget.style.boxShadow = isDark
                                ? "0 0.375vw 1.25vw rgba(0, 0, 0, 0.4)"
                                : "0 0.375vw 1.25vw rgba(0, 180, 255, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                            if (isPortrait) return;
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = isDark
                                ? "0 0.25vw 0.9375vw rgba(0, 0, 0, 0.3)"
                                : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)";
                        }}
                        data-testid="confirm-widget-cancel-button"
                    >
                        {cancelText || t("cancel")}
                    </button>
                </div>
            </div>
        </div>
    );
}

const confirmWidgetStyle = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    width: isPortrait ? "90%" : "30%",
    aspectRatio: isPortrait ? undefined : 2 / 1.3,
    minHeight: isPortrait ? "40vh" : undefined,
    display: "flex",
    position: "relative",
    borderRadius: isPortrait ? "2vw" : "0.73vw",
    background: isDark ? "rgb(236, 235, 235)" : "#eeeeee",
    boxShadow: isDark
        ? isPortrait ? "0 0 2.5vw 0 rgba(0, 0, 0, 0.3)" : "0 0 0.625vw 0 rgba(0, 0, 0, 0.3)"
        : isPortrait ? "0 0 2.5vw 0 rgba(0, 0, 0, 0.1)" : "0 0 0.625vw 0 rgba(0, 0, 0, 0.1)",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: isPortrait ? "4vw" : "1.5vw",
    boxSizing: "border-box",
});

const titleStyleInner = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    position: "absolute",
    top: isPortrait ? "3vw" : "2%",
    left: isPortrait ? "3vw" : "2%",
    fontSize: isPortrait ? "4.5vw" : "0.9vw",
    fontWeight: "bold",
    color: isDark ? "rgb(104, 95, 95)" : "rgba(0, 0, 0, 1)",
});

const messageStyleInner = (isPortrait: boolean): React.CSSProperties => ({
    fontSize: isPortrait ? "3.5vw" : "1vw",
    maxWidth: "80%",
    textAlign: "left",
    overflowWrap: "break-word",
    color: "#333",
});

const confirmButtonStyleInner = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    position: isPortrait ? "relative" : "absolute",
    width: isPortrait ? "40%" : "20%",
    bottom: isPortrait ? undefined : "6%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    right: isPortrait ? undefined : "8%",
    marginTop: isPortrait ? "3vw" : undefined,
    marginLeft: isPortrait ? "auto" : undefined,
    marginRight: isPortrait ? "auto" : undefined,
    background: "rgb(87, 152, 236)",
    color: "rgba(0, 0, 0, 1)",
    border: "none",
    borderRadius: isPortrait ? "2vw" : "0.73vw",
    padding: isPortrait ? "3vw 6vw" : "0.75vw 1.5vw",
    fontSize: isPortrait ? "3.5vw" : "0.9vw",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isDark
        ? isPortrait ? "0 1vw 3.75vw rgba(0, 0, 0, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 0, 0, 0.3)"
        : isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)",
});

const cancelButtonStyleInner = (isDark: boolean, isPortrait: boolean): React.CSSProperties => ({
    width: isPortrait ? "40%" : "20%",
    bottom: isPortrait ? undefined : "6%",
    left: isPortrait ? undefined : "8%",
    position: isPortrait ? "relative" : "absolute",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: isPortrait ? "2vw" : undefined,
    marginLeft: isPortrait ? "auto" : undefined,
    marginRight: isPortrait ? "auto" : undefined,
    background: "rgb(233, 231, 231)",
    color: "rgb(104, 95, 95)",
    border: "none",
    borderRadius: isPortrait ? "2vw" : "0.73vw",
    padding: isPortrait ? "3vw 6vw" : "0.75vw 1.5vw",
    fontSize: isPortrait ? "3.5vw" : "0.9vw",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: isDark
        ? isPortrait ? "0 1vw 3.75vw rgba(0, 0, 0, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 0, 0, 0.3)"
        : isPortrait ? "0 1vw 3.75vw rgba(0, 180, 255, 0.3)" : "0 0.25vw 0.9375vw rgba(0, 180, 255, 0.3)",
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
