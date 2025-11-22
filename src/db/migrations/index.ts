/**
 * 迁移注册表
 * 所有迁移文件需要在这里注册
 */

import type { Migration } from "./types";

// 导入所有迁移文件
import { v1Migration } from "./v1";
import { v2Migration } from "./v2";
import { v3Migration } from "./v3";
import { v4Migration } from "./v4";
import { v5Migration } from "./v5";
import { v6Migration } from "./v6";
import { v7Migration } from "./v7";

/**
 * 所有已注册的迁移
 * 按版本号排序
 */
export const migrations: Migration[] = [
  v1Migration,
  v2Migration,
  v3Migration,
  v4Migration,
  v5Migration,
  v6Migration,
  v7Migration,
];

/**
 * 获取指定版本的迁移
 */
export function getMigration(version: number): Migration | undefined {
  return migrations.find((m) => m.version === version);
}

/**
 * 获取指定版本范围内的迁移
 */
export function getMigrations(
  fromVersion: number,
  toVersion: number
): Migration[] {
  return migrations.filter(
    (m) => m.version > fromVersion && m.version <= toVersion
  );
}

/**
 * 获取最新版本号
 */
export function getLatestVersion(): number {
  if (migrations.length === 0) {
    return 0;
  }
  return Math.max(...migrations.map((m) => m.version));
}
