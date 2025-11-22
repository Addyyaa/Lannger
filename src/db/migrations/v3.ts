/**
 * 数据库版本 3 迁移
 * 添加答题速度支持
 */

import type { Migration } from "./types";
import type { Dexie } from "dexie";

export const v3Migration: Migration = {
  version: 3,
  description: "添加答题速度支持",
  async up(db: Dexie) {
    // v3 升级：为现有的 wordProgress 记录添加答题速度字段的默认值
    await db.transaction("rw", ["wordProgress"], async (trans) => {
      const progressTable = trans.table("wordProgress");
      const allProgress = await progressTable.toArray();

      for (const progress of allProgress) {
        if ((progress as any).averageResponseTime === undefined) {
          await progressTable.update(progress.wordId, {
            averageResponseTime: undefined,
            lastResponseTime: undefined,
            fastResponseCount: 0,
            slowResponseCount: 0,
          });
        }
      }
    });
  },
  async down(db: Dexie) {
    // v3 的回滚：移除答题速度字段（实际上不需要操作，因为字段是可选的）
    // 但为了完整性，我们可以清除这些字段的值
    await db.transaction(
      "rw",
      ["wordProgress", "reviewLogs"],
      async (trans) => {
        const progressTable = trans.table("wordProgress");
        const allProgress = await progressTable.toArray();

        for (const progress of allProgress) {
          const updated: any = { ...progress };
          delete updated.averageResponseTime;
          delete updated.lastResponseTime;
          delete updated.fastResponseCount;
          delete updated.slowResponseCount;
          await progressTable.put(updated);
        }

        const reviewLogsTable = trans.table("reviewLogs");
        const allLogs = await reviewLogsTable.toArray();
        for (const log of allLogs) {
          const updated: any = { ...log };
          delete updated.responseTime;
          await reviewLogsTable.put(updated);
        }
      }
    );
  },
};
