/**
 * 权重计算 Web Worker
 * 将权重计算逻辑迁移到 Worker 线程，避免阻塞主线程
 */

import { WordProgress } from "../db";

/**
 * Worker 消息类型
 */
export interface WeightCalculatorMessage {
  type: "calculateWeights";
  data: {
    progresses: WordProgress[];
    mode: "flashcard" | "test" | "review";
  };
}

export interface WeightCalculatorResponse {
  type: "weightsCalculated";
  data: {
    weights: Array<{
      wordId: number;
      weight: number;
      reasons: string[];
    }>;
  };
}

/**
 * 计算单词的掌握程度（0-1，0 表示未掌握，1 表示完全掌握）
 */
function calculateMastery(progress: WordProgress): number {
  const {
    timesSeen,
    timesCorrect,
    correctStreak,
    wrongStreak,
    repetitions,
    averageResponseTime,
    fastResponseCount,
    slowResponseCount,
  } = progress;

  // 如果从未见过，掌握程度为 0
  if (timesSeen === 0) {
    return 0;
  }

  // 基础掌握度：答对率
  const accuracy = timesCorrect / timesSeen;

  // 连续答对加分，连续答错减分
  const streakBonus = correctStreak * 0.1;
  const streakPenalty = wrongStreak * 0.15;

  // 重复次数加分（表示已经复习过多次）
  const repetitionBonus = Math.min(repetitions * 0.1, 0.3);

  // 答题速度因素
  let speedBonus = 0;
  if (timesSeen > 0) {
    // 快速答题比例（< 3秒）
    const fastRatio = (fastResponseCount || 0) / timesSeen;
    // 慢速答题比例（> 10秒）
    const slowRatio = (slowResponseCount || 0) / timesSeen;

    // 快速答题多，掌握程度加分
    speedBonus = fastRatio * 0.15;
    // 慢速答题多，掌握程度减分
    speedBonus -= slowRatio * 0.1;

    // 如果有平均答题时间，也考虑进去
    if (averageResponseTime !== undefined) {
      // 平均答题时间越短，掌握程度越高
      // 3秒以内为满分，10秒以上为0分
      const FAST_THRESHOLD = 3000;
      const SLOW_THRESHOLD = 10000;
      if (averageResponseTime <= FAST_THRESHOLD) {
        speedBonus += 0.1;
      } else if (averageResponseTime >= SLOW_THRESHOLD) {
        speedBonus -= 0.1;
      } else {
        // 线性插值
        const speedScore =
          1 -
          (averageResponseTime - FAST_THRESHOLD) /
            (SLOW_THRESHOLD - FAST_THRESHOLD);
        speedBonus += speedScore * 0.1;
      }
    }
  }

  // 综合计算
  let mastery =
    accuracy * 0.5 + streakBonus - streakPenalty + repetitionBonus + speedBonus;

  // 如果连续答错多次，掌握程度降低
  if (wrongStreak >= 3) {
    mastery *= 0.5;
  }

  return Math.max(0, Math.min(1, mastery));
}

/**
 * 计算答题速度权重（答题速度慢的单词需要更多练习）
 */
function calculateSpeedWeight(progress: WordProgress): number {
  const {
    averageResponseTime,
    fastResponseCount,
    slowResponseCount,
    timesSeen,
  } = progress;

  if (timesSeen === 0 || averageResponseTime === undefined) {
    return 0.5; // 没有数据，返回中等权重
  }

  // 快速答题阈值（3秒）和慢速答题阈值（10秒）
  const FAST_THRESHOLD = 3000;
  const SLOW_THRESHOLD = 10000;

  // 如果平均答题时间很慢，权重高
  if (averageResponseTime >= SLOW_THRESHOLD) {
    return 1.0;
  }

  // 如果平均答题时间很快，权重低
  if (averageResponseTime <= FAST_THRESHOLD) {
    return 0.2;
  }

  // 线性插值
  const speedWeight =
    (averageResponseTime - FAST_THRESHOLD) / (SLOW_THRESHOLD - FAST_THRESHOLD);

  // 考虑快速和慢速答题的比例
  if (timesSeen > 0) {
    const fastRatio = (fastResponseCount || 0) / timesSeen;
    const slowRatio = (slowResponseCount || 0) / timesSeen;

    // 如果慢速答题比例高，增加权重
    if (slowRatio > 0.5) {
      return Math.min(1.0, speedWeight + 0.3);
    }
    // 如果快速答题比例高，降低权重
    if (fastRatio > 0.5) {
      return Math.max(0.1, speedWeight - 0.2);
    }
  }

  return Math.max(0.1, Math.min(1.0, speedWeight));
}

