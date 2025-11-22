/**
 * 数据库版本 2 迁移
 * 扩展表结构以支持学习统计、间隔重复与模式参数
 */

import type { Migration } from "./types";
import type { Dexie } from "dexie";
import type { UserSettings, WordProgress } from "../../db";
import { DEFAULT_WORD_SET_ID } from "../../db";

export const v2Migration: Migration = {
  version: 2,
  description: "扩展表结构以支持学习统计、间隔重复与模式参数",
  async up(db: Dexie) {
    await db.transaction(
      "rw",
      ["userSettings", "words", "wordProgress"],
      async (trans) => {
        const settingsTable = trans.table("userSettings");
        const wordsTable = trans.table("words");
        const progressTable = trans.table("wordProgress");

        // 初始化用户设置（若不存在）
        const existingSettings = await settingsTable.get(1);
        if (!existingSettings) {
          const nowIso = new Date().toISOString();
          await settingsTable.put({
            id: 1,
            currentMode: "flashcard",
            dailyGoal: 20,
            currentStreak: 0,
            longestStreak: 0,
            updatedAt: nowIso,
            createdAt: nowIso,
          } as UserSettings);
        }

        // 将 words 中已有数据迁移到 wordProgress（若不存在）
        const allWords = await wordsTable.toArray();
        const now = new Date();
        for (const w of allWords) {
          if (!w || typeof w.id !== "number") continue;
          const existing = await progressTable.get(w.id);
          if (existing) continue;

          const review = (w as any).review || {
            times: 0,
            difficulty: undefined,
            nextReview: undefined,
          };
          const repetitions = review.times ?? 0;
          const difficulty = review.difficulty ?? undefined;
          const nextReviewAt = review.nextReview ?? undefined;

          const initial: WordProgress = {
            wordId: w.id,
            setId: typeof w.setId === "number" ? w.setId : DEFAULT_WORD_SET_ID,
            easeFactor: 2.5,
            intervalDays: 0,
            repetitions,
            difficulty,
            timesSeen: 0,
            timesCorrect: 0,
            correctStreak: 0,
            wrongStreak: 0,
            lastResult: undefined,
            lastMode: undefined,
            lastReviewedAt: undefined,
            nextReviewAt: nextReviewAt,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
          await progressTable.put(initial);
        }
      }
    );
  },
  async down(db: Dexie) {
    // v2 的回滚：删除新增的表和数据
    await db.transaction(
      "rw",
      [
        "userSettings",
        "wordProgress",
        "studySessions",
        "dailyStats",
        "reviewLogs",
      ],
      async (trans) => {
        await trans.table("userSettings").clear();
        await trans.table("wordProgress").clear();
        await trans.table("studySessions").clear();
        await trans.table("dailyStats").clear();
        await trans.table("reviewLogs").clear();
      }
    );
  },
};
