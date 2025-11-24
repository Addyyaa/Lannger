/**
 * 数据库版本 1 迁移
 * 初始版本：创建 wordSets 和 words 表
 */

import type { Migration } from "./types";
import type { Dexie } from "dexie";
import {
  DEFAULT_WORD_SET_ID,
  DEFAULT_WORD_SET_NAME,
  DEFAULT_WORD_TYPE,
} from "../../db";

export const v1Migration: Migration = {
  version: 1,
  description: "初始版本：创建 wordSets 和 words 表，初始化默认单词集",
  async up(db: Dexie) {
    // v1 的迁移逻辑已经在 Dexie 的 version(1).stores() 中定义
    // 这里只需要处理数据初始化
    await db.transaction("rw", ["wordSets", "words"], async (trans) => {
      const wordSetsTable = trans.table("wordSets");
      const wordsTable = trans.table("words");

      // 确保默认单词集存在
      const defaultWordSet = await wordSetsTable.get(DEFAULT_WORD_SET_ID);
      if (!defaultWordSet) {
        await wordSetsTable.put({
          id: DEFAULT_WORD_SET_ID,
          name: DEFAULT_WORD_SET_NAME,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 为没有 type 的单词设置默认 type
      const words = await wordsTable.toArray();
      for (const word of words) {
        if (word.type === undefined || word.type === null) {
          await wordsTable.update(word.id, { type: DEFAULT_WORD_TYPE });
        }
      }
    });
  },
  async down(db: Dexie) {
    // v1 的回滚：删除所有数据
    await db.transaction("rw", ["wordSets", "words"], async (trans) => {
      await trans.table("wordSets").clear();
      await trans.table("words").clear();
    });
  },
};
