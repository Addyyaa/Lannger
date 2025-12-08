/**
 * 权重计算 Worker 工具函数
 * 提供便捷的 API 来使用 Web Worker 进行权重计算
 */

import { WordProgress } from "../db";
import type {
  WeightCalculatorMessage,
  WeightCalculatorResponse,
} from "../workers/weightCalculator.worker";

/**
 * 权重计算结果
 */
export interface WeightResult {
  wordId: number;
  weight: number;
  reasons: string[];
}

let worker: Worker | null = null;

/**
 * 获取或创建 Worker 实例
 */
function getWorker(): Worker {
  if (!worker) {
    // 使用 Vite 的 worker 导入方式
    worker = new Worker(
      new URL("../workers/weightCalculator.worker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

/**
 * 使用 Web Worker 计算单词权重
 *
 * @param progresses 单词进度列表
 * @param mode 学习模式
 * @returns Promise<权重计算结果列表>
 */
export function calculateWeightsWithWorker(
  progresses: WordProgress[],
  mode: "flashcard" | "test" | "review"
): Promise<WeightResult[]> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();

    // 设置超时（30秒）
    const timeout = setTimeout(() => {
      reject(new Error("权重计算超时"));
    }, 30000);

    // 监听 Worker 响应
    const handleMessage = (event: MessageEvent<WeightCalculatorResponse>) => {
      const { type, data } = event.data;

      if (type === "weightsCalculated") {
        clearTimeout(timeout);
        worker.removeEventListener("message", handleMessage);
        resolve(data.weights);
      }
    };

    // 监听 Worker 错误
    const handleError = (error: ErrorEvent) => {
      clearTimeout(timeout);
      worker.removeEventListener("error", handleError);
      worker.removeEventListener("message", handleMessage);
      reject(new Error(`Worker 错误: ${error.message}`));
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    // 发送计算请求
    const message: WeightCalculatorMessage = {
      type: "calculateWeights",
      data: { progresses, mode },
    };

    worker.postMessage(message);
  });
}

/**
 * 对单词列表按权重排序（使用 Worker）
 *
 * @param progresses 单词进度列表
 * @param mode 学习模式
 * @param limit 返回的最大数量（可选）
 * @returns Promise<排序后的单词ID列表>
 */
export async function sortWordsByWeightWithWorker(
  progresses: WordProgress[],
  mode: "flashcard" | "test" | "review",
  limit?: number
): Promise<number[]> {
  // 如果进度列表为空，直接返回
  if (progresses.length === 0) {
    return [];
  }

  // 如果进度列表很小（少于 10 个），直接在主线程计算（避免 Worker 开销）
  if (progresses.length < 10) {
    // 回退到主线程计算
    const { sortWordsByWeight } = await import("../algorithm/weightCalculator");
    return sortWordsByWeight(progresses, mode, limit);
  }

  // 使用 Worker 计算权重
  const weights = await calculateWeightsWithWorker(progresses, mode);

  // 提取单词ID
  const wordIds = weights.map((w) => w.wordId);

  // 如果指定了限制，只返回前 N 个
  if (limit !== undefined && limit > 0) {
    return wordIds.slice(0, limit);
  }

  return wordIds;
}

/**
 * 清理 Worker 资源
 */
export function cleanupWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

