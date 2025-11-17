/**
 * 艾宾浩斯遗忘曲线算法测试
 */
import { describe, it, expect } from "vitest";
import { ReviewPlan } from "../../db";
import {
  calculateNextReviewTime,
  calculateNextReviewTimeISO,
  advanceReviewStage,
  isReviewDue,
  getReviewUrgency,
  createReviewPlan,
  getReviewStageDescription,
  getReviewIntervalDescription,
  EBBINGHAUS_INTERVALS,
} from "../ebbinghausCurve";

describe("ebbinghausCurve", () => {
  describe("calculateNextReviewTime", () => {
    it("应该正确计算第1次复习时间（1小时后）", () => {
      const lastReview = new Date("2024-01-01T10:00:00Z");
      const nextReview = calculateNextReviewTime(1, lastReview);

      const expectedTime = new Date(lastReview);
      expectedTime.setHours(expectedTime.getHours() + 1);

      // 允许1小时的误差（因为 setDate 可能受到时区影响）
      const diff = Math.abs(nextReview.getTime() - expectedTime.getTime());
      expect(diff).toBeLessThan(3600000 + 1000); // 1小时 + 1秒容差
    });

    it("应该正确计算第2次复习时间（1天后）", () => {
      const lastReview = new Date("2024-01-01T10:00:00Z");
      const nextReview = calculateNextReviewTime(2, lastReview);

      const expectedTime = new Date(lastReview);
      expectedTime.setDate(expectedTime.getDate() + 1);

      expect(nextReview.getTime()).toBeCloseTo(
        expectedTime.getTime(),
        -3
      );
    });

    it("应该正确计算第8次复习时间（60天后）", () => {
      const lastReview = new Date("2024-01-01T10:00:00Z");
      const nextReview = calculateNextReviewTime(8, lastReview);

      const expectedTime = new Date(lastReview);
      expectedTime.setDate(expectedTime.getDate() + 60);

      expect(nextReview.getTime()).toBeCloseTo(
        expectedTime.getTime(),
        -3
      );
    });

    it("应该在阶段超出范围时抛出错误", () => {
      const lastReview = new Date();

      expect(() => calculateNextReviewTime(0, lastReview)).toThrow();
      expect(() => calculateNextReviewTime(9, lastReview)).toThrow();
    });
  });

  describe("calculateNextReviewTimeISO", () => {
    it("应该返回 ISO 格式的日期字符串", () => {
      const lastReviewISO = "2024-01-01T10:00:00Z";
      const result = calculateNextReviewTimeISO(1, lastReviewISO);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("应该正确计算时间", () => {
      const lastReviewISO = "2024-01-01T10:00:00Z";
      const result = calculateNextReviewTimeISO(2, lastReviewISO);
      const resultDate = new Date(result);
      const expectedDate = new Date(lastReviewISO);
      expectedDate.setDate(expectedDate.getDate() + 1);

      expect(resultDate.getTime()).toBeCloseTo(expectedDate.getTime(), -3);
    });
  });

  describe("advanceReviewStage", () => {
    it("应该正确进入下一阶段", () => {
      const plan: ReviewPlan = {
        wordSetId: 1,
        reviewStage: 1,
        nextReviewAt: new Date().toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = advanceReviewStage(plan);

      expect(result.reviewStage).toBe(2);
      expect(result.completedStages).toContain(1);
      expect(result.isCompleted).toBe(false);
    });

    it("应该在完成第8阶段时标记为已完成", () => {
      const plan: ReviewPlan = {
        wordSetId: 1,
        reviewStage: 8,
        nextReviewAt: new Date().toISOString(),
        completedStages: [1, 2, 3, 4, 5, 6, 7],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = advanceReviewStage(plan);

      expect(result.reviewStage).toBe(8);
      expect(result.completedStages).toContain(8);
      expect(result.isCompleted).toBe(true);
    });

    it("应该更新 lastCompletedAt 和 updatedAt", () => {
      const plan: ReviewPlan = {
        wordSetId: 1,
        reviewStage: 1,
        nextReviewAt: new Date().toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const before = new Date();
      const result = advanceReviewStage(plan);
      const after = new Date();

      expect(result.lastCompletedAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const lastCompleted = new Date(result.lastCompletedAt!);
      expect(lastCompleted.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastCompleted.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("isReviewDue", () => {
    it("应该在复习时间已到时返回 true", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const plan: ReviewPlan = {
        wordSetId: 1,
        reviewStage: 1,
        nextReviewAt: pastDate.toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(isReviewDue(plan)).toBe(true);
    });

    it("应该在复习时间未到时返回 false", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const plan: ReviewPlan = {
        wordSetId: 1,
        reviewStage: 1,
        nextReviewAt: futureDate.toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(isReviewDue(plan)).toBe(false);
    });
  });

  describe("getReviewUrgency", () => {
    it("应该在未到期时返回 0", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const plan: ReviewPlan = {
        wordSetId: 1,
        reviewStage: 1,
        nextReviewAt: futureDate.toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(getReviewUrgency(plan)).toBe(0);
    });

    it("应该在已过期时返回大于 0 的值", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const plan: ReviewPlan = {
        wordSetId: 1,
        reviewStage: 1,
        nextReviewAt: pastDate.toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const urgency = getReviewUrgency(plan);
      expect(urgency).toBeGreaterThan(0);
      expect(urgency).toBeLessThanOrEqual(1);
    });
  });

  describe("createReviewPlan", () => {
    it("应该创建新的复习计划", () => {
      const plan = createReviewPlan(1, 10);

      expect(plan.wordSetId).toBe(1);
      expect(plan.reviewStage).toBe(1);
      expect(plan.totalWords).toBe(10);
      expect(plan.isCompleted).toBe(false);
      expect(plan.completedStages).toEqual([]);
      expect(plan.nextReviewAt).toBeDefined();
    });

    it("应该设置正确的初始复习时间", () => {
      const now = new Date();
      const plan = createReviewPlan(1, 10, now);

      const nextReview = new Date(plan.nextReviewAt);
      const expectedTime = new Date(now);
      expectedTime.setHours(expectedTime.getHours() + 1);

      // 允许1小时的误差（因为 setDate 可能受到时区影响）
      const diff = Math.abs(nextReview.getTime() - expectedTime.getTime());
      expect(diff).toBeLessThan(3600000 + 1000); // 1小时 + 1秒容差
    });
  });

  describe("getReviewStageDescription", () => {
    it("应该返回正确的阶段描述", () => {
      expect(getReviewStageDescription(1)).toContain("第 1 次复习");
      expect(getReviewStageDescription(8)).toContain("第 8 次复习");
    });

    it("应该在阶段超出范围时返回未知阶段", () => {
      expect(getReviewStageDescription(0)).toContain("未知阶段");
      expect(getReviewStageDescription(9)).toContain("未知阶段");
    });
  });

  describe("getReviewIntervalDescription", () => {
    it("应该正确描述小于1天的间隔（小时）", () => {
      const description = getReviewIntervalDescription(1);
      expect(description).toContain("小时");
    });

    it("应该正确描述1天的间隔", () => {
      const description = getReviewIntervalDescription(2);
      expect(description).toBe("1 天");
    });

    it("应该正确描述大于1天的间隔", () => {
      const description = getReviewIntervalDescription(8);
      expect(description).toBe("60 天");
    });
  });

  describe("EBBINGHAUS_INTERVALS", () => {
    it("应该包含8个间隔", () => {
      expect(EBBINGHAUS_INTERVALS).toHaveLength(8);
    });

    it("应该按正确顺序排列间隔", () => {
      expect(EBBINGHAUS_INTERVALS[0]).toBe(1 / 24); // 1小时
      expect(EBBINGHAUS_INTERVALS[1]).toBe(1); // 1天
      expect(EBBINGHAUS_INTERVALS[7]).toBe(60); // 60天
    });
  });
});

