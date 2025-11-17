/**
 * 复习计划数据操作测试
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getReviewPlan,
  getOrCreateReviewPlan,
  updateReviewPlan,
  completeReviewStage,
  getDueReviewPlans,
  getAllReviewPlans,
  deleteReviewPlan,
} from "../reviewStore";
import { createReviewPlan, isReviewDue } from "../../utils/ebbinghausCurve";
import { db } from "../../db";

// Mock dbWrapper
vi.mock("../../utils/dbWrapper", () => ({
  safeDbOperation: <T,>(fn: () => Promise<T>) => fn(),
}));

describe("reviewStore", () => {
  beforeEach(async () => {
    // 清理所有表数据
    await db.reviewPlans.clear();
    await db.wordSets.clear();
    await db.words.clear();
  });

  describe("getReviewPlan", () => {
    it("应该返回存在的复习计划", async () => {
      const plan = createReviewPlan(1, 10);
      await db.reviewPlans.add(plan);

      const result = await getReviewPlan(1);

      expect(result).not.toBeNull();
      expect(result?.wordSetId).toBe(1);
    });

    it("应该在计划不存在时返回 null", async () => {
      const result = await getReviewPlan(999);

      expect(result).toBeNull();
    });
  });

  describe("getOrCreateReviewPlan", () => {
    it("应该返回已存在的复习计划", async () => {
      const existingPlan = createReviewPlan(1, 10);
      await db.reviewPlans.add(existingPlan);

      const result = await getOrCreateReviewPlan(1, 10);

      expect(result.wordSetId).toBe(1);
      expect(result.totalWords).toBe(10);
    });

    it("应该创建新的复习计划（如果不存在）", async () => {
      const result = await getOrCreateReviewPlan(1, 10);

      expect(result).toBeDefined();
      expect(result.wordSetId).toBe(1);
      expect(result.totalWords).toBe(10);
    });
  });

  describe("updateReviewPlan", () => {
    it("应该更新复习计划", async () => {
      const plan = createReviewPlan(1, 10);
      await db.reviewPlans.add(plan);

      const updatedPlan = { ...plan, reviewStage: 2 };
      await updateReviewPlan(updatedPlan);

      const result = await db.reviewPlans.get(plan.wordSetId);
      expect(result?.reviewStage).toBe(2);
    });
  });

  describe("completeReviewStage", () => {
    it("应该完成当前阶段并进入下一阶段", async () => {
      const plan = createReviewPlan(1, 10);
      await db.reviewPlans.add(plan);

      const result = await completeReviewStage(1);

      expect(result.reviewStage).toBe(2);
      expect(result.completedStages).toContain(1);
    });

    it("应该在计划不存在时抛出错误", async () => {
      await expect(completeReviewStage(999)).rejects.toThrow();
    });
  });

  describe("getDueReviewPlans", () => {
    it("应该返回所有到期的复习计划", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const duePlan1 = createReviewPlan(1, 10);
      duePlan1.nextReviewAt = pastDate.toISOString();
      duePlan1.isCompleted = false;
      await db.reviewPlans.add(duePlan1);

      const duePlan2 = createReviewPlan(2, 20);
      duePlan2.nextReviewAt = pastDate.toISOString();
      duePlan2.isCompleted = false;
      await db.reviewPlans.add(duePlan2);

      const futurePlan = createReviewPlan(3, 30);
      futurePlan.nextReviewAt = new Date(Date.now() + 86400000).toISOString();
      futurePlan.isCompleted = false;
      await db.reviewPlans.add(futurePlan);

      const completedPlan = createReviewPlan(4, 40);
      completedPlan.isCompleted = true;
      await db.reviewPlans.add(completedPlan);

      const result = await getDueReviewPlans();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((plan) => {
        expect(plan.isCompleted).toBe(false);
        expect(isReviewDue(plan)).toBe(true);
      });
    });

    it("应该按 nextReviewAt 排序", async () => {
      const now = new Date();
      const plan1 = createReviewPlan(1, 10);
      plan1.nextReviewAt = new Date(now.getTime() - 86400000 * 2).toISOString();
      plan1.isCompleted = false;
      await db.reviewPlans.add(plan1);

      const plan2 = createReviewPlan(2, 20);
      plan2.nextReviewAt = new Date(now.getTime() - 86400000).toISOString();
      plan2.isCompleted = false;
      await db.reviewPlans.add(plan2);

      const result = await getDueReviewPlans();

      if (result.length >= 2) {
        const time1 = new Date(result[0].nextReviewAt).getTime();
        const time2 = new Date(result[1].nextReviewAt).getTime();
        expect(time1).toBeLessThanOrEqual(time2);
      }
    });
  });

  describe("getAllReviewPlans", () => {
    it("应该返回所有复习计划", async () => {
      const plan1 = createReviewPlan(1, 10);
      await db.reviewPlans.add(plan1);

      const plan2 = createReviewPlan(2, 20);
      await db.reviewPlans.add(plan2);

      const result = await getAllReviewPlans();

      expect(result.length).toBe(2);
    });
  });

  describe("deleteReviewPlan", () => {
    it("应该删除指定的复习计划", async () => {
      const plan = createReviewPlan(1, 10);
      await db.reviewPlans.add(plan);

      await deleteReviewPlan(1);

      const result = await db.reviewPlans.get(1);
      expect(result).toBeUndefined();
    });
  });
});
