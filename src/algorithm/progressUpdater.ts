import { db, WordProgress, ReviewLog, StudyMode, ensureDBOpen } from "../db";
import {
  calculateSM2,
  calculateNextReviewDate,
  adjustGradeBySpeed,
  Grade,
} from "./spacedRepetition";

/**
 * 更新单词进度的结果
 */
export interface UpdateProgressResult {
  success: boolean;
  updatedProgress?: WordProgress;
  error?: string;
}

/**
 * 根据学习结果更新单词进度
 *
 * @param wordId 单词ID
 * @param result 学习结果（"correct" | "wrong" | "skip"）
 * @param mode 学习模式
 * @param grade 评分（可选，0-5）
 * @param responseTime 答题时间（可选，毫秒）
 * @returns 更新后的进度
 */
export async function updateWordProgress(
  wordId: number,
  result: "correct" | "wrong" | "skip",
  mode: StudyMode,
  grade?: Grade,
  responseTime?: number
): Promise<UpdateProgressResult> {
  try {
    // 确保数据库已打开
    await ensureDBOpen();
    // 获取当前进度
    let progress = await db.wordProgress.get(wordId);

    // 如果进度不存在，创建初始进度
    if (!progress) {
      const word = await db.words.get(wordId);
      if (!word) {
        return { success: false, error: "单词不存在" };
      }

      progress = {
        wordId,
        setId: word.setId ?? 0,
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        difficulty: word.review?.difficulty,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
        fastResponseCount: 0,
        slowResponseCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 初始化答题速度相关字段（如果不存在）
    if (progress.fastResponseCount === undefined) {
      progress.fastResponseCount = 0;
    }
    if (progress.slowResponseCount === undefined) {
      progress.slowResponseCount = 0;
    }

    const now = new Date().toISOString();

    // 更新基础统计
    progress.timesSeen += 1;
    progress.lastMode = mode;
    progress.lastReviewedAt = now;
    progress.updatedAt = now;

    // 更新答题速度统计
    if (responseTime !== undefined && responseTime > 0) {
      progress.lastResponseTime = responseTime;

      // 计算平均答题时间（使用移动平均，权重递减）
      if (progress.averageResponseTime === undefined) {
        progress.averageResponseTime = responseTime;
      } else {
        // 使用指数移动平均（EMA），新数据权重 0.3
        progress.averageResponseTime = Math.round(
          progress.averageResponseTime * 0.7 + responseTime * 0.3
        );
      }

      // 统计快速和慢速答题
      const FAST_THRESHOLD = 3000; // 3秒
      const SLOW_THRESHOLD = 10000; // 10秒

      if (responseTime < FAST_THRESHOLD) {
        progress.fastResponseCount = (progress.fastResponseCount || 0) + 1;
      } else if (responseTime > SLOW_THRESHOLD) {
        progress.slowResponseCount = (progress.slowResponseCount || 0) + 1;
      }
    }

    // 根据结果更新进度
    if (result === "skip") {
      // 跳过：不更新间隔重复参数，但记录为跳过
      progress.lastResult = "skip";
    } else if (result === "correct") {
      // 答对：更新统计和间隔重复参数
      progress.timesCorrect += 1;
      progress.correctStreak += 1;
      progress.wrongStreak = 0;
      progress.lastResult = "correct";

      // 如果有评分，根据答题速度调整评分，然后使用 SM-2 算法更新
      if (grade !== undefined) {
        // 根据答题速度调整评分
        const adjustedGrade = adjustGradeBySpeed(grade, responseTime);
        const sm2Result = calculateSM2(progress, adjustedGrade);
        progress.easeFactor = sm2Result.easeFactor;
        progress.intervalDays = sm2Result.intervalDays;
        progress.repetitions = sm2Result.repetitions;
        progress.nextReviewAt = calculateNextReviewDate(sm2Result.intervalDays);
      } else {
        // 没有评分，使用默认逻辑
        // 如果之前没有复习过，设置为 1 天后
        if (progress.repetitions === 0) {
          progress.intervalDays = 1;
          progress.repetitions = 1;
          progress.nextReviewAt = calculateNextReviewDate(1);
        } else {
          // 使用当前的易度因子计算，根据答题速度调整默认评分
          const defaultGrade: Grade = 3;
          const adjustedGrade = adjustGradeBySpeed(defaultGrade, responseTime);
          const sm2Result = calculateSM2(progress, adjustedGrade);
          progress.easeFactor = sm2Result.easeFactor;
          progress.intervalDays = sm2Result.intervalDays;
          progress.repetitions = sm2Result.repetitions;
          progress.nextReviewAt = calculateNextReviewDate(
            sm2Result.intervalDays
          );
        }
      }
    } else {
      // 答错：重置间隔重复参数
      progress.wrongStreak += 1;
      progress.correctStreak = 0;
      progress.lastResult = "wrong";

      // 使用评分 0 或 1 来重置，根据答题速度调整
      const resetGrade: Grade = grade !== undefined ? (grade < 2 ? 0 : 1) : 1;
      const adjustedGrade = adjustGradeBySpeed(resetGrade, responseTime);
      const sm2Result = calculateSM2(progress, adjustedGrade);
      progress.easeFactor = sm2Result.easeFactor;
      progress.intervalDays = sm2Result.intervalDays;

      // 重要：当用户点击"需要复习"时，完全重置掌握状态
      // 这确保单词不再被标记为"易掌握"，会重新进入学习队列
      // 掌握条件是 repetitions >= 3 || correctStreak >= 3
      // 所以我们需要确保 repetitions < 3
      progress.repetitions = Math.min(sm2Result.repetitions, 1);

      progress.nextReviewAt = calculateNextReviewDate(sm2Result.intervalDays);
    }

    // 保存更新后的进度
    await db.wordProgress.put(progress);

    // 记录到复习日志
    const log: ReviewLog = {
      wordId,
      timestamp: now,
      mode,
      result,
      grade,
      nextReviewAt: progress.nextReviewAt,
      easeFactorAfter: progress.easeFactor,
      intervalDaysAfter: progress.intervalDays,
      responseTime: responseTime,
    };
    await db.reviewLogs.add(log);

    return { success: true, updatedProgress: progress };
  } catch (error) {
    console.error("更新单词进度失败:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 批量更新单词进度（用于批量操作）
 *
 * @param updates 更新列表，每个元素包含 wordId, result, mode, grade
 * @returns 更新结果列表
 */
export async function batchUpdateWordProgress(
  updates: Array<{
    wordId: number;
    result: "correct" | "wrong" | "skip";
    mode: StudyMode;
    grade?: Grade;
    responseTime?: number;
  }>
): Promise<Array<UpdateProgressResult>> {
  const results: Array<UpdateProgressResult> = [];
  for (const update of updates) {
    const result = await updateWordProgress(
      update.wordId,
      update.result,
      update.mode,
      update.grade,
      update.responseTime
    );
    results.push(result);
  }
  return results;
}

/**
 * 确保单词进度存在（如果不存在则创建）
 *
 * @param wordId 单词ID
 * @returns 单词进度
 */
export async function ensureWordProgressExists(
  wordId: number
): Promise<WordProgress | null> {
  await ensureDBOpen();
  let progress = await db.wordProgress.get(wordId);

  if (!progress) {
    const word = await db.words.get(wordId);
    if (!word) {
      return null;
    }

    progress = {
      wordId,
      setId: word.setId ?? 0,
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      difficulty: word.review?.difficulty,
      timesSeen: 0,
      timesCorrect: 0,
      correctStreak: 0,
      wrongStreak: 0,
      fastResponseCount: 0,
      slowResponseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.wordProgress.put(progress);
  }

  return progress;
}

/**
 * 批量确保单词进度存在（性能优化：使用批量查询）
 *
 * @param wordIds 单词ID列表
 * @returns 单词进度列表（与输入顺序一致，不存在的单词返回 null）
 */
export async function ensureWordProgressExistsBatch(
  wordIds: number[]
): Promise<Array<WordProgress | null>> {
  await ensureDBOpen();

  if (wordIds.length === 0) {
    return [];
  }

  // 批量查询现有进度
  const existingProgresses = await db.wordProgress.bulkGet(wordIds);

  // 找出需要创建的进度（不存在的单词）
  const missingWordIds: number[] = [];
  const progressMap = new Map<number, WordProgress | null>();

  for (let i = 0; i < wordIds.length; i++) {
    const wordId = wordIds[i];
    const progress = existingProgresses[i];

    if (progress) {
      progressMap.set(wordId, progress);
    } else {
      missingWordIds.push(wordId);
    }
  }

  // 如果有缺失的进度，批量查询单词信息并创建
  if (missingWordIds.length > 0) {
    const words = await db.words.bulkGet(missingWordIds);
    const newProgresses: WordProgress[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < missingWordIds.length; i++) {
      const wordId = missingWordIds[i];
      const word = words[i];

      if (word) {
        const progress: WordProgress = {
          wordId,
          setId: word.setId ?? 0,
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          difficulty: word.review?.difficulty,
          timesSeen: 0,
          timesCorrect: 0,
          correctStreak: 0,
          wrongStreak: 0,
          fastResponseCount: 0,
          slowResponseCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        newProgresses.push(progress);
        progressMap.set(wordId, progress);
      } else {
        progressMap.set(wordId, null);
      }
    }

    // 批量保存新创建的进度
    if (newProgresses.length > 0) {
      await db.wordProgress.bulkPut(newProgresses);
    }
  }

  // 按照输入顺序返回结果
  return wordIds.map((wordId) => progressMap.get(wordId) ?? null);
}
