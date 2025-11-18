/**
 * 复习计划相关的数据操作
 */

import { db, ReviewPlan, ensureDBOpen } from "../db";
import {
  createReviewPlan,
  advanceReviewStage,
  isReviewDue,
} from "../utils/ebbinghausCurve";
import { safeDbOperation } from "../utils/dbWrapper";

/**
 * 获取单词集的复习计划
 */
export async function getReviewPlan(
  wordSetId: number
): Promise<ReviewPlan | null> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const plan = await db.reviewPlans
        .where("wordSetId")
        .equals(wordSetId)
        .first();
      return plan || null;
    },
    {
      context: { operation: "getReviewPlan", wordSetId },
      silent: true,
    }
  );
}

/**
 * 创建或获取复习计划
 *
 * @param wordSetId 单词集 ID
 * @param totalWords 单词总数
 * @param learnedWordIds 新学习的单词ID列表（可选，如果提供，会为新学习的单词创建独立的复习计划）
 * @returns 复习计划
 */
export async function getOrCreateReviewPlan(
  wordSetId: number,
  totalWords: number,
  learnedWordIds?: number[]
): Promise<ReviewPlan> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();

      // 如果提供了新学习的单词ID列表，为新学习的单词创建独立的复习计划
      if (learnedWordIds && learnedWordIds.length > 0) {
        // 检查是否已存在相同单词ID列表的复习计划
        const existingPlans = await db.reviewPlans
          .where("wordSetId")
          .equals(wordSetId)
          .toArray();

        // 查找是否有完全匹配的复习计划（相同的 learnedWordIds）
        const matchingPlan = existingPlans.find((plan) => {
          if (
            !plan.learnedWordIds ||
            plan.learnedWordIds.length !== learnedWordIds.length
          ) {
            return false;
          }
          // 检查两个数组是否包含相同的元素（顺序无关）
          const planSet = new Set(plan.learnedWordIds);
          const learnedSet = new Set(learnedWordIds);
          if (planSet.size !== learnedSet.size) {
            return false;
          }
          for (const id of planSet) {
            if (!learnedSet.has(id)) {
              return false;
            }
          }
          return true;
        });

        if (matchingPlan) {
          // 如果已存在匹配的复习计划，返回它
          return matchingPlan;
        }

        // 创建新的复习计划（为新学习的单词）
        const newPlan = createReviewPlan(
          wordSetId,
          learnedWordIds.length,
          undefined,
          learnedWordIds
        );
        await db.reviewPlans.add(newPlan);
        return newPlan;
      }

      // 如果没有提供 learnedWordIds，使用旧的逻辑（查找或创建默认复习计划）
      let plan = await db.reviewPlans
        .where("wordSetId")
        .equals(wordSetId)
        .first();

      if (!plan) {
        // 创建新的复习计划
        plan = createReviewPlan(wordSetId, totalWords);
        await db.reviewPlans.add(plan);
      }

      return plan;
    },
    {
      context: {
        operation: "getOrCreateReviewPlan",
        wordSetId,
        totalWords,
        learnedWordIds,
      },
    }
  );
}

/**
 * 更新复习计划
 */
export async function updateReviewPlan(plan: ReviewPlan): Promise<void> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      await db.reviewPlans.put(plan);
    },
    {
      context: { operation: "updateReviewPlan", wordSetId: plan.wordSetId },
    }
  );
}

/**
 * 完成当前复习阶段，进入下一阶段
 *
 * @param wordSetId 单词集 ID
 * @param completedAt 完成时间（可选，默认为当前时间）
 * @param reviewPlanId 复习计划 ID（可选，如果提供，直接使用该计划；否则查找第一个匹配的）
 * @returns 更新后的复习计划
 */
export async function completeReviewStage(
  wordSetId: number,
  completedAt?: Date,
  reviewPlanId?: number
): Promise<ReviewPlan> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();

      let plan: ReviewPlan | undefined;

      if (reviewPlanId !== undefined) {
        // 如果提供了 reviewPlanId，直接使用
        plan = await db.reviewPlans.get(reviewPlanId);
      } else {
        // 否则查找第一个匹配的复习计划
        plan = await db.reviewPlans
          .where("wordSetId")
          .equals(wordSetId)
          .first();
      }

      if (!plan) {
        throw new Error(`找不到单词集 ${wordSetId} 的复习计划`);
      }

      const updatedPlan = advanceReviewStage(plan, completedAt);
      await db.reviewPlans.put(updatedPlan);

      return updatedPlan;
    },
    {
      context: { operation: "completeReviewStage", wordSetId, reviewPlanId },
    }
  );
}

/**
 * 获取所有到期的复习计划
 */
export async function getDueReviewPlans(): Promise<ReviewPlan[]> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const now = new Date();
      // 使用 filter 方法过滤 boolean 字段，因为 Dexie 的 equals 不支持 boolean
      const allPlans = await db.reviewPlans
        .filter((plan) => plan.isCompleted === false)
        .toArray();

      // 过滤出到期的计划
      const duePlans = allPlans.filter((plan) => isReviewDue(plan, now));

      // 按 nextReviewAt 排序（最早到期的在前）
      duePlans.sort((a, b) => {
        const timeA = new Date(a.nextReviewAt).getTime();
        const timeB = new Date(b.nextReviewAt).getTime();
        return timeA - timeB;
      });

      return duePlans;
    },
    {
      context: { operation: "getDueReviewPlans" },
      silent: true,
    }
  );
}

/**
 * 获取所有复习计划
 */
export async function getAllReviewPlans(): Promise<ReviewPlan[]> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      return await db.reviewPlans.toArray();
    },
    {
      context: { operation: "getAllReviewPlans" },
      silent: true,
    }
  );
}

/**
 * 删除复习计划（用于测试或重置）
 */
export async function deleteReviewPlan(wordSetId: number): Promise<void> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      await db.reviewPlans.where("wordSetId").equals(wordSetId).delete();
    },
    {
      context: { operation: "deleteReviewPlan", wordSetId },
    }
  );
}