/**
 * 计算单词的难度权重（难度越高，权重越高，需要更多练习）
 */
function calculateDifficultyWeight(progress: WordProgress): number {
  const { difficulty, timesSeen, timesCorrect } = progress;

  // 如果没有设置难度，默认为中等难度
  const baseDifficulty = difficulty ?? 3;

  // 基础难度权重（1-5 映射到 0.2-1.0）
  let weight = baseDifficulty / 5;

  // 如果见过但答错率高，增加权重
  if (timesSeen > 0) {
    const errorRate = 1 - timesCorrect / timesSeen;
    weight += errorRate * 0.3;
  }

  return Math.min(1.0, weight);
}

/**
 * 计算紧急程度（用于复习模式）
 */
function calculateUrgency(progress: WordProgress): number {
  const { nextReviewAt } = progress;

  if (!nextReviewAt) {
    return 1.0; // 没有设置下次复习时间，最紧急
  }

  const now = Date.now();
  const nextReviewTime = new Date(nextReviewAt).getTime();
  const timeUntilReview = nextReviewTime - now;

  // 如果已经到期，紧急程度为 1.0
  if (timeUntilReview <= 0) {
    return 1.0;
  }

  // 距离到期时间越近，紧急程度越高
  // 24小时内到期，紧急程度为 1.0
  // 7天内到期，紧急程度为 0.5
  // 超过7天，紧急程度为 0.1
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;

  if (timeUntilReview <= ONE_DAY) {
    return 1.0;
  } else if (timeUntilReview <= SEVEN_DAYS) {
    return (
      0.5 + (0.5 * (SEVEN_DAYS - timeUntilReview)) / (SEVEN_DAYS - ONE_DAY)
    );
  } else {
    return 0.1;
  }
}

/**
 * 判断是否到期需要复习
 */
function isDueForReview(progress: WordProgress): boolean {
  const { nextReviewAt } = progress;
  if (!nextReviewAt) {
    return true; // 没有设置下次复习时间，视为到期
  }

  const now = Date.now();
  const nextReviewTime = new Date(nextReviewAt).getTime();
  return nextReviewTime <= now;
}

/**
 * 计算单词的综合权重（用于排序）
 */
