/**
 * 性能监控工具测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  performanceMonitor,
  getAllPerformanceMetrics,
  getPerformanceReport,
  clearPerformanceMetrics,
  exportPerformanceMetrics,
} from "../performanceMonitor";

describe("performanceMonitor", () => {
  beforeEach(() => {
    clearPerformanceMetrics();
  });

  describe("start and measure", () => {
    it("应该记录性能指标", async () => {
      const end = performanceMonitor.start("test-operation");
      await new Promise((resolve) => setTimeout(resolve, 10));
      end();

      const metrics = getAllPerformanceMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe("test-operation");
      expect(metrics[0].duration).toBeGreaterThan(0);
    });

    it("应该记录异步操作的性能", async () => {
      await performanceMonitor.measure("async-operation", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "result";
      });

      const metrics = getAllPerformanceMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe("async-operation");
    });

    it("应该记录同步操作的性能", () => {
      performanceMonitor.measureSync("sync-operation", () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      const metrics = getAllPerformanceMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe("sync-operation");
    });

    it("应该在操作失败时也记录性能", async () => {
      try {
        await performanceMonitor.measure("failing-operation", async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Test error");
        });
      } catch {
        // 忽略错误
      }

      const metrics = getAllPerformanceMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe("failing-operation");
    });
  });

  describe("getPerformanceReport", () => {
    it("应该生成性能报告", async () => {
      await performanceMonitor.measure("op1", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      await performanceMonitor.measure("op2", async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const report = getPerformanceReport();
      expect(report.totalOperations).toBe(2);
      expect(report.averageDuration).toBeGreaterThan(0);
      expect(report.slowestOperations.length).toBeGreaterThan(0);
      expect(report.fastestOperations.length).toBeGreaterThan(0);
      expect(report.operationsByName).toHaveProperty("op1");
      expect(report.operationsByName).toHaveProperty("op2");
    });

    it("应该正确计算平均耗时", async () => {
      await performanceMonitor.measure("test-op", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      await performanceMonitor.measure("test-op", async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const report = getPerformanceReport();
      const avg = report.operationsByName["test-op"]?.average || 0;
      expect(avg).toBeGreaterThan(0);
      expect(avg).toBeLessThan(50); // 应该小于 50ms（考虑误差）
    });
  });

  describe("clearPerformanceMetrics", () => {
    it("应该清空所有性能指标", async () => {
      await performanceMonitor.measure("test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(getAllPerformanceMetrics().length).toBe(1);

      clearPerformanceMetrics();

      expect(getAllPerformanceMetrics().length).toBe(0);
    });
  });

  describe("exportPerformanceMetrics", () => {
    it("应该导出 JSON 格式的性能报告", async () => {
      await performanceMonitor.measure("test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const exported = exportPerformanceMetrics();
      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty("totalOperations");
      expect(parsed).toHaveProperty("averageDuration");
    });
  });

  describe("metrics limit", () => {
    it("应该限制指标数量", async () => {
      // 创建超过限制的指标（MAX_METRICS_SIZE = 200）
      for (let i = 0; i < 250; i++) {
        await performanceMonitor.measure(`operation-${i}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
        });
      }

      const metrics = getAllPerformanceMetrics();
      expect(metrics.length).toBeLessThanOrEqual(200);
    });
  });
});

