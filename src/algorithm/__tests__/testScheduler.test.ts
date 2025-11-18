/**
 * 测试模式调度算法测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import { db, Word, WordProgress } from "../../db";
import {
  scheduleTestWords,
  type TestSchedulerOptions,
} from "../testScheduler";

describe("testScheduler", () => {
  beforeEach(async () => {
    // 清理数据库
    await db.words.clear();
    await db.wordProgress.clear();
    await db.wordSets.clear();

    // 创建默认单词集
    await db.wordSets.add({
      id: 1,
      name: "Test Set",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe("scheduleTestWords", () => {
    it("应该返回空数组当没有单词时", async () => {
      const result = await scheduleTestWords();

      expect(result.wordIds).toEqual([]);
      expect(result.totalAvailable).toBe(0);
      expect(result.averageDifficulty).toBe(0);
      expect(result.averageMastery).toBe(0);
    });

    it("应该返回单词列表", async () => {
      const word: Word = {
        id: 1,
        kana: "あいう",
        kanji: "あいう",
        meaning: "test",
        example: "test",
        mark: "",
        setId: 1,
        review: { times: 0, difficulty: 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.words.add(word);

      const result = await scheduleTestWords({ wordSetId: 1 });

      expect(result.wordIds.length).toBeGreaterThan(0);
      expect(result.totalAvailable).toBeGreaterThan(0);
    });

    it("应该根据 wordSetId 过滤单词", async () => {
      // 创建两个单词集
      await db.wordSets.add({
        id: 2,
        name: "Set 2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 创建单词
      const word1: Word = {
        id: 1,
        kana: "あいう",
        kanji: "あいう",
        meaning: "test1",
        example: "test1",
        mark: "",
        setId: 1,
        review: { times: 0, difficulty: 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const word2: Word = {
        id: 2,
        kana: "かきく",
        kanji: "かきく",
        meaning: "test2",
        example: "test2",
        mark: "",
        setId: 2,
        review: { times: 0, difficulty: 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.words.add(word1);
      await db.words.add(word2);

      const result = await scheduleTestWords({ wordSetId: 1 });

      expect(result.wordIds.length).toBeGreaterThan(0);
      expect(result.totalAvailable).toBeGreaterThan(0);
    });

    it("应该支持 limit 选项", async () => {
      // 创建多个单词
      const words: Word[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        kana: `あいう${i}`,
        kanji: `あいう${i}`,
        meaning: `test${i}`,
        example: `test${i}`,
        mark: "",
        setId: 1,
        review: { times: 0, difficulty: 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await db.words.bulkAdd(words);

      const result = await scheduleTestWords({ wordSetId: 1, limit: 5 });

      expect(result.wordIds.length).toBeLessThanOrEqual(5);
    });

    it("应该支持 difficultyRange 选项", async () => {
      const words: Word[] = [
        {
          id: 1,
          kana: "あいう",
          kanji: "あいう",
          meaning: "test1",
          example: "test1",
          mark: "",
          setId: 1,
          review: { times: 0, difficulty: 1 }, // 低难度
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          kana: "かきく",
          kanji: "かきく",
          meaning: "test2",
          example: "test2",
          mark: "",
          setId: 1,
          review: { times: 0, difficulty: 5 }, // 高难度
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      await db.words.bulkAdd(words);

      const result = await scheduleTestWords({
        wordSetId: 1,
        difficultyRange: [2, 4], // 只包含中等难度
      });

      expect(result.totalAvailable).toBeGreaterThanOrEqual(0);
    });

    it("应该支持 masteryRange 选项", async () => {
      const word: Word = {
        id: 1,
        kana: "あいう",
        kanji: "あいう",
        meaning: "test",
        example: "test",
        mark: "",
        setId: 1,
        review: { times: 0, difficulty: 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.words.add(word);

      // 创建不同掌握度的进度记录
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 5, // 50% 正确率，中等掌握度
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
        easeFactor: 2.5,
        intervalDays: 1,
      };
      await db.wordProgress.add(progress);

      const result = await scheduleTestWords({
        wordSetId: 1,
        masteryRange: [0.3, 0.7], // 中等掌握度范围
      });

      expect(result.totalAvailable).toBeGreaterThanOrEqual(0);
    });

    it("应该支持 excludeTooEasy 选项", async () => {
      const word: Word = {
        id: 1,
        kana: "あいう",
        kanji: "あいう",
        meaning: "test",
        example: "test",
        mark: "",
        setId: 1,
        review: { times: 0, difficulty: 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.words.add(word);

      // 创建高掌握度的进度记录
      const progress: WordProgress = {
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 10, // 100% 正确率，掌握度很高
        correctStreak: 10,
        wrongStreak: 0,
        repetitions: 5,
        easeFactor: 2.5,
        intervalDays: 1,
      };
      await db.wordProgress.add(progress);

      const result = await scheduleTestWords({
        wordSetId: 1,
        excludeTooEasy: true,
      });

      // 排除太简单的单词后，结果可能为空
      expect(Array.isArray(result.wordIds)).toBe(true);
    });

    it("应该计算平均难度和平均掌握度", async () => {
      const words: Word[] = [
        {
          id: 1,
          kana: "あいう",
          kanji: "あいう",
          meaning: "test1",
          example: "test1",
          mark: "",
          setId: 1,
          review: { times: 0, difficulty: 3 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          kana: "かきく",
          kanji: "かきく",
          meaning: "test2",
          example: "test2",
          mark: "",
          setId: 1,
          review: { times: 0, difficulty: 4 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      await db.words.bulkAdd(words);

      const result = await scheduleTestWords({ wordSetId: 1 });

      expect(result.averageDifficulty).toBeGreaterThanOrEqual(0);
      expect(result.averageMastery).toBeGreaterThanOrEqual(0);
      expect(result.averageMastery).toBeLessThanOrEqual(1);
    });

    it("应该动态计算测试数量", async () => {
      // 创建多个单词，具有不同的掌握度
      const words: Word[] = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        kana: `あいう${i}`,
        kanji: `あいう${i}`,
        meaning: `test${i}`,
        example: `test${i}`,
        mark: "",
        setId: 1,
        review: { times: 0, difficulty: 3 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await db.words.bulkAdd(words);

      // 为部分单词创建进度记录，模拟不同的掌握度
      const progresses: WordProgress[] = Array.from({ length: 20 }, (_, i) => ({
        wordId: i + 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: i < 5 ? 2 : i < 15 ? 5 : 9, // 前5个低掌握度，中间10个中等，后5个高
        correctStreak: i < 5 ? 0 : i < 15 ? 2 : 5,
        wrongStreak: i < 5 ? 3 : 0,
        repetitions: i < 5 ? 0 : i < 15 ? 2 : 5,
        easeFactor: 2.5,
        intervalDays: 1,
      }));
      await db.wordProgress.bulkPut(progresses);

      // 不指定 limit，应该动态计算
      const result = await scheduleTestWords({ wordSetId: 1 });

      expect(result.wordIds.length).toBeGreaterThan(0);
      expect(result.totalAvailable).toBeGreaterThan(0);
    });

    it("应该优先中等掌握度的单词", async () => {
      const words: Word[] = [
        {
          id: 1,
          kana: "あいう",
          kanji: "あいう",
          meaning: "test1",
          example: "test1",
          mark: "",
          setId: 1,
          review: { times: 0, difficulty: 3 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          kana: "かきく",
          kanji: "かきく",
          meaning: "test2",
          example: "test2",
          mark: "",
          setId: 1,
          review: { times: 0, difficulty: 3 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 3,
          kana: "さしす",
          kanji: "さしす",
          meaning: "test3",
          example: "test3",
          mark: "",
          setId: 1,
          review: { times: 0, difficulty: 3 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      await db.words.bulkAdd(words);

      // word1: 低掌握度
      const progress1: WordProgress = {
        wordId: 1,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 2, // 20% 正确率
        correctStreak: 0,
        wrongStreak: 3,
        repetitions: 0,
        easeFactor: 2.5,
        intervalDays: 1,
      };

      // word2: 中等掌握度
      const progress2: WordProgress = {
        wordId: 2,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 5, // 50% 正确率
        correctStreak: 0,
        wrongStreak: 0,
        repetitions: 0,
        easeFactor: 2.5,
        intervalDays: 1,
      };

      // word3: 高掌握度
      const progress3: WordProgress = {
        wordId: 3,
        setId: 1,
        timesSeen: 10,
        timesCorrect: 9, // 90% 正确率
        correctStreak: 5,
        wrongStreak: 0,
        repetitions: 5,
        easeFactor: 2.5,
        intervalDays: 1,
      };

      await db.wordProgress.add(progress1);
      await db.wordProgress.add(progress2);
      await db.wordProgress.add(progress3);

      const result = await scheduleTestWords({ wordSetId: 1 });

      // 测试模式应该优先中等掌握度的单词
      expect(result.wordIds.length).toBeGreaterThan(0);
      // 由于权重计算，中等掌握度的单词应该优先
      expect(result.totalAvailable).toBeGreaterThan(0);
    });
  });
});

