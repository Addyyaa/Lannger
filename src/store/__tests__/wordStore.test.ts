/**
 * 单词数据操作测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createWordSet,
  createWord,
  getAllWordSets,
  getAllWords,
  fuzzySearchWordSets,
  fuzzySearchWords,
  getWordSet,
  getWord,
  updateWordSet,
  updateWord,
  deleteWordSet,
  deleteWord,
  getWordsByWordSet,
  ensureUserSettingsRecord,
} from "../wordStore";
import { db } from "../../db";

describe("wordStore", () => {
  beforeEach(async () => {
    // 清理所有表数据
    await db.wordSets.clear();
    await db.words.clear();
    await db.userSettings.clear();
    await db.wordProgress.clear();
  });

  describe("createWordSet", () => {
    it("应该创建新的单词集", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });

      expect(wordSetId).toBeDefined();
      expect(typeof wordSetId).toBe("number");

      const wordSet = await db.wordSets.get(wordSetId);
      expect(wordSet).toBeDefined();
      expect(wordSet?.name).toBe("测试单词集");
      expect(wordSet?.createdAt).toBeDefined();
      expect(wordSet?.updatedAt).toBeDefined();
    });

    it("应该创建带标记的单词集", async () => {
      const wordSetId = await createWordSet({
        name: "测试单词集",
        mark: "重要",
      });

      const wordSet = await db.wordSets.get(wordSetId);
      expect(wordSet?.mark).toBe("重要");
    });
  });

  describe("createWord", () => {
    it("应该创建新的单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });

      const wordId = await createWord({
        kana: "テスト",
        meaning: "测试",
        setId: wordSetId,
      });

      expect(wordId).toBeDefined();
      expect(typeof wordId).toBe("number");

      const word = await db.words.get(wordId);
      expect(word).toBeDefined();
      expect(word?.kana).toBe("テスト");
      expect(word?.meaning).toBe("测试");
      expect(word?.setId).toBe(wordSetId);
      expect(word?.type).toBe("undefined"); // 默认类型
      expect(word?.createdAt).toBeDefined();
      expect(word?.updatedAt).toBeDefined();
    });

    it("应该在未指定 setId 时使用默认单词集", async () => {
      const wordId = await createWord({
        kana: "テスト",
        meaning: "测试",
      });

      const word = await db.words.get(wordId);
      expect(word?.setId).toBeDefined();
      expect(word?.setId).toBe(0); // 默认单词集ID
    });

    it("应该创建带假名和汉字的单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });

      const wordId = await createWord({
        kana: "テスト",
        kanji: "試験",
        meaning: "测试",
        setId: wordSetId,
        type: "名词",
      });

      const word = await db.words.get(wordId);
      expect(word?.kana).toBe("テスト");
      expect(word?.kanji).toBe("試験");
      expect(word?.type).toBe("名词");
    });
  });

  describe("getAllWordSets", () => {
    it("应该返回所有单词集", async () => {
      await createWordSet({ name: "单词集1" });
      await createWordSet({ name: "单词集2" });

      const wordSets = await getAllWordSets();

      // 注意：可能包含默认单词集（ID=0）
      expect(wordSets.length).toBeGreaterThanOrEqual(2);
      const names = wordSets.map((ws) => ws.name);
      expect(names).toContain("单词集1");
      expect(names).toContain("单词集2");
    });

    it("应该返回空数组当没有单词集时", async () => {
      const wordSets = await getAllWordSets();
      // 注意：可能会有默认单词集
      expect(Array.isArray(wordSets)).toBe(true);
    });
  });

  describe("getAllWords", () => {
    it("应该返回所有单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      await createWord({ kana: "テスト1", meaning: "测试1", setId: wordSetId });
      await createWord({ kana: "テスト2", meaning: "测试2", setId: wordSetId });

      const words = await getAllWords();

      expect(words.length).toBeGreaterThanOrEqual(2);
      expect(words.some((w) => w.kana === "テスト1")).toBe(true);
      expect(words.some((w) => w.kana === "テスト2")).toBe(true);
    });

    it("应该返回空数组当没有单词时", async () => {
      const words = await getAllWords();
      expect(Array.isArray(words)).toBe(true);
    });
  });

  describe("fuzzySearchWordSets", () => {
    it("应该根据名称搜索单词集", async () => {
      await createWordSet({ name: "日语基础" });
      await createWordSet({ name: "英语进阶" });
      await createWordSet({ name: "日语进阶" });

      const results = await fuzzySearchWordSets("日语");

      expect(results.length).toBe(2);
      expect(results.every((ws) => ws.name.includes("日语"))).toBe(true);
    });

    it("应该返回空数组当没有匹配时", async () => {
      await createWordSet({ name: "日语基础" });

      const results = await fuzzySearchWordSets("英语");

      expect(results.length).toBe(0);
    });
  });

  describe("fuzzySearchWords", () => {
    it("应该根据假名搜索单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      await createWord({ kana: "テスト", meaning: "测试", setId: wordSetId });
      await createWord({ kana: "テキスト", meaning: "文本", setId: wordSetId });

      const results = await fuzzySearchWords("テスト");

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((w) => w.kana === "テスト")).toBe(true);
    });

    it("应该根据意思搜索单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      await createWord({ kana: "テスト", meaning: "测试", setId: wordSetId });
      await createWord({ kana: "テキスト", meaning: "文本", setId: wordSetId });

      const results = await fuzzySearchWords("测试");

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((w) => w.meaning === "测试")).toBe(true);
    });

    it("应该根据汉字搜索单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      await createWord({
        kana: "テスト",
        kanji: "試験",
        meaning: "测试",
        setId: wordSetId,
      });

      const results = await fuzzySearchWords("試験");

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((w) => w.kanji === "試験")).toBe(true);
    });

    it("应该限制返回结果数量", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      for (let i = 0; i < 10; i++) {
        await createWord({
          kana: `テスト${i}`,
          meaning: `测试${i}`,
          setId: wordSetId,
        });
      }

      const results = await fuzzySearchWords("テスト", undefined, 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("应该只在指定单词集内搜索", async () => {
      const wordSetId1 = await createWordSet({ name: "单词集1" });
      const wordSetId2 = await createWordSet({ name: "单词集2" });
      await createWord({ kana: "テスト", meaning: "测试", setId: wordSetId1 });
      await createWord({ kana: "テスト", meaning: "测试", setId: wordSetId2 });

      const results = await fuzzySearchWords("テスト", wordSetId1);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((w) => w.setId === wordSetId1)).toBe(true);
    });

    it("应该返回空数组当查询为空时", async () => {
      const results = await fuzzySearchWords("");
      expect(results.length).toBe(0);
    });
  });

  describe("getWordSet", () => {
    it("应该返回指定的单词集", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });

      const wordSet = await getWordSet(wordSetId);

      expect(wordSet).toBeDefined();
      if (wordSet) {
        expect(wordSet.id).toBe(wordSetId);
        expect(wordSet.name).toBe("测试单词集");
      }
    });

    it("应该返回 undefined 当单词集不存在时", async () => {
      const wordSet = await getWordSet(999);
      expect(wordSet).toBeUndefined();
    });
  });

  describe("getWord", () => {
    it("应该返回指定的单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      const wordId = await createWord({
        kana: "テスト",
        meaning: "测试",
        setId: wordSetId,
      });

      const word = await getWord(wordId);

      expect(word).toBeDefined();
      expect(word?.id).toBe(wordId);
      expect(word?.kana).toBe("テスト");
    });

    it("应该返回 undefined 当单词不存在时", async () => {
      const word = await getWord(999);
      expect(word).toBeUndefined();
    });
  });

  describe("updateWordSet", () => {
    it("应该更新单词集", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      let wordSet = await db.wordSets.get(wordSetId);
      expect(wordSet).toBeDefined();

      if (wordSet) {
        const updated = { ...wordSet, name: "更新后的名称" };
        await updateWordSet(updated);

        wordSet = await db.wordSets.get(wordSetId);
        expect(wordSet?.name).toBe("更新后的名称");
        expect(wordSet?.updatedAt).toBeDefined();
      }
    });
  });

  describe("updateWord", () => {
    it("应该更新单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      const wordId = await createWord({
        kana: "テスト",
        meaning: "测试",
        setId: wordSetId,
      });
      const word = await db.words.get(wordId);
      expect(word).toBeDefined();

      if (word) {
        const updated = { ...word, meaning: "更新后的意思" };
        await updateWord(updated);

        const result = await db.words.get(wordId);
        expect(result?.meaning).toBe("更新后的意思");
      }
    });
  });

  describe("deleteWordSet", () => {
    it("应该删除单词集", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      // 确保不是默认单词集（ID=0）
      expect(wordSetId).not.toBe(0);

      const deleted = await deleteWordSet(wordSetId);

      expect(deleted).toBe(true);
      const wordSet = await db.wordSets.get(wordSetId);
      expect(wordSet).toBeUndefined();
    });

    it("不应该删除默认单词集", async () => {
      // 尝试删除默认单词集（ID=0）应该抛出错误
      await expect(deleteWordSet(0)).rejects.toThrow();
    });

    it("应该级联删除单词集中的单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      const wordId = await createWord({
        kana: "テスト",
        meaning: "测试",
        setId: wordSetId,
      });

      await deleteWordSet(wordSetId);

      const word = await db.words.get(wordId);
      expect(word).toBeUndefined();
    });
  });

  describe("deleteWord", () => {
    it("应该删除单词", async () => {
      const wordSetId = await createWordSet({ name: "测试单词集" });
      const wordId = await createWord({
        kana: "テスト",
        meaning: "测试",
        setId: wordSetId,
      });

      const deleted = await deleteWord(wordId);

      expect(deleted).toBe(true);
      const word = await db.words.get(wordId);
      expect(word).toBeUndefined();
    });
  });

  describe("getWordsByWordSet", () => {
    it("应该返回指定单词集的所有单词", async () => {
      const wordSetId1 = await createWordSet({ name: "单词集1" });
      const wordSetId2 = await createWordSet({ name: "单词集2" });
      await createWord({
        kana: "テスト1",
        meaning: "测试1",
        setId: wordSetId1,
      });
      await createWord({
        kana: "テスト2",
        meaning: "测试2",
        setId: wordSetId1,
      });
      await createWord({
        kana: "テスト3",
        meaning: "测试3",
        setId: wordSetId2,
      });

      const words = await getWordsByWordSet(wordSetId1);

      expect(words.length).toBe(2);
      expect(words.every((w) => w.setId === wordSetId1)).toBe(true);
    });

    it("应该返回空数组当单词集没有单词时", async () => {
      const wordSetId = await createWordSet({ name: "空单词集" });

      const words = await getWordsByWordSet(wordSetId);

      expect(words.length).toBe(0);
    });
  });

  describe("ensureUserSettingsRecord", () => {
    it("应该创建用户设置记录（如果不存在）", async () => {
      const settings = await ensureUserSettingsRecord();

      expect(settings).toBeDefined();
      expect(settings.id).toBe(1);
      expect(settings.currentMode).toBe("flashcard");
      expect(settings.dailyGoal).toBe(20);
    });

    it("应该返回已存在的用户设置记录", async () => {
      await ensureUserSettingsRecord();
      const settings1 = await ensureUserSettingsRecord();

      const settings2 = await db.userSettings.get(1);
      expect(settings2).toBeDefined();
      expect(settings1.id).toBe(settings2?.id);
    });
  });
});
