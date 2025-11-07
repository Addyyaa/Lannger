import { WordProgress } from "../db";

/**
 * SM-2 间隔重复算法的评分等级
 * 0: 完全忘记，需要重新学习
 * 1: 错误，但看到答案后能想起
 * 2: 困难，需要思考
 * 3: 正确，但需要一些努力
 * 4: 正确，很容易
 * 5: 完全掌握
 */
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 根据答题速度调整评分
 * 答题速度快表示掌握程度高，可以适当提高评分
 * 答题速度慢表示需要思考，可能需要降低评分
 * 
 * @param baseGrade 基础评分（0-5）
 * @param responseTime 答题时间（毫秒）
 * @returns 调整后的评分
 */
export function adjustGradeBySpeed(baseGrade: Grade, responseTime?: number): Grade {
    if (responseTime === undefined || responseTime <= 0) {
        return baseGrade;
    }

    // 快速答题阈值（3秒）和慢速答题阈值（10秒）
    const FAST_THRESHOLD = 3000;
    const SLOW_THRESHOLD = 10000;

    // 如果答对了且答题速度快，可以提高评分
    if (baseGrade >= 3) {
        if (responseTime <= FAST_THRESHOLD) {
            // 快速答对，可以提高 1 级（最高到 5）
            return Math.min(5, baseGrade + 1) as Grade;
        } else if (responseTime >= SLOW_THRESHOLD) {
            // 慢速答对，可能降低 1 级（最低到 3）
            return Math.max(3, baseGrade - 1) as Grade;
        }
    }
    // 如果答错了且答题速度慢，可能降低评分
    else if (baseGrade < 3) {
        if (responseTime >= SLOW_THRESHOLD) {
            // 慢速答错，可能降低 1 级（最低到 0）
            return Math.max(0, baseGrade - 1) as Grade;
        }
    }

    return baseGrade;
}

/**
 * SM-2 间隔重复算法的计算结果
 */
export interface SM2Result {
    easeFactor: number; // 新的易度因子
    intervalDays: number; // 新的间隔天数
    repetitions: number; // 新的重复次数
}

/**
 * SM-2 间隔重复算法核心实现
 * 基于 SuperMemo 2 算法，根据评分调整复习间隔
 * 
 * @param currentProgress 当前单词进度
 * @param grade 本次评分（0-5）
 * @returns 计算后的新进度参数
 */
export function calculateSM2(
    currentProgress: WordProgress,
    grade: Grade
): SM2Result {
    let { easeFactor, intervalDays, repetitions } = currentProgress;

    // 如果评分小于 3，重置重复次数
    if (grade < 3) {
        repetitions = 0;
        // 如果评分是 0（完全忘记），重置间隔
        if (grade === 0) {
            intervalDays = 0;
        } else {
            // 评分 1-2，保持当前间隔或稍微减少
            intervalDays = Math.max(1, Math.floor(intervalDays * 0.5));
        }
    } else {
        // 评分 >= 3，增加重复次数
        repetitions += 1;

        // 根据重复次数计算间隔
        if (repetitions === 1) {
            intervalDays = 1; // 第一次复习：1天后
        } else if (repetitions === 2) {
            intervalDays = 6; // 第二次复习：6天后
        } else {
            // 第三次及以后：使用易度因子计算
            intervalDays = Math.round(intervalDays * easeFactor);
        }
    }

    // 更新易度因子（EF）
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    // 其中 q 是评分（0-5），但我们的评分是 0-5，需要转换为 0-5 的 q
    const q = grade;
    const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    easeFactor = Math.max(1.3, easeFactor + efDelta); // 易度因子最小值为 1.3

    return {
        easeFactor: Math.round(easeFactor * 100) / 100, // 保留两位小数
        intervalDays: Math.max(0, intervalDays),
        repetitions: Math.max(0, repetitions),
    };
}

/**
 * 计算下次复习时间
 * @param intervalDays 间隔天数
 * @returns ISO 格式的日期字符串
 */
export function calculateNextReviewDate(intervalDays: number): string {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalDays);
    return nextDate.toISOString();
}

/**
 * 检查单词是否到了复习时间
 * @param progress 单词进度
 * @returns 是否到了复习时间
 */
export function isDueForReview(progress: WordProgress): boolean {
    if (!progress.nextReviewAt) {
        return true; // 没有设置复习时间，视为需要复习
    }

    const now = new Date();
    const nextReview = new Date(progress.nextReviewAt);
    return now >= nextReview;
}

/**
 * 计算单词的紧急程度（距离复习时间越近，紧急程度越高）
 * @param progress 单词进度
 * @returns 紧急程度分数（0-1，1 表示最紧急）
 */
export function calculateUrgency(progress: WordProgress): number {
    if (!progress.nextReviewAt) {
        return 1.0; // 没有复习时间，最紧急
    }

    const now = new Date();
    const nextReview = new Date(progress.nextReviewAt);
    const diffMs = nextReview.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // 如果已经过期，紧急程度为 1
    if (diffDays <= 0) {
        return 1.0;
    }

    // 如果距离复习时间还有 7 天以上，紧急程度较低
    if (diffDays > 7) {
        return 0.1;
    }

    // 线性映射到 0.1-1.0
    return Math.max(0.1, 1.0 - diffDays / 7);
}

