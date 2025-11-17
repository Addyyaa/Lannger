/**
 * 性能监控工具
 * 提供关键操作的性能监控和统计功能
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  name: string;
  duration: number; // 毫秒
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * 性能指标存储（内存中，生产环境可替换为持久化存储）
 */
const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS_SIZE = 200; // 最多保存 200 条性能指标

/**
 * 性能监控器类
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];

  /**
   * 开始性能监控
   */
  start(name: string): (context?: Record<string, unknown>) => PerformanceMetric {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // 返回结束函数
    return (context?: Record<string, unknown>) => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        duration,
        timestamp,
        context,
      };

      this.metrics.push(metric);
      performanceMetrics.push(metric);

      // 限制指标数量
      if (this.metrics.length > MAX_METRICS_SIZE) {
        this.metrics.shift();
      }
      if (performanceMetrics.length > MAX_METRICS_SIZE) {
        performanceMetrics.shift();
      }

      // 开发环境输出
      if (process.env.NODE_ENV === "development") {
        console.log(`[性能监控] ${name}: ${duration.toFixed(2)}ms`, context || "");
      }

      return metric;
    };
  }

  /**
   * 监控异步操作
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const end = this.start(name);
    try {
      const result = await operation();
      if (context) {
        end(context);
      } else {
        end();
      }
      return result;
    } catch (error) {
      end({
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 监控同步操作
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    context?: Record<string, unknown>
  ): T {
    const end = this.start(name);
    try {
      const result = operation();
      if (context) {
        end(context);
      } else {
        end();
      }
      return result;
    } catch (error) {
      end({
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * 获取平均耗时
   */
  getAverageDuration(name: string): number {
    const metrics = this.metrics.filter((m) => m.name === name);
    if (metrics.length === 0) {
      return 0;
    }
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * 清空指标
   */
  clear(): void {
    this.metrics.length = 0;
  }
}

// 创建全局性能监控器实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控装饰器（用于函数）
 */
export function measurePerformance(
  _operationName: string,
  context?: Record<string, unknown>
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    if (typeof originalMethod === "function") {
      descriptor.value = async function (...args: unknown[]) {
        return performanceMonitor.measure(
          `${target?.constructor?.name || ""}.${propertyKey}`,
          () => originalMethod.apply(this, args),
          { ...context, args: args.length }
        );
      };
    }

    return descriptor;
  };
}

/**
 * 获取所有性能指标
 */
export function getAllPerformanceMetrics(): PerformanceMetric[] {
  return [...performanceMetrics];
}

/**
 * 获取指定操作的性能指标
 */
export function getPerformanceMetrics(name: string): PerformanceMetric[] {
  return performanceMetrics.filter((m) => m.name === name);
}

/**
 * 获取性能统计报告
 */
export function getPerformanceReport(): {
  totalOperations: number;
  averageDuration: number;
  slowestOperations: PerformanceMetric[];
  fastestOperations: PerformanceMetric[];
  operationsByName: Record<string, { count: number; average: number }>;
} {
  const sorted = [...performanceMetrics].sort((a, b) => b.duration - a.duration);
  const slowest = sorted.slice(0, 10);
  const fastest = sorted.slice(-10).reverse();

  const byName: Record<string, { count: number; total: number }> = {};
  performanceMetrics.forEach((metric) => {
    if (!byName[metric.name]) {
      byName[metric.name] = { count: 0, total: 0 };
    }
    byName[metric.name].count++;
    byName[metric.name].total += metric.duration;
  });

  const operationsByName: Record<string, { count: number; average: number }> =
    {};
  Object.entries(byName).forEach(([name, data]) => {
    operationsByName[name] = {
      count: data.count,
      average: data.total / data.count,
    };
  });

  const totalDuration = performanceMetrics.reduce(
    (sum, m) => sum + m.duration,
    0
  );
  const averageDuration =
    performanceMetrics.length > 0
      ? totalDuration / performanceMetrics.length
      : 0;

  return {
    totalOperations: performanceMetrics.length,
    averageDuration,
    slowestOperations: slowest,
    fastestOperations: fastest,
    operationsByName,
  };
}

/**
 * 清空性能指标
 */
export function clearPerformanceMetrics(): void {
  performanceMetrics.length = 0;
}

/**
 * 导出性能指标（用于调试）
 */
export function exportPerformanceMetrics(): string {
  return JSON.stringify(getPerformanceReport(), null, 2);
}

