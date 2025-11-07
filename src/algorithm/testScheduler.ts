import { db, WordProgress, ensureDBOpen } from "../db";
import { sortWordsByWeight, calculateMastery } from "./weightCalculator";
import { ensureWordProgressExists } from "./progressUpdater";

/**
 * 测试模式调度选项
 */
export interface TestSchedulerOptions {
    wordSetId?: number; // 单词集ID
    limit?: number; // 返回的最大单词数量
    difficultyRange?: [number, number]; // 难度范围 [min, max]，1-5
    masteryRange?: [number, number]; // 掌握程度范围 [min, max]，0-1
    excludeTooEasy?: boolean; // 是否排除太简单的单词
    excludeTooHard?: boolean; // 是否排除太难的单词
}

/**
 * 测试模式调度结果
 */
export interface TestSchedulerResult {
    wordIds: number[]; // 排序后的单词ID列表
    totalAvailable: number; // 可用的单词总数
    averageDifficulty: number; // 平均难度
    averageMastery: number; // 平均掌握程度
}

/**
 * 测试模式调度算法
 * 
 * 策略：
 * 1. 优先测试掌握程度中等的单词（0.3-0.7）
 * 2. 优先测试难度较高的单词（难度 4-5）
 * 3. 根据用户的答题情况动态调整测试顺序
 * 4. 避免测试太简单或太难的单词（除非用户指定）
 * 
 * @param options 调度选项
 * @returns 调度结果
 */
export async function scheduleTestWords(
    options: TestSchedulerOptions = {}
): Promise<TestSchedulerResult> {
    const {
        wordSetId,
        limit = 30,
        difficultyRange = [1, 5],
        masteryRange = [0, 1],
        excludeTooEasy = true,
        excludeTooHard = false,
    } = options;

    // 确保数据库已打开
    await ensureDBOpen();

    // 获取单词列表
    let wordIds: number[];
    if (wordSetId !== undefined) {
        const words = await db.words.where("setId").equals(wordSetId).toArray();
        wordIds = words.map((w) => w.id);
    } else {
        const words = await db.words.toArray();
        wordIds = words.map((w) => w.id);
    }

    // 确保所有单词都有进度记录
    const progresses: WordProgress[] = [];
    let totalDifficulty = 0;
    let totalMastery = 0;

    for (const wordId of wordIds) {
        const progress = await ensureWordProgressExists(wordId);
        if (!progress) continue;

        const mastery = calculateMastery(progress);
        const difficulty = progress.difficulty ?? 3; // 默认中等难度

        // 难度过滤
        if (difficulty < difficultyRange[0] || difficulty > difficultyRange[1]) {
            continue;
        }

        // 掌握程度过滤
        if (mastery < masteryRange[0] || mastery > masteryRange[1]) {
            continue;
        }

        // 排除太简单的单词（掌握程度 > 0.9 且见过多次）
        if (excludeTooEasy && mastery > 0.9 && progress.timesSeen > 10) {
            continue;
        }

        // 排除太难的单词（掌握程度 < 0.1 且连续答错多次）
        if (excludeTooHard && mastery < 0.1 && progress.wrongStreak >= 5) {
            continue;
        }

        progresses.push(progress);
        totalDifficulty += difficulty;
        totalMastery += mastery;
    }

    // 使用权重算法排序（测试模式）
    const sortedWordIds = sortWordsByWeight(progresses, "test", limit);

    // 计算平均值
    const averageDifficulty = progresses.length > 0
        ? totalDifficulty / progresses.length
        : 0;
    const averageMastery = progresses.length > 0
        ? totalMastery / progresses.length
        : 0;

    return {
        wordIds: sortedWordIds,
        totalAvailable: progresses.length,
        averageDifficulty: Math.round(averageDifficulty * 100) / 100,
        averageMastery: Math.round(averageMastery * 100) / 100,
    };
}

/**
 * 获取下一个要测试的单词
 * 
 * @param currentWordId 当前单词ID（可选）
 * @param options 调度选项
 * @returns 下一个单词ID，如果没有则返回 null
 */
export async function getNextTestWord(
    currentWordId?: number,
    options: TestSchedulerOptions = {}
): Promise<number | null> {
    const result = await scheduleTestWords(options);

    if (result.wordIds.length === 0) {
        return null;
    }

    // 如果指定了当前单词，返回下一个
    if (currentWordId !== undefined) {
        const currentIndex = result.wordIds.indexOf(currentWordId);
        if (currentIndex >= 0 && currentIndex < result.wordIds.length - 1) {
            return result.wordIds[currentIndex + 1];
        }
    }

    // 返回第一个单词
    return result.wordIds[0];
}

/**
 * 根据测试结果调整单词的测试优先级
 * 
 * @param wordId 单词ID
 * @param isCorrect 是否答对
 * @param difficultyAdjustment 难度调整（-1 到 1，负数表示降低难度，正数表示提高难度）
 */
export async function adjustTestPriority(
    wordId: number,
    isCorrect: boolean,
    difficultyAdjustment: number = 0
): Promise<void> {
    const progress = await ensureWordProgressExists(wordId);
    if (!progress) return;

    // 根据答题结果调整易度因子
    // 如果答错，降低易度因子（增加难度）
    // 如果答对，提高易度因子（降低难度）
    if (isCorrect) {
        progress.easeFactor = Math.min(2.5, progress.easeFactor + 0.1 + difficultyAdjustment * 0.1);
    } else {
        progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.2 - Math.abs(difficultyAdjustment) * 0.1);
    }

    progress.updatedAt = new Date().toISOString();
    await db.wordProgress.put(progress);
}