function calculateWordWeight(
  progress: WordProgress,
  mode: "flashcard" | "test" | "review"
): { wordId: number; weight: number; reasons: string[] } {
  const reasons: string[] = [];
  let weight = 0;

  // 掌握程度（掌握程度低的需要更多练习）
  // 在复习模式下，掌握度是最重要的因素，掌握度越低权重越高
  const mastery = calculateMastery(progress);

  if (mode === "review") {
    // 复习模式：掌握度权重更高，且使用非线性函数让掌握度低的单词权重更高
    // 掌握度 0 -> 权重 1.0，掌握度 0.5 -> 权重 0.5，掌握度 1.0 -> 权重 0
    // 使用平方函数让掌握度低的单词权重更高
    const masteryWeight = (1 - mastery) * (1 - mastery) * 0.6; // 平方函数，掌握度越低权重越高
    weight += masteryWeight;
    reasons.push(
      `掌握程度: ${mastery.toFixed(2)} (权重: ${masteryWeight.toFixed(2)})`
    );

    // 紧急程度（复习模式次要因素）
    const urgency = calculateUrgency(progress);
    weight += urgency * 0.3;
    reasons.push(`紧急程度: ${urgency.toFixed(2)}`);

    // 是否到期（复习模式）
    const due = isDueForReview(progress);
    if (due) {
      weight += 0.2;
      reasons.push("已到期");
    }
  } else {
    // 其他模式：使用线性函数
    const masteryWeight = (1 - mastery) * 0.4;
    weight += masteryWeight;
    reasons.push(
      `掌握程度: ${mastery.toFixed(2)} (权重: ${masteryWeight.toFixed(2)})`
    );
  }

  // 难度权重（难度高的需要更多练习）
  const difficultyWeight = calculateDifficultyWeight(progress) * 0.2;
  weight += difficultyWeight;
  reasons.push(`难度权重: ${difficultyWeight.toFixed(2)}`);

  // 答题速度权重（答题速度慢的需要更多练习）
  const speedWeight = calculateSpeedWeight(progress) * 0.15;
  weight += speedWeight;
  if (progress.averageResponseTime !== undefined) {
    const seconds = (progress.averageResponseTime / 1000).toFixed(1);
    reasons.push(`答题速度: ${seconds}秒 (权重: ${speedWeight.toFixed(2)})`);
  }

  // 连续答错次数（需要重点关注）
  if (progress.wrongStreak > 0) {
    const wrongStreakWeight = Math.min(progress.wrongStreak * 0.1, 0.3);
    weight += wrongStreakWeight;
    reasons.push(`连续答错 ${progress.wrongStreak} 次`);
  }

  // 从未见过的单词（新单词优先）- 但复习模式不应该有新单词
  if (progress.timesSeen === 0 && mode !== "review") {
    weight += 0.2;
    reasons.push("新单词");
  }

  // 模式特定调整
  if (mode === "flashcard") {
    // 闪卡模式：优先显示掌握程度低的和新单词
    if (mastery < 0.5) {
      weight += 0.15;
      reasons.push("闪卡模式：掌握程度低");
    }
  } else if (mode === "review") {
    // 复习模式：掌握度低的单词额外加权，让它们出现频率更高
    if (mastery < 0.3) {
      weight += 0.25; // 掌握度很低，额外加权
      reasons.push("复习模式：掌握度很低");
    } else if (mastery < 0.5) {
      weight += 0.15; // 掌握度较低，额外加权
      reasons.push("复习模式：掌握度较低");
    }
  } else if (mode === "test") {
    // 测试模式：根据掌握程度智能选择
    // 优先测试掌握程度中等的单词（0.2-0.8），这些单词最需要巩固
    if (mastery >= 0.2 && mastery <= 0.8) {
      // 掌握程度越接近 0.5（中等），权重越高
      const distanceFromMiddle = Math.abs(mastery - 0.5);
      const middleWeight = (1 - distanceFromMiddle * 2) * 0.2; // 0.5 时权重最高
      weight += middleWeight;
      reasons.push(
        `测试模式：中等掌握程度 (${mastery.toFixed(
          2
        )}, 权重: ${middleWeight.toFixed(2)})`
      );
    }

    // 掌握程度低的单词（0-0.3）也需要加强练习
    if (mastery < 0.3) {
      const lowMasteryWeight = (0.3 - mastery) * 0.3; // 掌握程度越低，权重越高
      weight += lowMasteryWeight;
      reasons.push(
        `测试模式：掌握程度低 (${mastery.toFixed(
          2
        )}, 权重: ${lowMasteryWeight.toFixed(2)})`
      );
    }

    // 掌握程度较高的单词（0.7-0.9）也需要偶尔测试，但权重较低
    if (mastery >= 0.7 && mastery <= 0.9) {
      const highMasteryWeight = (0.9 - mastery) * 0.1; // 掌握程度越高，权重越低
      weight += highMasteryWeight;
      reasons.push(
        `测试模式：掌握程度较高 (${mastery.toFixed(
          2
        )}, 权重: ${highMasteryWeight.toFixed(2)})`
      );
    }

    // 高难度单词额外加权
    if (progress.difficulty && progress.difficulty >= 4) {
      weight += 0.1;
      reasons.push("测试模式：高难度");
    }

    // 连续答错的单词需要重点关注
    if (progress.wrongStreak >= 2) {
      weight += 0.15;
      reasons.push(`测试模式：连续答错 ${progress.wrongStreak} 次`);
    }
  }

  return {
    wordId: progress.wordId,
    weight: Math.max(0, weight),
    reasons,
  };
}

// Worker 消息处理
self.addEventListener(
  "message",
  (event: MessageEvent<WeightCalculatorMessage>) => {
    const { type, data } = event.data;

    if (type === "calculateWeights") {
      const { progresses, mode } = data;

      // 计算每个单词的权重
      const weights = progresses.map((progress) =>
        calculateWordWeight(progress, mode)
      );

      // 按权重降序排序
      weights.sort((a, b) => b.weight - a.weight);

      // 发送结果
      const response: WeightCalculatorResponse = {
        type: "weightsCalculated",
        data: { weights },
      };

      self.postMessage(response);
    }
  }
);
