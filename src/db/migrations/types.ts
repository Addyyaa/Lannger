/**
 * 迁移相关的类型定义
 */

import type { Dexie } from "dexie";

/**
 * 迁移接口
 */
export interface Migration {
  version: number;
  /**
   * 执行迁移（升级）
   * @param db Dexie 数据库实例
   */
  up(db: Dexie): Promise<void>;
  /**
   * 回滚迁移（降级）
   * @param db Dexie 数据库实例
   */
  down(db: Dexie): Promise<void>;
  /**
   * 迁移描述
   */
  description?: string;
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  executedMigrations: number[];
  error?: Error;
  duration: number; // 执行时间（毫秒）
}

/**
 * 回滚结果
 */
export interface RollbackResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  error?: Error;
  duration: number;
}

/**
 * 数据完整性校验结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 校验错误
 */
export interface ValidationError {
  type: "schema" | "data" | "index" | "foreign_key";
  message: string;
  table?: string;
  field?: string;
}

/**
 * 校验警告
 */
export interface ValidationWarning {
  type: "data" | "performance";
  message: string;
  table?: string;
}

/**
 * 迁移日志条目
 */
export interface MigrationLog {
  id?: number;
  version: number;
  fromVersion: number;
  toVersion: number;
  type: "migrate" | "rollback";
  success: boolean;
  error?: string;
  duration: number;
  timestamp: string;
  backupPath?: string;
}
