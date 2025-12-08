import { db, WordProgress, ensureDBOpen } from "../db";
import { sortWordsByWeight } from "./weightCalculator";
import { sortWordsByWeightWithWorker } from "../utils/weightCalculatorWorker";
import { ensureWordProgressExistsBatch } from "./progressUpdater";

/**
 * 闪卡模式调度选项
 */
export interface FlashcardSchedulerOptions {
  wordSetId?: number; // 单词集ID，不指定则使用所有单词
  limit?: number; // 返回的最大单词数量
  includeNewWords?: boolean; // 是否包含新单词（从未见过的）
  includeReviewWords?: boolean; // 是否包含需要复习的单词
  masteryThreshold?: number; // 掌握程度阈值（低于此值的单词优先）
}

/**
 * 闪卡模式调度结果
 */
export interface FlashcardSchedulerResult {
  wordIds: number[]; // 排序后的单词ID列表
  totalAvailable: number; // 可用的单词总数
  newWordsCount: number; // 新单词数量
  reviewWordsCount: number; // 需要复习的单词数量
}

/**
 * 闪卡模式调度算法
 *
 * 策略：
 * 1. 优先显示掌握程度低的单词
 * 2. 优先显示新单词（从未见过的）
 * 3. 优先显示连续答错次数多的单词
 * 4. 根据用户的学习情况动态调整出现频率
 *
 * @param options 调度选项
 * @returns 调度结果
 */
export async function scheduleFlashcardWords(
  options: FlashcardSchedulerOptions = {}
): Promise<FlashcardSchedulerResult> {
  const {
    wordSetId,
    limit = 50,
    includeNewWords = true,
    includeReviewWords = true,
    masteryThreshold = 0.7,
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

  // 批量确保所有单词都有进度记录（性能优化：使用批量查询）
  const progressResults = await ensureWordProgressExistsBatch(wordIds);
  const progresses: WordProgress[] = [];
  let newWordsCount = 0;
  let reviewWordsCount = 0;

  for (let i = 0; i < wordIds.length; i++) {
    const progress = progressResults[i];
    if (!progress) continue;

    // 统计新单词和需要复习的单词
    if (progress.timesSeen === 0) {
      newWordsCount++;
    }
    if (progress.nextReviewAt) {
      const now = new Date();
      const nextReview = new Date(progress.nextReviewAt);
      if (now >= nextReview) {
        reviewWordsCount++;
      }
    }

    // 根据选项过滤
    if (!includeNewWords && progress.timesSeen === 0) {
      continue;
    }

    if (!includeReviewWords && progress.nextReviewAt) {
      const now = new Date();
      const nextReview = new Date(progress.nextReviewAt);
      if (now < nextReview) {
        continue;
      }
    }

    // 如果设置了掌握程度阈值，过滤掉掌握程度过高的单词
    // 注意：不要过滤掉所有掌握程度高的单词，而是降低它们的优先级
    // 这样用户再次学习时，仍然可以看到这些单词，只是优先级较低
    const mastery = calculateMastery(progress);
    // 只过滤掉掌握程度非常高（>= masteryThreshold）且已经见过很多次（> 10）的单词
    // 这样可以确保掌握度低的单词总是优先显示
    // 使用更高的阈值（0.9）来确保只过滤掉真正掌握得很好的单词
    const effectiveThreshold = Math.max(masteryThreshold, 0.9);
    if (mastery >= effectiveThreshold && progress.timesSeen > 10) {
      // 掌握程度非常高且已经见过很多次的单词，可以跳过
      continue;
    }

    progresses.push(progress);
  }

  // 使用权重算法排序（使用 Worker 优化性能）
  const sortedWordIds = await sortWordsByWeightWithWorker(
    progresses,
    "flashcard",
    limit
  );

  return {
    wordIds: sortedWordIds,
    totalAvailable: progresses.length,
    newWordsCount,
    reviewWordsCount,
  };
}

/**
 * 计算单词的掌握程度（从 weightCalculator 导入，避免循环依赖）
 */
function calculateMastery(progress: WordProgress): number {
  const { timesSeen, timesCorrect, correctStreak, wrongStreak, repetitions } =
    progress;

  if (timesSeen === 0) {
    return 0;
  }

  const accuracy = timesCorrect / timesSeen;
  const streakBonus = correctStreak * 0.1;
  const streakPenalty = wrongStreak * 0.15;
  const repetitionBonus = Math.min(repetitions * 0.1, 0.3);

  let mastery = accuracy * 0.6 + streakBonus - streakPenalty + repetitionBonus;

  if (wrongStreak >= 3) {
    mastery *= 0.5;
  }

  return Math.max(0, Math.min(1, mastery));
}

/**
 * 获取下一个要学习的单词（用于闪卡模式）
 *
 * @param currentWordId 当前单词ID（可选）
 * @param options 调度选项
 * @returns 下一个单词ID，如果没有则返回 null
 */
export async function getNextFlashcardWord(
  currentWordId?: number,
  options: FlashcardSchedulerOptions = {}
): Promise<number | null> {
  const result = await scheduleFlashcardWords(options);

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
