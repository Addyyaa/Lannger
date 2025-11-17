/**
 * 数据库操作包装工具测试
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  safeDbOperation,
  safeBatchDbOperation,
  safeTransaction,
} from "../dbWrapper";

// Mock errorHandler
vi.mock("../errorHandler", () => ({
  handleError: vi.fn(),
  createAppError: vi.fn((message: string) => {
    return new Error(message);
  }),
  ErrorType: {
    DATABASE: "DATABASE_ERROR",
  },
}));

describe("dbWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("safeDbOperation", () => {
    it("应该成功执行操作", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await safeDbOperation(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("应该在失败时重试", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("失败1"))
        .mockResolvedValueOnce("success");

      const options: DbOperationOptions = {
        retries: 1,
        retryDelay: 10,
      };

      const result = await safeDbOperation(operation, options);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("应该在重试次数用尽后抛出错误", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("总是失败"));

      const options: DbOperationOptions = {
        retries: 2,
        retryDelay: 10,
      };

      await expect(safeDbOperation(operation, options)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(3); // 初始 + 2次重试
    });

    it("应该在失败时返回默认值", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("失败"));

      const options: DbOperationOptions = {
        retries: 0,
        fallback: "default",
      };

      const result = await safeDbOperation(operation, options);

      expect(result).toBe("default");
    });

    it("应该传递上下文信息", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const options: DbOperationOptions = {
        context: { userId: 123, operation: "test" },
      };

      await safeDbOperation(operation, options);

      expect(operation).toHaveBeenCalled();
    });
  });

  describe("safeBatchDbOperation", () => {
    it("应该执行所有操作", async () => {
      const operations = [
        vi.fn().mockResolvedValue("result1"),
        vi.fn().mockResolvedValue("result2"),
        vi.fn().mockResolvedValue("result3"),
      ];

      const results = await safeBatchDbOperation(operations);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe("result1");
      expect(results[1].success).toBe(true);
      expect(results[1].result).toBe("result2");
      expect(results[2].success).toBe(true);
      expect(results[2].result).toBe("result3");
    });

    it("应该继续执行即使部分操作失败", async () => {
      const operations = [
        vi.fn().mockResolvedValue("result1"),
        vi.fn().mockRejectedValue(new Error("失败")),
        vi.fn().mockResolvedValue("result3"),
      ];

      const results = await safeBatchDbOperation(operations);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeInstanceOf(Error);
      expect(results[2].success).toBe(true);
    });

    it("应该处理所有操作都失败的情况", async () => {
      const operations = [
        vi.fn().mockRejectedValue(new Error("失败1")),
        vi.fn().mockRejectedValue(new Error("失败2")),
      ];

      const results = await safeBatchDbOperation(operations);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
    });
  });

  describe("safeTransaction", () => {
    it("应该执行事务操作", async () => {
      const transactionFn = vi.fn().mockResolvedValue("transaction result");

      const result = await safeTransaction(transactionFn);

      expect(result).toBe("transaction result");
      expect(transactionFn).toHaveBeenCalledTimes(1);
    });

    it("应该在事务失败时处理错误", async () => {
      const transactionFn = vi.fn().mockRejectedValue(new Error("事务失败"));

      await expect(safeTransaction(transactionFn)).rejects.toThrow();
    });

    it("应该传递上下文信息", async () => {
      const transactionFn = vi.fn().mockResolvedValue("success");

      const options: DbOperationOptions = {
        context: { transactionId: "123" },
      };

      await safeTransaction(transactionFn, options);

      expect(transactionFn).toHaveBeenCalled();
    });
  });
});

