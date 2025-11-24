/**
 * 数据库版本 5 迁移
 * 优化索引（性能优化）
 */

import type { Migration } from "./types";

export const v5Migration: Migration = {
  version: 5,
  description: "优化索引（性能优化）",
  async up(_db) {
    // v5 升级：索引优化，无需数据迁移
    // 索引的减少不会影响现有数据，只是减少了索引维护开销
    console.log("数据库升级到 v5：索引优化完成");
  },
  async down(_db) {
    // v5 的回滚：索引优化是可逆的，但实际回滚不需要操作
    // 因为索引的减少不会影响数据
    console.log("数据库回滚到 v4：索引优化已撤销");
  },
};
