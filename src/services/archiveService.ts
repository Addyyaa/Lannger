/**
 * 数据归档服务
 * 负责 reviewLogs 的归档功能
 */

import { db, ensureDBOpen, ReviewLog, ReviewLogsArchive } from "../db";
import { safeDbOperation } from "../utils/dbWrapper";

/**
 * 归档结果
 */
export interface ArchiveResult {
  success: boolean;
  archivedCount: number; // 归档的记录数
  deletedCount: number; // 删除的记录数
  archiveEntries: number; // 创建的归档条目数
  duration: number; // 执行时间（毫秒）
  error?: string;
}

/**
 * 归档配置
 */
const ARCHIVE_CONFIG = {
  KEEP_DAYS: 90, // 90 天内完整保留
  ARCHIVE_DAYS: 365, // 90-365 天归档
  DELETE_DAYS: 365, // 365 天以上删除
  MIN_RECORDS_TO_ARCHIVE: 1000, // 最少记录数才执行归档
  MAX_WORD_IDS_PER_ARCHIVE: 1000, // 每个归档条目最多保留的单词 ID 数量
};

/**
 * 归档执行状态（用于防止重复执行）
 */
const ARCHIVE_STATE_KEY = "last_archive_execution";
const ARCHIVE_MIN_INTERVAL = 24 * 60 * 60 * 1000; // 24 小时

/**
 * 检查是否需要执行归档
 */
export async function shouldRunArchive(): Promise<boolean> {
  try {
    await ensureDBOpen();

    // 检查记录数
    const totalCount = await db.reviewLogs.count();
    if (totalCount < ARCHIVE_CONFIG.MIN_RECORDS_TO_ARCHIVE) {
      return false;
    }

    // 检查是否有超过 90 天的记录
    const now = new Date();
    const ninetyDaysAgo = new Date(
      now.getTime() - ARCHIVE_CONFIG.KEEP_DAYS * 24 * 60 * 60 * 1000
    );
    const oldRecordsCount = await db.reviewLogs
      .where("timestamp")
      .below(ninetyDaysAgo.toISOString())
      .count();

    if (oldRecordsCount === 0) {
      return false;
    }

    // 检查上次执行时间
    const lastExecution = localStorage.getItem(ARCHIVE_STATE_KEY);
    if (lastExecution) {
      const lastTime = parseInt(lastExecution, 10);
      const nowTime = Date.now();
      if (nowTime - lastTime < ARCHIVE_MIN_INTERVAL) {
        return false; // 距离上次执行不足 24 小时
      }
    }

    return true;
  } catch (error) {
    console.error("检查归档条件失败:", error);
    return false;
  }
}

/**
 * 归档 reviewLogs（90-365 天的记录）
 */
