import { db, WordProgress, ensureDBOpen } from "../db";
import { sortWordsByWeight, calculateMastery } from "./weightCalculator";
import { sortWordsByWeightWithWorker } from "../utils/weightCalculatorWorker";
import { ensureWordProgressExistsBatch } from "./progressUpdater";
import { isDueForReview, calculateUrgency } from "./spacedRepetition";

/**
 * 复习模式调度选项
 */
export interface ReviewSchedulerOptions {
  wordSetId?: number; // 单词集ID
  limit?: number; // 返回的最大单词数量
  onlyDue?: boolean; // 是否只返回到期的单词
  urgencyThreshold?: number; // 紧急程度阈值（0-1）
}

/**
 * 复习模式调度结果
 */
export interface ReviewSchedulerResult {
  wordIds: number[]; // 排序后的单词ID列表
  totalAvailable: number; // 可用的单词总数
  dueCount: number; // 到期的单词数量
  urgentCount: number; // 紧急的单词数量（紧急程度 > 0.7）
}

/**
 * 复习模式调度算法
 *
 * 策略：
 * 1. 优先复习到期的单词（nextReviewAt <= 当前时间）
 * 2. 优先复习紧急程度高的单词
 * 3. 优先复习掌握程度低的单词
 * 4. 优先复习连续答错次数多的单词
 * 5. 基于间隔重复算法（SM-2）的复习时间安排
 *
 * @param options 调度选项
 * @returns 调度结果
 */
export async function scheduleReviewWords(
  options: ReviewSchedulerOptions = {}
): Promise<ReviewSchedulerResult> {
  const {
    wordSetId,
    limit = 50,
    onlyDue = false,
    urgencyThreshold = 0.5,
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
  let dueCount = 0;
  let urgentCount = 0;

  for (let i = 0; i < wordIds.length; i++) {
    const progress = progressResults[i];
    if (!progress) continue;

    // 复习模式：只包含已经学习过的单词（timesSeen > 0）
    // 新单词（从未通过闪卡背诵的）不应该出现在复习中
    if (progress.timesSeen === 0) {
      continue;
    }

    // 计算掌握度，用于判断是否需要复习
    const mastery = calculateMastery(progress);
    const isUnmastered = mastery < 0.5; // 掌握度低于0.5视为未掌握

    // 如果只返回到期的单词，需要包含：
    // 1. 到期的单词（isDueForReview 返回 true）
    // 2. 未掌握的单词（即使没有到期，也需要复习）
    if (onlyDue) {
      const isDue = isDueForReview(progress);
      if (!isDue && !isUnmastered) {
        // 既没有到期，也不是未掌握的单词，跳过
        continue;
      }
    }

    // 统计到期和紧急的单词
    if (isDueForReview(progress)) {
      dueCount++;
    }

    const urgency = calculateUrgency(progress);
    if (urgency > urgencyThreshold) {
      urgentCount++;
    }

    // 如果设置了紧急程度阈值，过滤掉不紧急的单词
    if (onlyDue && urgency < urgencyThreshold) {
      continue;
    }

    progresses.push(progress);
  }

  // 使用权重算法排序（复习模式，使用 Worker 优化性能）
  const sortedWordIds = await sortWordsByWeightWithWorker(
    progresses,
    "review",
    limit
  );

  return {
    wordIds: sortedWordIds,
    totalAvailable: progresses.length,
    dueCount,
    urgentCount,
  };
}

/**
 * 获取下一个要复习的单词
 *
 * @param currentWordId 当前单词ID（可选）
 * @param options 调度选项
 * @returns 下一个单词ID，如果没有则返回 null
 */
export async function getNextReviewWord(
  currentWordId?: number,
  options: ReviewSchedulerOptions = {}
): Promise<number | null> {
  const result = await scheduleReviewWords(options);

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
 * 获取需要复习的单词统计信息
 *
 * @param wordSetId 单词集ID（可选）
 * @returns 统计信息
 */
export async function getReviewStatistics(wordSetId?: number): Promise<{
  totalWords: number;
  dueWords: number;
  urgentWords: number;
  upcomingWords: number; // 即将到期的单词（1-3天内）
}> {
  // 获取单词列表
  let wordIds: number[];
  if (wordSetId !== undefined) {
    const words = await db.words.where("setId").equals(wordSetId).toArray();
    wordIds = words.map((w) => w.id);
  } else {
    const words = await db.words.toArray();
    wordIds = words.map((w) => w.id);
  }

  let totalWords = 0;
  let dueWords = 0;
  let urgentWords = 0;
  let upcomingWords = 0;

  const now = new Date();

  // 批量查询进度（性能优化）
  const progressResults = await db.wordProgress.bulkGet(wordIds);

  for (let i = 0; i < wordIds.length; i++) {
    const progress = progressResults[i];
    if (!progress) {
      totalWords++;
      continue;
    }

    totalWords++;

    if (isDueForReview(progress)) {
      dueWords++;
    }

    const urgency = calculateUrgency(progress);
    if (urgency > 0.7) {
      urgentWords++;
    }

    // 检查是否即将到期（1-3天内）
    if (progress.nextReviewAt) {
      const nextReview = new Date(progress.nextReviewAt);
      const diffMs = nextReview.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 0 && diffDays <= 3) {
        upcomingWords++;
      }
    }
  }

  return {
    totalWords,
    dueWords,
    urgentWords,
    upcomingWords,
  };
}
