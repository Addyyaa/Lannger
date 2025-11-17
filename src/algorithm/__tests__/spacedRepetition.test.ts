/**
 * SM-2 间隔重复算法测试
 */
import { describe, it, expect } from "vitest";
import { WordProgress } from "../../db";
import {
  calculateSM2,
  adjustGradeBySpeed,
  calculateNextReviewDate,
  isDueForReview,
  calculateUrgency,
  type Grade,
} from "../spacedRepetition";

describe("spacedRepetition", () => {
  describe("calculateSM2", () => {
    it("应该正确处理首次学习（grade >= 3）", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      };

      const result = calculateSM2(progress, 3);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      // 首次学习 grade=3 时，easeFactor 会略微降低（从 2.5 到约 2.36）
      expect(result.easeFactor).toBeGreaterThan(2.0);
      expect(result.easeFactor).toBeLessThan(2.6);
    });

    it("应该正确处理第二次复习（grade >= 3）", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
      };

      const result = calculateSM2(progress, 4);

      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    it("应该正确处理第三次及以后的复习（grade >= 3）", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2,
        timesSeen: 2,
        timesCorrect: 2,
        correctStreak: 2,
        wrongStreak: 0,
      };

      const result = calculateSM2(progress, 4);

      expect(result.repetitions).toBe(3);
      expect(result.intervalDays).toBe(15); // 6 * 2.5 = 15
    });

    it("应该正确处理答错（grade < 3）", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 5,
        timesSeen: 5,
        timesCorrect: 4,
        correctStreak: 0,
        wrongStreak: 1,
      };

      const result = calculateSM2(progress, 2);

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(5); // 10 * 0.5 = 5
    });

    it("应该正确处理完全忘记（grade = 0）", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 5,
        timesSeen: 5,
        timesCorrect: 4,
        correctStreak: 0,
        wrongStreak: 1,
      };

      const result = calculateSM2(progress, 0);

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(0);
    });

    it("应该确保易度因子最小值为 1.3", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 1.3,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 1,
      };

      const result = calculateSM2(progress, 0);

      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("应该确保间隔天数不为负数", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 1.3,
        intervalDays: 0,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      };

      const result = calculateSM2(progress, 0);

      expect(result.intervalDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe("adjustGradeBySpeed", () => {
    it("应该对快速答对提高评分", () => {
      const grade: Grade = 3;
      const fastTime = 2000; // 2秒

      const result = adjustGradeBySpeed(grade, fastTime);

      expect(result).toBe(4);
    });

    it("应该对慢速答对降低评分", () => {
      const grade: Grade = 4;
      const slowTime = 12000; // 12秒

      const result = adjustGradeBySpeed(grade, slowTime);

      expect(result).toBe(3);
    });

    it("应该对慢速答错降低评分", () => {
      const grade: Grade = 2;
      const slowTime = 12000; // 12秒

      const result = adjustGradeBySpeed(grade, slowTime);

      expect(result).toBe(1);
    });

    it("应该保持评分在有效范围内（0-5）", () => {
      const grade: Grade = 5;
      const fastTime = 2000;

      const result = adjustGradeBySpeed(grade, fastTime);

      expect(result).toBeLessThanOrEqual(5);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("应该在没有响应时间时返回原评分", () => {
      const grade: Grade = 3;

      const result = adjustGradeBySpeed(grade, undefined);

      expect(result).toBe(3);
    });
  });

  describe("calculateNextReviewDate", () => {
    it("应该正确计算下次复习日期", () => {
      const intervalDays = 7;
      const now = new Date();
      const nextDate = calculateNextReviewDate(intervalDays);
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + intervalDays);

      expect(new Date(nextDate).getTime()).toBeCloseTo(
        expectedDate.getTime(),
        -3 // 允许3秒误差
      );
    });

    it("应该返回 ISO 格式的日期字符串", () => {
      const result = calculateNextReviewDate(1);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("isDueForReview", () => {
    it("应该在没有设置复习时间时返回 true", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
      };

      expect(isDueForReview(progress)).toBe(true);
    });

    it("应该在复习时间已到时返回 true", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
        nextReviewAt: pastDate.toISOString(),
      };

      expect(isDueForReview(progress)).toBe(true);
    });

    it("应该在复习时间未到时返回 false", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
        nextReviewAt: futureDate.toISOString(),
      };

      expect(isDueForReview(progress)).toBe(false);
    });
  });

  describe("calculateUrgency", () => {
    it("应该在没有复习时间时返回最高紧急程度", () => {
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
      };

      expect(calculateUrgency(progress)).toBe(1.0);
    });

    it("应该在已过期时返回最高紧急程度", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
        nextReviewAt: pastDate.toISOString(),
      };

      expect(calculateUrgency(progress)).toBe(1.0);
    });

    it("应该在距离复习时间超过7天时返回低紧急程度", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
        nextReviewAt: futureDate.toISOString(),
      };

      expect(calculateUrgency(progress)).toBe(0.1);
    });

    it("应该在距离复习时间较近时返回较高紧急程度", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        timesSeen: 1,
        timesCorrect: 1,
        correctStreak: 1,
        wrongStreak: 0,
        nextReviewAt: futureDate.toISOString(),
      };

      const urgency = calculateUrgency(progress);
      expect(urgency).toBeGreaterThan(0.1);
      expect(urgency).toBeLessThan(1.0);
    });
  });
});

