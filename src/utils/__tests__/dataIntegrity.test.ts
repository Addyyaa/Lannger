/**
 * 数据完整性工具测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  validateDataIntegrity,
  fixDataIntegrity,
  cleanupDailyStatsLearnedWordIds,
  cleanupReviewPlansLearnedWordIds,
} from "../dataIntegrity";
import { db } from "../../db";

describe("dataIntegrity", () => {
  beforeEach(async () => {
    // 清空所有表
    await db.words.clear();
    await db.wordSets.clear();
    await db.wordProgress.clear();
    await db.reviewLogs.clear();
    await db.reviewPlans.clear();
    await db.dailyStats.clear();
  });

  describe("validateDataIntegrity", () => {
    it("应该在没有问题时返回 valid: true", async () => {
      // 创建有效的单词集和单词
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.wordProgress.add({
        wordId: 1,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      });

      const result = await validateDataIntegrity();

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
      expect(result.summary.totalIssues).toBe(0);
    });

    it("应该检测 wordProgress 中的孤立记录", async () => {
      // 创建单词集，但不创建对应的单词
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 创建孤立的 wordProgress 记录（wordId 不存在）
      await db.wordProgress.add({
        wordId: 999, // 不存在的 wordId
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      });

      const result = await validateDataIntegrity();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].type).toBe("orphaned_record");
      expect(result.issues[0].table).toBe("wordProgress");
      expect(result.issues[0].severity).toBe("high");
      expect(result.summary.byType["orphaned_record"]).toBe(1);
    });

    it("应该检测 wordProgress.setId 与 words.setId 不一致", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.wordSets.add({
        id: 2,
        name: "测试单词集2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1, // 单词属于单词集1
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // wordProgress 的 setId 与 word 的 setId 不一致
      await db.wordProgress.add({
        wordId: 1,
        setId: 2, // 不一致的 setId
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      });

      const result = await validateDataIntegrity();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].type).toBe("inconsistent_data");
      expect(result.issues[0].table).toBe("wordProgress");
      expect(result.issues[0].field).toBe("setId");
      expect(result.issues[0].severity).toBe("medium");
    });

    it("应该检测 reviewLogs 中的孤立记录", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 创建孤立的 reviewLogs 记录
      await db.reviewLogs.add({
        id: 1,
        wordId: 999, // 不存在的 wordId
        result: "correct",
        timestamp: new Date().toISOString(),
        mode: "review",
      });

      const result = await validateDataIntegrity();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].type).toBe("orphaned_record");
      expect(result.issues[0].table).toBe("reviewLogs");
      expect(result.issues[0].severity).toBe("medium");
    });

    it("应该检测 dailyStats.learnedWordIds 中的无效引用", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // dailyStats 包含无效的 wordId
      await db.dailyStats.add({
        date: "2024-01-01",
        learnedCount: 1,
        reviewedCount: 0,
        testedCount: 0,
        correctCount: 0,
        learnedWordIds: [1, 999], // 999 是无效的 wordId
        updatedAt: new Date().toISOString(),
      });

      const result = await validateDataIntegrity();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].type).toBe("array_invalid_item");
      expect(result.issues[0].table).toBe("dailyStats");
      expect(result.issues[0].field).toBe("learnedWordIds");
      expect(result.issues[0].severity).toBe("low");
    });

    it("应该检测 reviewPlans.learnedWordIds 中的无效引用", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // reviewPlans 包含无效的 wordId
      await db.reviewPlans.add({
        id: 1,
        wordSetId: 1,
        reviewStage: 1,
        learnedWordIds: [1, 999], // 999 是无效的 wordId
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 2,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await validateDataIntegrity();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].type).toBe("array_invalid_item");
      expect(result.issues[0].table).toBe("reviewPlans");
      expect(result.issues[0].field).toBe("learnedWordIds");
      expect(result.issues[0].severity).toBe("medium");
    });

    it("应该检测 reviewPlans 中的孤立记录（wordSetId 不存在）", async () => {
      // 不创建单词集，直接创建 reviewPlans
      await db.reviewPlans.add({
        id: 1,
        wordSetId: 999, // 不存在的 wordSetId
        reviewStage: 1,
        learnedWordIds: [],
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 0,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await validateDataIntegrity();

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].type).toBe("orphaned_record");
      expect(result.issues[0].table).toBe("reviewPlans");
      expect(result.issues[0].severity).toBe("high");
    });

    it("应该正确统计问题摘要", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 创建多个问题
      await db.wordProgress.add({
        wordId: 999,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      });

      await db.reviewLogs.add({
        id: 1,
        wordId: 998,
        result: "correct",
        timestamp: new Date().toISOString(),
        mode: "review",
      });

      const result = await validateDataIntegrity();

      expect(result.summary.totalIssues).toBe(2);
      expect(result.summary.byType["orphaned_record"]).toBe(2);
      expect(result.summary.bySeverity["high"]).toBe(1);
      expect(result.summary.bySeverity["medium"]).toBe(1);
    });
  });

  describe("fixDataIntegrity", () => {
    it("应该在 dryRun 模式下只返回修复计划", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.wordProgress.add({
        wordId: 999,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      });

      const result = await fixDataIntegrity(true);

      expect(result.fixed).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.details.length).toBe(1);
      expect(result.details[0].fixed).toBe(false);

      // 验证数据未被修改
      const progress = await db.wordProgress.toArray();
      expect(progress.length).toBe(1);
    });

    it("应该删除孤立的 wordProgress 记录", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.wordProgress.add({
        wordId: 999,
        setId: 1,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      });

      const result = await fixDataIntegrity(false);

      expect(result.fixed).toBe(1);
      expect(result.errors).toBe(0);

      // 验证记录已被删除
      const progress = await db.wordProgress.toArray();
      expect(progress.length).toBe(0);
    });

    it("应该修复 wordProgress.setId 不一致问题", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.wordProgress.add({
        wordId: 1,
        setId: 2, // 不一致的 setId
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
      });

      const result = await fixDataIntegrity(false);

      expect(result.fixed).toBe(1);
      expect(result.errors).toBe(0);

      // 验证 setId 已被修复
      const progress = await db.wordProgress.toArray();
      expect(progress[0].setId).toBe(1);
    });

    it("应该从 dailyStats.learnedWordIds 中移除无效引用", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.dailyStats.add({
        date: "2024-01-01",
        learnedCount: 2,
        reviewedCount: 0,
        testedCount: 0,
        correctCount: 0,
        learnedWordIds: [1, 999], // 999 是无效的
        updatedAt: new Date().toISOString(),
      });

      const result = await fixDataIntegrity(false);

      expect(result.fixed).toBe(1);
      expect(result.errors).toBe(0);

      // 验证无效引用已被移除
      const stat = await db.dailyStats.get("2024-01-01");
      expect(stat?.learnedWordIds).toEqual([1]);
    });

    it("应该从 reviewPlans.learnedWordIds 中移除无效引用", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.reviewPlans.add({
        id: 1,
        wordSetId: 1,
        reviewStage: 1,
        learnedWordIds: [1, 999], // 999 是无效的
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 2,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await fixDataIntegrity(false);

      expect(result.fixed).toBe(1);
      expect(result.errors).toBe(0);

      // 验证无效引用已被移除
      const plan = await db.reviewPlans.get(1);
      expect(plan?.learnedWordIds).toEqual([1]);
    });

    it("应该删除孤立的 reviewLogs 记录", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.reviewLogs.add({
        id: 1,
        wordId: 999,
        result: "correct",
        timestamp: new Date().toISOString(),
        mode: "review",
      });

      const result = await fixDataIntegrity(false);

      expect(result.fixed).toBe(1);
      expect(result.errors).toBe(0);

      // 验证记录已被删除
      const logs = await db.reviewLogs.toArray();
      expect(logs.length).toBe(0);
    });

    it("应该删除孤立的 reviewPlans 记录", async () => {
      await db.reviewPlans.add({
        id: 1,
        wordSetId: 999, // 不存在的 wordSetId
        reviewStage: 1,
        learnedWordIds: [],
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 0,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await fixDataIntegrity(false);

      expect(result.fixed).toBe(1);
      expect(result.errors).toBe(0);

      // 验证记录已被删除
      const plans = await db.reviewPlans.toArray();
      expect(plans.length).toBe(0);
    });
  });

  describe("cleanupDailyStatsLearnedWordIds", () => {
    it("应该清理所有 dailyStats 中的无效引用", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.dailyStats.add({
        date: "2024-01-01",
        learnedCount: 2,
        reviewedCount: 0,
        testedCount: 0,
        correctCount: 0,
        learnedWordIds: [1, 999], // 999 是无效的
        updatedAt: new Date().toISOString(),
      });

      await db.dailyStats.add({
        date: "2024-01-02",
        learnedCount: 1,
        reviewedCount: 0,
        testedCount: 0,
        correctCount: 0,
        learnedWordIds: [998], // 998 是无效的
        updatedAt: new Date().toISOString(),
      });

      const cleaned = await cleanupDailyStatsLearnedWordIds();

      expect(cleaned).toBe(2);

      // 验证无效引用已被移除
      const stat1 = await db.dailyStats.get("2024-01-01");
      expect(stat1?.learnedWordIds).toEqual([1]);

      const stat2 = await db.dailyStats.get("2024-01-02");
      expect(stat2?.learnedWordIds).toEqual([]);
    });

    it("应该只清理指定日期的记录", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.dailyStats.add({
        date: "2024-01-01",
        learnedCount: 1,
        reviewedCount: 0,
        testedCount: 0,
        correctCount: 0,
        learnedWordIds: [1, 999], // 999 是无效的
        updatedAt: new Date().toISOString(),
      });

      await db.dailyStats.add({
        date: "2024-01-02",
        learnedCount: 1,
        reviewedCount: 0,
        testedCount: 0,
        correctCount: 0,
        learnedWordIds: [998], // 998 是无效的
        updatedAt: new Date().toISOString(),
      });

      const cleaned = await cleanupDailyStatsLearnedWordIds("2024-01-01");

      expect(cleaned).toBe(1);

      // 验证只有指定日期的记录被清理
      const stat1 = await db.dailyStats.get("2024-01-01");
      expect(stat1?.learnedWordIds).toEqual([1]);

      const stat2 = await db.dailyStats.get("2024-01-02");
      expect(stat2?.learnedWordIds).toEqual([998]); // 未被清理
    });

    it("应该在没有无效引用时返回 0", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.dailyStats.add({
        date: "2024-01-01",
        learnedCount: 1,
        reviewedCount: 0,
        testedCount: 0,
        correctCount: 0,
        learnedWordIds: [1], // 全部有效
        updatedAt: new Date().toISOString(),
      });

      const cleaned = await cleanupDailyStatsLearnedWordIds();

      expect(cleaned).toBe(0);
    });
  });

  describe("cleanupReviewPlansLearnedWordIds", () => {
    it("应该清理所有 reviewPlans 中的无效引用", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.reviewPlans.add({
        id: 1,
        wordSetId: 1,
        reviewStage: 1,
        learnedWordIds: [1, 999], // 999 是无效的
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 2,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.reviewPlans.add({
        id: 2,
        wordSetId: 1,
        reviewStage: 2,
        learnedWordIds: [998], // 998 是无效的
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 1,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cleaned = await cleanupReviewPlansLearnedWordIds();

      expect(cleaned).toBe(2);

      // 验证无效引用已被移除
      const plan1 = await db.reviewPlans.get(1);
      expect(plan1?.learnedWordIds).toEqual([1]);

      const plan2 = await db.reviewPlans.get(2);
      expect(plan2?.learnedWordIds).toEqual([]);
    });

    it("应该只清理指定单词集的计划", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.wordSets.add({
        id: 2,
        name: "测试单词集2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.reviewPlans.add({
        id: 1,
        wordSetId: 1,
        reviewStage: 1,
        learnedWordIds: [1, 999], // 999 是无效的
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 2,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.reviewPlans.add({
        id: 2,
        wordSetId: 2,
        reviewStage: 1,
        learnedWordIds: [998], // 998 是无效的
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 1,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cleaned = await cleanupReviewPlansLearnedWordIds(1);

      expect(cleaned).toBe(1);

      // 验证只有指定单词集的计划被清理
      const plan1 = await db.reviewPlans.get(1);
      expect(plan1?.learnedWordIds).toEqual([1]);

      const plan2 = await db.reviewPlans.get(2);
      expect(plan2?.learnedWordIds).toEqual([998]); // 未被清理
    });

    it("应该在没有无效引用时返回 0", async () => {
      await db.wordSets.add({
        id: 1,
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.words.add({
        id: 1,
        kana: "test",
        meaning: "测试",
        setId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await db.reviewPlans.add({
        id: 1,
        wordSetId: 1,
        reviewStage: 1,
        learnedWordIds: [1], // 全部有效
        nextReviewAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 1,
        completedStages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const cleaned = await cleanupReviewPlansLearnedWordIds();

      expect(cleaned).toBe(0);
    });
  });
});
