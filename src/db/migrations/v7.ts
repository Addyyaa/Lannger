/**
 * 数据库版本 7 迁移
 * 添加复习日志归档表（用于归档 90-365 天的日志）
 */

import type { Migration } from "./types";
import type { Dexie } from "dexie";

export const v7Migration: Migration = {
  version: 7,
  description: "添加复习日志归档表（用于归档 90-365 天的日志）",
  async up(_db: Dexie) {
    // v7 升级：只添加新表，无需数据迁移
    // 归档功能将在后续通过 archiveReviewLogs() 函数执行
    console.log("数据库升级到 v7：复习日志归档表已创建");
  },
  async down(_db: Dexie) {
    // v7 的回滚：删除归档表
    // 注意：归档数据会丢失，但原始 reviewLogs 数据不受影响
    console.log("数据库回滚到 v6：复习日志归档表已删除");
  },
};
