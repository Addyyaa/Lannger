import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  handleError,
  createAppError,
  ErrorType,
  ErrorSeverity,
} from "../utils/errorHandler";
import { useTranslation } from "react-i18next";
import { useTheme, useOrientation } from "../main";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 自定义错误页面 */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 全局错误边界组件
 * 捕获组件树中的错误，显示友好的错误页面
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误（注意：这里无法使用 useTranslation，因为这是类组件）
    // 错误消息会在 DefaultErrorPage 中通过 t() 函数显示
    handleError(
      createAppError(
        error.message,
        ErrorType.UNKNOWN,
        "Application error occurred, please refresh the page and try again",
        {
          severity: ErrorSeverity.CRITICAL,
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        }
      ),
      {
        errorBoundary: true,
        componentStack: errorInfo.componentStack,
      },
      false // 错误边界不显示额外的用户提示
    );

    // 调用自定义错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果有自定义错误页面，使用自定义页面
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 否则使用默认错误页面
      return (
        <DefaultErrorPage error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}

/**
 * 默认错误页面组件
 */
function DefaultErrorPage({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: isPortrait ? "5vw" : "2vw",
    background: isDark
      ? "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)"
      : "linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)",
    color: isDark ? "#fff" : "#333",
  };

  const cardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
    borderRadius: isPortrait ? "3vw" : "1vw",
    padding: isPortrait ? "6vw" : "3vw",
    maxWidth: isPortrait ? "90%" : "600px",
    width: "100%",
    boxShadow: isDark
      ? "0 2vw 8vw rgba(0, 0, 0, 0.5)"
      : "0 1vw 4vw rgba(0, 0, 0, 0.1)",
    border: isDark ? "0.3vw solid #444" : "0.1vw solid #e0e0e0",
    textAlign: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: isPortrait ? "6vw" : "2vw",
    fontWeight: "bold",
    color: "#ff4444",
    marginBottom: isPortrait ? "4vw" : "1.5vw",
  };

  const messageStyle: React.CSSProperties = {
    fontSize: isPortrait ? "4vw" : "1.2vw",
    color: isDark ? "#ccc" : "#666",
    marginBottom: isPortrait ? "5vw" : "2vw",
    lineHeight: 1.6,
  };

  const errorDetailStyle: React.CSSProperties = {
    fontSize: isPortrait ? "3vw" : "0.9vw",
    color: isDark ? "#888" : "#999",
    marginTop: isPortrait ? "4vw" : "1.5vw",
    padding: isPortrait ? "3vw" : "1.5vw",
    background: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.05)",
    borderRadius: isPortrait ? "2vw" : "0.5vw",
    textAlign: "left",
    fontFamily: "monospace",
    maxHeight: isPortrait ? "30vh" : "200px",
    overflow: "auto",
    wordBreak: "break-word",
  };

  const buttonStyle: React.CSSProperties = {
    padding: isPortrait ? "3vw 6vw" : "1vw 2vw",
    fontSize: isPortrait ? "4vw" : "1.2vw",
    backgroundColor: "#00b4ff",
    color: "#fff",
    border: "none",
    borderRadius: isPortrait ? "2vw" : "0.5vw",
    cursor: "pointer",
    fontWeight: "500",
    marginTop: isPortrait ? "4vw" : "1.5vw",
    transition: "all 0.3s ease",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>⚠️ {t("error") || "出错了"}</div>
        <div style={messageStyle}>
          {t("errorBoundaryMessage") ||
            "应用遇到了一个错误。我们已经记录了这个问题，请尝试刷新页面。"}
        </div>

        {process.env.NODE_ENV === "development" && error && (
          <details style={errorDetailStyle}>
            <summary style={{ cursor: "pointer", marginBottom: "1vw" }}>
              {t("errorDetails") || "错误详情（开发模式）"}
            </summary>
            <div>
              <strong>{t("errorMessage") || "错误信息"}：</strong>
              {error.message}
            </div>
            {error.stack && (
              <div style={{ marginTop: "1vw" }}>
                <strong>{t("stackTrace") || "堆栈跟踪"}：</strong>
                <pre style={{ whiteSpace: "pre-wrap", margin: "1vw 0" }}>
                  {error.stack}
                </pre>
              </div>
            )}
          </details>
        )}

        <button
          style={buttonStyle}
          onClick={() => {
            onReset();
            window.location.reload();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0096d4";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#00b4ff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {t("refreshPage") || "刷新页面"}
        </button>
      </div>
    </div>
  );
}