export async function archiveReviewLogs(): Promise<ArchiveResult> {
  const startTime = Date.now();

  return safeDbOperation(
    async () => {
      await ensureDBOpen();

      const now = new Date();
      const ninetyDaysAgo = new Date(
        now.getTime() - ARCHIVE_CONFIG.KEEP_DAYS * 24 * 60 * 60 * 1000
      );
      const oneYearAgo = new Date(
        now.getTime() - ARCHIVE_CONFIG.ARCHIVE_DAYS * 24 * 60 * 60 * 1000
      );

      // 查询 90-365 天的记录（需要归档的）
      const logsToArchive = await db.reviewLogs
        .where("timestamp")
        .between(
          oneYearAgo.toISOString(),
          ninetyDaysAgo.toISOString(),
          true,
          false
        )
        .toArray();

      if (logsToArchive.length === 0) {
        return {
          success: true,
          archivedCount: 0,
          deletedCount: 0,
          archiveEntries: 0,
          duration: Date.now() - startTime,
        };
      }

      // 按日期分组
      const logsByDate = new Map<string, ReviewLog[]>();
      for (const log of logsToArchive) {
        const date = new Date(log.timestamp).toISOString().split("T")[0]; // YYYY-MM-DD
        if (!logsByDate.has(date)) {
          logsByDate.set(date, []);
        }
        logsByDate.get(date)!.push(log);
      }

      // 创建归档条目
      const archiveEntries: ReviewLogsArchive[] = [];
      const logIdsToDelete: number[] = [];

      for (const [date, logs] of logsByDate.entries()) {
        // 统计信息
        let correctCount = 0;
        let wrongCount = 0;
        let skipCount = 0;
        let totalResponseTime = 0;
        let responseTimeCount = 0;
        const wordIds = new Set<number>();

        for (const log of logs) {
          if (log.id !== undefined) {
            logIdsToDelete.push(log.id);
          }
          if (log.wordId !== undefined) {
            wordIds.add(log.wordId);
          }

          if (log.result === "correct") {
            correctCount++;
          } else if (log.result === "wrong") {
            wrongCount++;
          } else if (log.result === "skip") {
            skipCount++;
          }

          if (log.responseTime !== undefined) {
            totalResponseTime += log.responseTime;
            responseTimeCount++;
          }
        }

        // 如果单词 ID 数量过多，只保留数量
        const wordIdsArray = Array.from(wordIds);
        const wordCount = wordIdsArray.length;
        const finalWordIds =
          wordCount <= ARCHIVE_CONFIG.MAX_WORD_IDS_PER_ARCHIVE
            ? wordIdsArray
            : undefined;

        const avgResponseTime =
          responseTimeCount > 0
            ? totalResponseTime / responseTimeCount
            : undefined;

        archiveEntries.push({
          date,
          wordIds: finalWordIds,
          wordCount: finalWordIds ? undefined : wordCount,
          totalCount: logs.length,
          correctCount,
          wrongCount,
          skipCount,
          avgResponseTime,
          createdAt: new Date().toISOString(),
        });
      }

      // 使用事务批量操作
      await db.transaction(
        "rw",
        ["reviewLogs", "reviewLogsArchive"],
        async (trans) => {
          // 批量插入归档数据
          if (archiveEntries.length > 0) {
            await trans.table("reviewLogsArchive").bulkAdd(archiveEntries);
          }

          // 批量删除原始记录
          if (logIdsToDelete.length > 0) {
            await trans.table("reviewLogs").bulkDelete(logIdsToDelete);
          }
        }
      );

      // 记录执行时间
      localStorage.setItem(ARCHIVE_STATE_KEY, String(Date.now()));

      return {
        success: true,
        archivedCount: logsToArchive.length,
        deletedCount: logIdsToDelete.length,
        archiveEntries: archiveEntries.length,
        duration: Date.now() - startTime,
      };
    },
    {
      context: { operation: "archiveReviewLogs" },
    }
  );
}

/**
 * 删除超过 365 天的归档记录
 */
export async function deleteOldArchives(): Promise<number> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();

      const now = new Date();
      const oneYearAgo = new Date(
        now.getTime() - ARCHIVE_CONFIG.DELETE_DAYS * 24 * 60 * 60 * 1000
      );

      // 查询超过 365 天的归档记录
      const oldArchives = await db.reviewLogsArchive
        .where("date")
        .below(oneYearAgo.toISOString().split("T")[0])
        .toArray();

      if (oldArchives.length === 0) {
        return 0;
      }

      const idsToDelete = oldArchives
        .map((a) => a.id)
        .filter((id): id is number => id !== undefined);

      if (idsToDelete.length > 0) {
        await db.reviewLogsArchive.bulkDelete(idsToDelete);
      }

      return idsToDelete.length;
    },
    {
      context: { operation: "deleteOldArchives" },
      silent: true,
    }
  );
}

/**
 * 执行完整的归档流程（归档 + 删除旧归档）
 */
export async function runFullArchive(): Promise<
  ArchiveResult & { deletedArchives: number }
> {
  const archiveResult = await archiveReviewLogs();
  const deletedArchives = await deleteOldArchives();

  return {
    ...archiveResult,
    deletedArchives,
  };
}
