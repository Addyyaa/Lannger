/**
 * 错误处理工具测试
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AppError,
  ErrorType,
  handleError,
  createAppError,
  getErrorLogs,
  clearErrorLogs,
  exportErrorLogs,
} from "../errorHandler";

describe("errorHandler", () => {
  beforeEach(() => {
    clearErrorLogs();
    vi.clearAllMocks();
  });

  describe("AppError", () => {
    it("应该创建应用错误", () => {
      const error = new AppError("测试错误", "TEST_ERROR", "用户友好的错误消息");

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("测试错误");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.userMessage).toBe("用户友好的错误消息");
      expect(error.timestamp).toBeDefined();
    });

    it("应该包含上下文信息", () => {
      const context = { userId: 123, operation: "test" };
      const error = new AppError("测试错误", "TEST_ERROR", undefined, context);

      expect(error.context).toEqual(context);
    });
  });

  describe("createAppError", () => {
    it("应该创建应用错误", () => {
      const error = createAppError(
        "测试错误",
        ErrorType.DATABASE,
        "数据库操作失败"
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorType.DATABASE);
      expect(error.userMessage).toBe("数据库操作失败");
    });
  });

  describe("handleError", () => {
    it("应该记录错误日志", () => {
      const error = new Error("测试错误");
      handleError(error, { operation: "test" }, false);

      const logs = getErrorLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].error).toBe(error);
    });

    it("应该识别数据库错误", () => {
      const error = new Error("Database connection failed");
      handleError(error, {}, false);

      const logs = getErrorLogs();
      expect(logs[0].type).toBe(ErrorType.DATABASE);
    });

    it("应该识别网络错误", () => {
      const error = new Error("Network request failed");
      handleError(error, {}, false);

      const logs = getErrorLogs();
      expect(logs[0].type).toBe(ErrorType.NETWORK);
    });

    it("应该识别验证错误", () => {
      const error = new Error("Invalid input validation");
      handleError(error, {}, false);

      const logs = getErrorLogs();
      expect(logs[0].type).toBe(ErrorType.VALIDATION);
    });

    it("应该限制日志数量", () => {
      // 添加超过最大数量的错误
      for (let i = 0; i < 150; i++) {
        handleError(new Error(`Error ${i}`), {}, false);
      }

      const logs = getErrorLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });
  });

  describe("getErrorLogs", () => {
    it("应该返回错误日志的副本", () => {
      handleError(new Error("测试1"), {}, false);
      handleError(new Error("测试2"), {}, false);

      const logs1 = getErrorLogs();
      const logs2 = getErrorLogs();

      expect(logs1).toEqual(logs2);
      expect(logs1).not.toBe(logs2); // 应该是不同的数组
    });
  });

  describe("clearErrorLogs", () => {
    it("应该清空错误日志", () => {
      handleError(new Error("测试1"), {}, false);
      handleError(new Error("测试2"), {}, false);

      expect(getErrorLogs().length).toBe(2);

      clearErrorLogs();

      expect(getErrorLogs().length).toBe(0);
    });
  });

  describe("exportErrorLogs", () => {
    it("应该导出错误日志为 JSON", () => {
      handleError(new Error("测试错误"), { test: "data" }, false);

      const exported = exportErrorLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });
});

