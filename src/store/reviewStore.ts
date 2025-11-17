/**
 * 复习计划相关的数据操作
 */

import { db, ReviewPlan, ensureDBOpen } from "../db";
import { createReviewPlan, advanceReviewStage, isReviewDue } from "../utils/ebbinghausCurve";
import { safeDbOperation } from "../utils/dbWrapper";

/**
 * 获取单词集的复习计划
 */
export async function getReviewPlan(wordSetId: number): Promise<ReviewPlan | null> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const plan = await db.reviewPlans.where("wordSetId").equals(wordSetId).first();
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
 */
export async function getOrCreateReviewPlan(
  wordSetId: number,
  totalWords: number
): Promise<ReviewPlan> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      let plan = await db.reviewPlans.where("wordSetId").equals(wordSetId).first();

      if (!plan) {
        // 创建新的复习计划
        plan = createReviewPlan(wordSetId, totalWords);
        await db.reviewPlans.add(plan);
      }

      return plan;
    },
    {
      context: { operation: "getOrCreateReviewPlan", wordSetId, totalWords },
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
 */
export async function completeReviewStage(
  wordSetId: number,
  completedAt?: Date
): Promise<ReviewPlan> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const plan = await db.reviewPlans.where("wordSetId").equals(wordSetId).first();

      if (!plan) {
        throw new Error(`找不到单词集 ${wordSetId} 的复习计划`);
      }

      const updatedPlan = advanceReviewStage(plan, completedAt);
      await db.reviewPlans.put(updatedPlan);

      return updatedPlan;
    },
    {
      context: { operation: "completeReviewStage", wordSetId },
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

