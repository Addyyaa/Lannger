import { WordProgress } from "../db";
import { calculateUrgency, isDueForReview } from "./spacedRepetition";

/**
 * 单词权重计算结果
 */
export interface WordWeight {
    wordId: number;
    weight: number; // 权重值，越高越优先
    reasons: string[]; // 权重计算的原因（用于调试）
}

/**
 * 计算单词的掌握程度（0-1，0 表示未掌握，1 表示完全掌握）
 * 现在考虑了答题速度因素
 */
export function calculateMastery(progress: WordProgress): number {
    const { timesSeen, timesCorrect, correctStreak, wrongStreak, repetitions, averageResponseTime, fastResponseCount, slowResponseCount } = progress;

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
                const speedScore = 1 - (averageResponseTime - FAST_THRESHOLD) / (SLOW_THRESHOLD - FAST_THRESHOLD);
                speedBonus += speedScore * 0.1;
            }
        }
    }

    // 综合计算
    let mastery = accuracy * 0.5 + streakBonus - streakPenalty + repetitionBonus + speedBonus;

    // 如果连续答错多次，掌握程度降低
    if (wrongStreak >= 3) {
        mastery *= 0.5;
    }

    return Math.max(0, Math.min(1, mastery));
}

/**
 * 计算答题速度权重（答题速度慢的单词需要更多练习）
 * 
 * @param progress 单词进度
 * @returns 速度权重（0-1，越高表示需要更多练习）
 */
export function calculateSpeedWeight(progress: WordProgress): number {
    const { averageResponseTime, fastResponseCount, slowResponseCount, timesSeen } = progress;

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
    const speedWeight = (averageResponseTime - FAST_THRESHOLD) / (SLOW_THRESHOLD - FAST_THRESHOLD);

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
export function calculateDifficultyWeight(progress: WordProgress): number {
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
 * 计算单词的综合权重（用于排序）
 * 
 * @param progress 单词进度
 * @param mode 学习模式（不同模式使用不同的权重策略）
 * @returns 权重值
 */
export function calculateWordWeight(
    progress: WordProgress,
    mode: "flashcard" | "test" | "review"
): WordWeight {
    const reasons: string[] = [];
    let weight = 0;

    // 基础权重：紧急程度（复习模式最重要）
    const urgency = calculateUrgency(progress);
    if (mode === "review") {
        weight += urgency * 0.5;
        reasons.push(`紧急程度: ${urgency.toFixed(2)}`);
    }

    // 是否到期（复习模式）
    const due = isDueForReview(progress);
    if (due) {
        weight += 0.3;
        reasons.push("已到期");
    }

    // 掌握程度（掌握程度低的需要更多练习）
    const mastery = calculateMastery(progress);
    const masteryWeight = (1 - mastery) * 0.4;
    weight += masteryWeight;
    reasons.push(`掌握程度: ${mastery.toFixed(2)} (权重: ${masteryWeight.toFixed(2)})`);

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

    // 从未见过的单词（新单词优先）
    if (progress.timesSeen === 0) {
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
    } else if (mode === "test") {
        // 测试模式：优先测试难度高的和掌握程度中等的
        if (progress.difficulty && progress.difficulty >= 4) {
            weight += 0.1;
            reasons.push("测试模式：高难度");
        }
        if (mastery >= 0.3 && mastery <= 0.7) {
            weight += 0.1;
            reasons.push("测试模式：中等掌握程度");
        }
    }

    return {
        wordId: progress.wordId,
        weight: Math.max(0, weight),
        reasons,
    };
}

/**
 * 对单词列表按权重排序
 * 
 * @param progresses 单词进度列表
 * @param mode 学习模式
 * @param limit 返回的最大数量（可选）
 * @returns 排序后的单词ID列表
 */
export function sortWordsByWeight(
    progresses: WordProgress[],
    mode: "flashcard" | "test" | "review",
    limit?: number
): number[] {
    // 计算每个单词的权重
    const weights = progresses.map((progress) => calculateWordWeight(progress, mode));

    // 按权重降序排序
    weights.sort((a, b) => b.weight - a.weight);

    // 提取单词ID
    const wordIds = weights.map((w) => w.wordId);

    // 如果指定了限制，只返回前 N 个
    if (limit !== undefined && limit > 0) {
        return wordIds.slice(0, limit);
    }

    return wordIds;
}

