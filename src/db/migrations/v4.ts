/**
 * 数据库版本 4 迁移
 * 添加复习计划表（支持艾宾浩斯遗忘曲线）
 */

import type { Migration } from "./types";
import type { Dexie } from "dexie";
import type { ReviewPlan } from "../../db";

export const v4Migration: Migration = {
  version: 4,
  description: "添加复习计划表（支持艾宾浩斯遗忘曲线）",
  async up(db: Dexie) {
    await db.transaction(
      "rw",
      ["wordSets", "words", "reviewPlans"],
      async (trans) => {
        const wordSetsTable = trans.table("wordSets");
        const wordsTable = trans.table("words");
        const reviewPlansTable = trans.table("reviewPlans");

        const allWordSets = await wordSetsTable.toArray();
        const now = new Date();

        for (const wordSet of allWordSets) {
          // 检查是否已存在复习计划（防止重复创建）
          const existing = await reviewPlansTable
            .where("wordSetId")
            .equals(wordSet.id)
            .first();

          if (!existing) {
            // 统计该单词集的单词数
            const wordCount = await wordsTable
              .where("setId")
              .equals(wordSet.id)
              .count();

            // 创建初始复习计划（阶段1，1小时后复习）
            const firstReviewTime = new Date(now);
            firstReviewTime.setHours(firstReviewTime.getHours() + 1);

            await reviewPlansTable.add({
              wordSetId: wordSet.id,
              reviewStage: 1,
              nextReviewAt: firstReviewTime.toISOString(),
              completedStages: [],
              startedAt: now.toISOString(),
              isCompleted: false,
              totalWords: wordCount,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            } as ReviewPlan);
          }
        }
      }
    );
  },
  async down(db: Dexie) {
    // v4 的回滚：删除复习计划表
    await db.transaction("rw", ["reviewPlans"], async (trans) => {
      await trans.table("reviewPlans").clear();
    });
  },
};
