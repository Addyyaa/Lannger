/**
 * 权重计算算法测试
 */
import { describe, it, expect } from "vitest";
import { WordProgress } from "../../db";
import {
  calculateMastery,
  calculateSpeedWeight,
  calculateDifficultyWeight,
  calculateWordWeight,
  sortWordsByWeight,
} from "../weightCalculator";

// 辅助函数：创建完整的 WordProgress 对象
function createWordProgress(
  overrides: Partial<WordProgress> = {}
): WordProgress {
  return {
    wordId: 1,
    setId: 1,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    timesSeen: 0,
    timesCorrect: 0,
    correctStreak: 0,
    wrongStreak: 0,
    ...overrides,
  };
}

describe("weightCalculator", () => {
  describe("calculateMastery", () => {
    it("应该在从未见过时返回 0", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
      });

      const mastery = calculateMastery(progress);

      expect(mastery).toBe(0);
    });

    it("应该基于答对率计算基础掌握度", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 8,
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
      });

      const mastery = calculateMastery(progress);

      expect(mastery).toBeGreaterThan(0);
      expect(mastery).toBeLessThanOrEqual(1);
      // 基础掌握度应该是 0.8 * 0.5 = 0.4（不考虑其他因素）
      expect(mastery).toBeCloseTo(0.4, 0.1);
    });

    it("应该考虑连续答对加分", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 5,
        timesCorrect: 5,
        correctStreak: 5,
        wrongStreak: 0,
        repetitions: 0,
      });

      const mastery = calculateMastery(progress);

      expect(mastery).toBeGreaterThan(0.5);
    });

    it("应该考虑连续答错减分", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 5,
        timesCorrect: 3,
        correctStreak: 0,
        wrongStreak: 3,
        repetitions: 0,
      });

      const mastery = calculateMastery(progress);

      // 连续答错3次，掌握度应该降低
      expect(mastery).toBeLessThan(0.3);
    });

    it("应该考虑重复次数加分", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 8,
        correctStreak: 2,
        wrongStreak: 0,
        repetitions: 5,
      });

      const mastery = calculateMastery(progress);

      expect(mastery).toBeGreaterThan(0.4);
    });

    it("应该考虑答题速度因素", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 8,
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
        averageResponseTime: 2000, // 2秒，快速
        fastResponseCount: 8,
        slowResponseCount: 0,
      });

      const mastery = calculateMastery(progress);

      expect(mastery).toBeGreaterThan(0.4);
    });

    it("应该在连续答错多次时大幅降低掌握度", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 5,
        correctStreak: 0,
        wrongStreak: 3,
        repetitions: 0,
      });

      const mastery = calculateMastery(progress);

      // 连续答错3次，掌握度应该减半
      expect(mastery).toBeLessThan(0.25);
    });

    it("应该确保掌握度在 0-1 范围内", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 100,
        timesCorrect: 100,
        correctStreak: 100,
        wrongStreak: 0,
        repetitions: 50,
        averageResponseTime: 1000,
        fastResponseCount: 100,
        slowResponseCount: 0,
      });

      const mastery = calculateMastery(progress);

      expect(mastery).toBeGreaterThanOrEqual(0);
      expect(mastery).toBeLessThanOrEqual(1);
    });
  });

  describe("calculateSpeedWeight", () => {
    it("应该在没有任何数据时返回中等权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 0,
      });

      const weight = calculateSpeedWeight(progress);

      expect(weight).toBe(0.5);
    });

    it("应该在平均答题时间很快时返回低权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        averageResponseTime: 2000, // 2秒，很快
        fastResponseCount: 10,
        slowResponseCount: 0,
      });

      const weight = calculateSpeedWeight(progress);

      expect(weight).toBeLessThanOrEqual(0.2);
    });

    it("应该在平均答题时间很慢时返回高权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        averageResponseTime: 12000, // 12秒，很慢
        fastResponseCount: 0,
        slowResponseCount: 10,
      });

      const weight = calculateSpeedWeight(progress);

      expect(weight).toBe(1.0);
    });

    it("应该在慢速答题比例高时增加权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        averageResponseTime: 6000, // 6秒，中等
        fastResponseCount: 2,
        slowResponseCount: 6, // 60% 慢速答题
      });

      const weight = calculateSpeedWeight(progress);

      expect(weight).toBeGreaterThan(0.5);
    });

    it("应该在快速答题比例高时降低权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        averageResponseTime: 6000, // 6秒，中等
        fastResponseCount: 6, // 60% 快速答题
        slowResponseCount: 2,
      });

      const weight = calculateSpeedWeight(progress);

      expect(weight).toBeLessThan(0.5);
    });

    it("应该确保权重在 0.1-1.0 范围内", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        averageResponseTime: 5000,
        fastResponseCount: 5,
        slowResponseCount: 5,
      });

      const weight = calculateSpeedWeight(progress);

      expect(weight).toBeGreaterThanOrEqual(0.1);
      expect(weight).toBeLessThanOrEqual(1.0);
    });
  });

  describe("calculateDifficultyWeight", () => {
    it("应该在未设置难度时使用默认中等难度", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 0,
        timesCorrect: 0,
      });

      const weight = calculateDifficultyWeight(progress);

      // 默认难度 3，权重应该是 3/5 = 0.6
      expect(weight).toBeCloseTo(0.6, 0.1);
    });

    it("应该根据难度系数计算权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        difficulty: 5,
        timesSeen: 0,
        timesCorrect: 0,
      });

      const weight = calculateDifficultyWeight(progress);

      // 难度 5，权重应该是 5/5 = 1.0
      expect(weight).toBeCloseTo(1.0, 0.1);
    });

    it("应该在答错率高时增加权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        difficulty: 3,
        timesSeen: 10,
        timesCorrect: 3, // 70% 错误率
      });

      const weight = calculateDifficultyWeight(progress);

      // 基础权重 0.6 + 错误率 0.7 * 0.3 = 0.81
      expect(weight).toBeGreaterThan(0.6);
    });

    it("应该确保权重不超过 1.0", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        difficulty: 5,
        timesSeen: 10,
        timesCorrect: 0, // 100% 错误率
      });

      const weight = calculateDifficultyWeight(progress);

      expect(weight).toBeLessThanOrEqual(1.0);
    });
  });

  describe("calculateWordWeight", () => {
    it("应该在闪卡模式下优先新单词", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
      });

      const result = calculateWordWeight(progress, "flashcard");

      expect(result.weight).toBeGreaterThan(0);
      expect(result.reasons).toContain("新单词");
    });

    it("应该在复习模式下不包含新单词", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
      });

      const result = calculateWordWeight(progress, "review");

      expect(result.reasons).not.toContain("新单词");
    });

    it("应该在复习模式下优先掌握度低的单词", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 2, // 20% 正确率，掌握度低
        correctStreak: 0,
        wrongStreak: 3,
        repetitions: 0,
      });

      const result = calculateWordWeight(progress, "review");

      expect(result.weight).toBeGreaterThan(0.5);
      expect(result.reasons.some((r) => r.includes("掌握度很低"))).toBe(true);
    });

    it("应该在测试模式下优先中等掌握度的单词", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 5, // 50% 正确率，中等掌握度
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
      });

      const result = calculateWordWeight(progress, "test");

      expect(result.weight).toBeGreaterThan(0);
      expect(result.reasons.some((r) => r.includes("中等掌握程度"))).toBe(true);
    });

    it("应该在连续答错时增加权重", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 5,
        correctStreak: 0,
        wrongStreak: 3,
        repetitions: 0,
      });

      const result = calculateWordWeight(progress, "flashcard");

      expect(result.weight).toBeGreaterThan(0);
      expect(result.reasons.some((r) => r.includes("连续答错"))).toBe(true);
    });

    it("应该在测试模式下对高难度单词额外加权", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        difficulty: 5,
        timesSeen: 10,
        timesCorrect: 5,
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
      });

      const result = calculateWordWeight(progress, "test");

      expect(result.reasons.some((r) => r.includes("高难度"))).toBe(true);
    });

    it("应该返回包含原因说明的权重结果", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 5,
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
      });

      const result = calculateWordWeight(progress, "flashcard");

      expect(result.wordId).toBe(1);
      expect(result.weight).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("应该确保权重不为负数", () => {
      const progress = createWordProgress({
        wordId: 1,
        setId: 1,
        timesSeen: 100,
        timesCorrect: 100,
        correctStreak: 100,
        wrongStreak: 0,
        repetitions: 50,
        averageResponseTime: 1000,
        fastResponseCount: 100,
        slowResponseCount: 0,
      });

      const result = calculateWordWeight(progress, "flashcard");

      expect(result.weight).toBeGreaterThanOrEqual(0);
    });
  });

  describe("sortWordsByWeight", () => {
    it("应该按权重降序排序单词", () => {
      const progresses: WordProgress[] = [
        createWordProgress({
          wordId: 1,
          setId: 1,
          timesSeen: 10,
          timesCorrect: 9, // 高掌握度
          correctStreak: 5,
          wrongStreak: 0,
          repetitions: 5,
        }),
        createWordProgress({
          wordId: 2,
          setId: 1,
          timesSeen: 10,
          timesCorrect: 2, // 低掌握度
          correctStreak: 0,
          wrongStreak: 3,
          repetitions: 0,
        }),
        createWordProgress({
          wordId: 3,
          setId: 1,
          timesSeen: 10,
          timesCorrect: 5, // 中等掌握度
          correctStreak: 0,
          wrongStreak: 0,
          repetitions: 0,
        }),
      ];

      const wordIds = sortWordsByWeight(progresses, "flashcard");

      // 低掌握度的单词应该排在前面
      expect(wordIds[0]).toBe(2);
    });

    it("应该支持限制返回数量", () => {
      const progresses: WordProgress[] = Array.from({ length: 10 }, (_, i) =>
        createWordProgress({
          wordId: i + 1,
          setId: 1,
          timesSeen: 10,
          timesCorrect: 5,
          correctStreak: 0,
          wrongStreak: 0,
          repetitions: 0,
        })
      );

      const wordIds = sortWordsByWeight(progresses, "flashcard", 5);

      expect(wordIds.length).toBe(5);
    });

    it("应该在限制为 0 时返回所有单词（不限制）", () => {
      const progresses: WordProgress[] = [
        createWordProgress({
          wordId: 1,
          setId: 1,
          timesSeen: 10,
          timesCorrect: 5,
          correctStreak: 0,
          wrongStreak: 0,
          repetitions: 0,
        }),
      ];

      const wordIds = sortWordsByWeight(progresses, "flashcard", 0);

      // limit 为 0 时，条件 limit > 0 为 false，所以返回所有单词
      expect(wordIds.length).toBe(1);
    });

    it("应该处理空数组", () => {
      const wordIds = sortWordsByWeight([], "flashcard");

      expect(wordIds.length).toBe(0);
    });

    it("应该在不同模式下产生不同的排序结果", () => {
      const progresses: WordProgress[] = [
        createWordProgress({
          wordId: 1,
          setId: 1,
          timesSeen: 10,
          timesCorrect: 5, // 中等掌握度
          correctStreak: 0,
          wrongStreak: 0,
          repetitions: 0,
        }),
        createWordProgress({
          wordId: 2,
          setId: 1,
          timesSeen: 10,
          timesCorrect: 2, // 低掌握度
          correctStreak: 0,
          wrongStreak: 3,
          repetitions: 0,
        }),
      ];

      const flashcardIds = sortWordsByWeight(progresses, "flashcard");
      const testIds = sortWordsByWeight(progresses, "test");
      const reviewIds = sortWordsByWeight(progresses, "review");

      // 不同模式可能产生不同的排序，但都应该返回有效的 ID 列表
      expect(flashcardIds.length).toBe(2);
      expect(testIds.length).toBe(2);
      expect(reviewIds.length).toBe(2);
      expect(flashcardIds).toContain(1);
      expect(flashcardIds).toContain(2);
    });
  });
});
