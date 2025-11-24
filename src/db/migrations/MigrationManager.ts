/**
 * 迁移管理器
 * 负责执行迁移、回滚和数据完整性校验
 */

import type {
  MigrationResult,
  RollbackResult,
  ValidationResult,
  MigrationLog,
} from "./types";
import { getMigrations, getLatestVersion } from "./index";
import { backupDatabase } from "../../store/wordStore";
import { validateDataIntegrity } from "../../utils/dataIntegrity";
import type { Dexie } from "dexie";

/**
 * 迁移日志存储键
 */
const MIGRATION_LOG_KEY = "migration_logs";

/**
 * 迁移管理器类
 */
export class MigrationManager {
  private db: Dexie;

  constructor(db: Dexie) {
    this.db = db;
  }

  /**
   * 执行迁移到指定版本
   */
  async migrate(targetVersion: number): Promise<MigrationResult> {
    const startTime = Date.now();
    const currentVersion = this.db.verno;
    const fromVersion = currentVersion;

    // 验证目标版本
    const latestVersion = getLatestVersion();
    if (targetVersion > latestVersion) {
      throw new Error(
        `目标版本 ${targetVersion} 超过最新版本 ${latestVersion}`
      );
    }

    if (targetVersion <= currentVersion) {
      return {
        success: true,
        fromVersion,
        toVersion: targetVersion,
        executedMigrations: [],
        duration: Date.now() - startTime,
      };
    }

    // 获取需要执行的迁移
    const migrationsToExecute = getMigrations(currentVersion, targetVersion);

    if (migrationsToExecute.length === 0) {
      return {
        success: true,
        fromVersion,
        toVersion: targetVersion,
        executedMigrations: [],
        duration: Date.now() - startTime,
      };
    }

    // 迁移前备份
    let backupPath: string | undefined;
    try {
      const backupData = await backupDatabase();
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      backupPath = `migration_backup_v${fromVersion}_to_v${targetVersion}_${timestamp}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupPath;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(
        `迁移前备份失败: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // 迁移前校验
    const preValidation = await this.validateIntegrity();
    if (!preValidation.valid) {
      throw new Error(
        `迁移前数据完整性校验失败: ${preValidation.errors
          .map((e) => e.message)
          .join(", ")}`
      );
    }

    const executedMigrations: number[] = [];
    let lastError: Error | undefined;

    try {
      // 按顺序执行迁移
      for (const migration of migrationsToExecute) {
        try {
          // 执行迁移
          await migration.up(this.db);

          executedMigrations.push(migration.version);

          // 记录迁移日志
          await this.logMigration({
            version: migration.version,
            fromVersion:
              executedMigrations.length === 1
                ? fromVersion
                : executedMigrations[executedMigrations.length - 2],
            toVersion: migration.version,
            type: "migrate",
            success: true,
            duration: 0, // 单个迁移的时长可以在这里记录
            timestamp: new Date().toISOString(),
            backupPath:
              executedMigrations.length === 1 ? backupPath : undefined,
          });
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          executedMigrations.push(migration.version);

          // 记录失败日志
          await this.logMigration({
            version: migration.version,
            fromVersion:
              executedMigrations.length === 1
                ? fromVersion
                : executedMigrations[executedMigrations.length - 2],
            toVersion: migration.version,
            type: "migrate",
            success: false,
            error: lastError.message,
            duration: 0,
            timestamp: new Date().toISOString(),
            backupPath:
              executedMigrations.length === 1 ? backupPath : undefined,
          });

          // 回滚已执行的迁移
          await this.rollbackToVersion(fromVersion);

          throw lastError;
        }
      }

      // 迁移后校验
      const postValidation = await this.validateIntegrity();
      if (!postValidation.valid) {
        throw new Error(
          `迁移后数据完整性校验失败: ${postValidation.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      return {
        success: true,
        fromVersion,
        toVersion: targetVersion,
        executedMigrations,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        fromVersion,
        toVersion: targetVersion,
        executedMigrations,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 回滚到指定版本
   */
  async rollback(targetVersion: number): Promise<RollbackResult> {
    const startTime = Date.now();
    const currentVersion = this.db.verno;
    const fromVersion = currentVersion;

    if (targetVersion >= currentVersion) {
      throw new Error(
        `目标版本 ${targetVersion} 必须小于当前版本 ${currentVersion}`
      );
    }

    // 获取需要回滚的迁移（按逆序）
    const migrationsToRollback = getMigrations(
      targetVersion,
      currentVersion
    ).reverse();

    try {
      for (const migration of migrationsToRollback) {
        await migration.down(this.db);
      }

      // 记录回滚日志
      await this.logMigration({
        version: targetVersion,
        fromVersion,
        toVersion: targetVersion,
        type: "rollback",
        success: true,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        fromVersion,
        toVersion: targetVersion,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      await this.logMigration({
        version: targetVersion,
        fromVersion,
        toVersion: targetVersion,
        type: "rollback",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        fromVersion,
        toVersion: targetVersion,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 回滚到指定版本（内部方法，不记录日志）
   */
  private async rollbackToVersion(targetVersion: number): Promise<void> {
    const currentVersion = this.db.verno;
    const migrationsToRollback = getMigrations(
      targetVersion,
      currentVersion
    ).reverse();

    for (const migration of migrationsToRollback) {
      await migration.down(this.db);
    }
  }

  /**
   * 数据完整性校验
   */
  async validateIntegrity(): Promise<ValidationResult> {
    try {
      const result = await validateDataIntegrity();
      const errors: ValidationResult["errors"] = [];
      const warnings: ValidationResult["warnings"] = [];

      // 将 ValidationIssue 转换为 ValidationError 和 ValidationWarning
      for (const issue of result.issues) {
        if (issue.severity === "high" || issue.severity === "medium") {
          errors.push({
            type:
              issue.type === "orphaned_record" ||
              issue.type === "invalid_reference"
                ? "foreign_key"
                : issue.type === "inconsistent_data"
                ? "data"
                : "data",
            message: issue.message,
            table: issue.table,
            field: issue.field,
          });
        } else {
          warnings.push({
            type: "data",
            message: issue.message,
            table: issue.table,
          });
        }
      }

      return {
        valid: result.valid,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            type: "data",
            message: `校验过程出错: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * 记录迁移日志
   */
  private async logMigration(log: MigrationLog): Promise<void> {
    try {
      const logs = this.getMigrationLogs();
      logs.push({
        ...log,
        id: logs.length + 1,
      });
      localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error("记录迁移日志失败:", error);
    }
  }

  /**
   * 获取迁移日志
   */
  getMigrationLogs(): MigrationLog[] {
    try {
      const logsJson = localStorage.getItem(MIGRATION_LOG_KEY);
      if (!logsJson) {
        return [];
      }
      return JSON.parse(logsJson) as MigrationLog[];
    } catch (error) {
      console.error("读取迁移日志失败:", error);
      return [];
    }
  }

  /**
   * 清除迁移日志
   */
  clearMigrationLogs(): void {
    localStorage.removeItem(MIGRATION_LOG_KEY);
  }
}
