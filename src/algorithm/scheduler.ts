import { StudyMode } from "../db";
import {
    scheduleFlashcardWords,
    FlashcardSchedulerOptions,
    FlashcardSchedulerResult,
    getNextFlashcardWord,
} from "./flashcardScheduler";
import {
    scheduleTestWords,
    TestSchedulerOptions,
    TestSchedulerResult,
    getNextTestWord,
} from "./testScheduler";
import {
    scheduleReviewWords,
    ReviewSchedulerOptions,
    ReviewSchedulerResult,
    getNextReviewWord,
    getReviewStatistics,
} from "./reviewScheduler";

/**
 * 统一调度选项（包含所有模式的选项）
 */
export interface SchedulerOptions {
    mode: StudyMode;
    wordSetId?: number;
    limit?: number;
    // 闪卡模式选项
    flashcard?: Omit<FlashcardSchedulerOptions, "wordSetId" | "limit">;
    // 测试模式选项
    test?: Omit<TestSchedulerOptions, "wordSetId" | "limit">;
    // 复习模式选项
    review?: Omit<ReviewSchedulerOptions, "wordSetId" | "limit">;
}

/**
 * 统一调度结果
 */
export type SchedulerResult =
    | FlashcardSchedulerResult
    | TestSchedulerResult
    | ReviewSchedulerResult;

/**
 * 统一调度接口
 * 根据学习模式调用对应的调度算法
 * 
 * @param options 调度选项
 * @returns 调度结果
 */
export async function scheduleWords(
    options: SchedulerOptions
): Promise<SchedulerResult> {
    const { mode, wordSetId, limit, flashcard, test, review } = options;

    switch (mode) {
        case "flashcard":
            return await scheduleFlashcardWords({
                wordSetId,
                limit,
                ...flashcard,
            });

        case "test":
            return await scheduleTestWords({
                wordSetId,
                limit,
                ...test,
            });

        case "review":
            return await scheduleReviewWords({
                wordSetId,
                limit,
                ...review,
            });

        default:
            throw new Error(`不支持的学习模式: ${mode}`);
    }
}

/**
 * 获取下一个要学习的单词（统一接口）
 * 
 * @param mode 学习模式
 * @param currentWordId 当前单词ID（可选）
 * @param options 调度选项
 * @returns 下一个单词ID，如果没有则返回 null
 */
export async function getNextWord(
    mode: StudyMode,
    currentWordId?: number,
    options: Omit<SchedulerOptions, "mode"> = {}
): Promise<number | null> {
    switch (mode) {
        case "flashcard":
            return await getNextFlashcardWord(currentWordId, {
                wordSetId: options.wordSetId,
                limit: options.limit,
                ...options.flashcard,
            });

        case "test":
            return await getNextTestWord(currentWordId, {
                wordSetId: options.wordSetId,
                limit: options.limit,
                ...options.test,
            });

        case "review":
            return await getNextReviewWord(currentWordId, {
                wordSetId: options.wordSetId,
                limit: options.limit,
                ...options.review,
            });

        default:
            throw new Error(`不支持的学习模式: ${mode}`);
    }
}

/**
 * 导出所有调度相关的函数和类型
 */
export {
    // 闪卡模式
    scheduleFlashcardWords,
    getNextFlashcardWord,
    type FlashcardSchedulerOptions,
    type FlashcardSchedulerResult,
    // 测试模式
    scheduleTestWords,
    getNextTestWord,
    type TestSchedulerOptions,
    type TestSchedulerResult,
    // 复习模式
    scheduleReviewWords,
    getNextReviewWord,
    getReviewStatistics,
    type ReviewSchedulerOptions,
    type ReviewSchedulerResult,
};

