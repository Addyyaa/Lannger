/**
 * 艾宾浩斯遗忘曲线算法
 * 实现标准的 8 次复习时间点计算
 */

import { ReviewPlan } from "../db";

/**
 * 艾宾浩斯遗忘曲线复习间隔（天数）
 * 第 1 次：1 小时（转换为 1/24 天）
 * 第 2 次：1 天
 * 第 3 次：2 天
 * 第 4 次：4 天
 * 第 5 次：7 天
 * 第 6 次：15 天
 * 第 7 次：30 天
 * 第 8 次：60 天
 */
export const EBBINGHAUS_INTERVALS = [
  1 / 24, // 1 小时
  1, // 1 天
  2, // 2 天
  4, // 4 天
  7, // 7 天
  15, // 15 天
  30, // 30 天
  60, // 60 天
];

/**
 * 计算下一次复习时间
 *
 * @param stage 当前复习阶段（1-8）
 * @param lastReviewTime 上次复习时间
 * @returns 下一次复习时间
 */
export function calculateNextReviewTime(
  stage: number,
  lastReviewTime: Date
): Date {
  if (stage < 1 || stage > 8) {
    throw new Error(`复习阶段必须在 1-8 之间，当前为 ${stage}`);
  }

  const days = EBBINGHAUS_INTERVALS[stage - 1];
  const nextTime = new Date(lastReviewTime);
  nextTime.setDate(nextTime.getDate() + days);

  return nextTime;
}

/**
 * 计算下一次复习时间（从 ISO 字符串）
 *
 * @param stage 当前复习阶段（1-8）
 * @param lastReviewTimeISO 上次复习时间（ISO 字符串）
 * @returns 下一次复习时间（ISO 字符串）
 */
export function calculateNextReviewTimeISO(
  stage: number,
  lastReviewTimeISO: string
): string {
  const lastReviewTime = new Date(lastReviewTimeISO);
  const nextTime = calculateNextReviewTime(stage, lastReviewTime);
  return nextTime.toISOString();
}

/**
 * 完成当前复习阶段，进入下一阶段
 *
 * @param plan 当前复习计划
 * @param completedAt 完成时间（可选，默认为当前时间）
 * @returns 更新后的复习计划
 */
export function advanceReviewStage(
  plan: ReviewPlan,
  completedAt?: Date
): ReviewPlan {
  const now = completedAt || new Date();
  const currentStage = plan.reviewStage;
  const completedStages = [...plan.completedStages, currentStage];

  // 如果已完成所有 8 个阶段
  if (currentStage >= 8) {
    return {
      ...plan,
      reviewStage: 8,
      completedStages,
      lastCompletedAt: now.toISOString(),
      isCompleted: true,
      updatedAt: now.toISOString(),
    };
  }

  // 进入下一阶段
  const nextStage = currentStage + 1;
  const nextReviewAt = calculateNextReviewTime(nextStage, now);

  return {
    ...plan,
    reviewStage: nextStage,
    completedStages,
    nextReviewAt: nextReviewAt.toISOString(),
    lastCompletedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * 检查复习计划是否到期
 *
 * @param plan 复习计划
 * @param now 当前时间（可选，默认为当前时间）
 * @returns 是否到期
 */
export function isReviewDue(plan: ReviewPlan, now?: Date): boolean {
  const currentTime = now || new Date();
  const nextReviewTime = new Date(plan.nextReviewAt);
  return currentTime >= nextReviewTime;
}

/**
 * 获取复习计划的紧急程度（0-1）
 * 0 表示不紧急，1 表示非常紧急
 *
 * @param plan 复习计划
 * @param now 当前时间（可选，默认为当前时间）
 * @returns 紧急程度（0-1）
 */
export function getReviewUrgency(plan: ReviewPlan, now?: Date): number {
  const currentTime = now || new Date();
  const nextReviewTime = new Date(plan.nextReviewAt);

  // 如果还未到期，返回 0
  if (currentTime < nextReviewTime) {
    return 0;
  }

  // 计算超时天数
  const overdueMs = currentTime.getTime() - nextReviewTime.getTime();
  const overdueDays = overdueMs / (1000 * 60 * 60 * 24);

  // 紧急程度：超时天数越多，紧急程度越高（最高为 1）
  // 使用对数函数，使得紧急程度增长逐渐放缓
  const urgency = Math.min(1, Math.log(overdueDays + 1) / Math.log(30));

  return urgency;
}

/**
 * 创建新的复习计划
 *
 * @param wordSetId 单词集 ID
 * @param totalWords 单词总数
 * @param startedAt 开始时间（可选，默认为当前时间）
 * @returns 新的复习计划
 */
export function createReviewPlan(
  wordSetId: number,
  totalWords: number,
  startedAt?: Date
): ReviewPlan {
  const now = startedAt || new Date();
  const firstReviewTime = calculateNextReviewTime(1, now);

  return {
    wordSetId,
    reviewStage: 1,
    nextReviewAt: firstReviewTime.toISOString(),
    completedStages: [],
    startedAt: now.toISOString(),
    isCompleted: false,
    totalWords,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * 获取复习阶段的描述
 *
 * @param stage 复习阶段（1-8）
 * @param t 翻译函数（可选）
 * @returns 阶段描述
 */
export function getReviewStageDescription(
  stage: number,
  t?: (key: string) => string
): string {
  if (stage < 1 || stage > 8) {
    if (t) {
      return t("reviewStageUnknown") || `未知阶段（${stage}）`;
    }
    return `未知阶段（${stage}）`;
  }

  // 如果提供了翻译函数，使用国际化
  if (t) {
    const stageKeys = [
      "reviewStage1",
      "reviewStage2",
      "reviewStage3",
      "reviewStage4",
      "reviewStage5",
      "reviewStage6",
      "reviewStage7",
      "reviewStage8",
    ];
    return t(stageKeys[stage - 1]) || getDefaultDescription(stage);
  }

  // 默认中文描述（向后兼容）
  return getDefaultDescription(stage);
}

/**
 * 获取默认的复习阶段描述（中文）
 */
function getDefaultDescription(stage: number): string {
  const descriptions = [
    "第 1 次复习（1 小时后）",
    "第 2 次复习（1 天后）",
    "第 3 次复习（2 天后）",
    "第 4 次复习（4 天后）",
    "第 5 次复习（7 天后）",
    "第 6 次复习（15 天后）",
    "第 7 次复习（30 天后）",
    "第 8 次复习（60 天后）",
  ];
  return descriptions[stage - 1];
}

/**
 * 获取复习间隔的描述（用于显示）
 *
 * @param stage 复习阶段（1-8）
 * @returns 间隔描述
 */
export function getReviewIntervalDescription(stage: number): string {
  const interval = EBBINGHAUS_INTERVALS[stage - 1];

  if (interval < 1) {
    // 小于 1 天，显示小时
    const hours = Math.round(interval * 24);
    return `${hours} 小时`;
  } else if (interval === 1) {
    return "1 天";
  } else {
    return `${interval} 天`;
  }
}
