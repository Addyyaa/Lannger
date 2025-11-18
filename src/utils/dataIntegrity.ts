/**
 * 数据完整性检查和修复工具
 *
 * 用于检查和处理数据库中的数据一致性问题：
 * 1. 孤立记录（如 wordProgress 中不存在的 wordId）
 * 2. 冗余字段一致性（如 wordProgress.setId 与 words.setId）
 * 3. 数组字段有效性（如 learnedWordIds 中的单词是否存在）
 */

import { db, ensureDBOpen } from "../db";

/**
 * 数据验证问题类型
 */
export interface ValidationIssue {
  type:
    | "orphaned_record"
    | "inconsistent_data"
    | "invalid_reference"
    | "array_invalid_item";
  table: string;
  recordId: number | string;
  field?: string;
  message: string;
  severity: "low" | "medium" | "high";
}

/**
 * 数据验证结果
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

/**
 * 验证数据完整性
 *
 * @returns 验证结果
 */
export async function validateDataIntegrity(): Promise<ValidationResult> {
  await ensureDBOpen();
  const issues: ValidationIssue[] = [];

  // 1. 检查孤立记录：wordProgress 中不存在的 wordId
  const wordProgresses = await db.wordProgress.toArray();
  const allWordIds = new Set((await db.words.toArray()).map((word) => word.id));

  for (const progress of wordProgresses) {
    if (!allWordIds.has(progress.wordId)) {
      issues.push({
        type: "orphaned_record",
        table: "wordProgress",
        recordId: progress.wordId,
        message: `WordProgress for wordId ${progress.wordId} has no corresponding word`,
        severity: "high",
      });
    }
  }

  // 2. 检查冗余字段一致性：wordProgress.setId 与 words.setId
  const wordsMap = new Map(
    (await db.words.toArray()).map((word) => [word.id, word])
  );

  for (const progress of wordProgresses) {
    const word = wordsMap.get(progress.wordId);
    if (word && progress.setId !== word.setId) {
      issues.push({
        type: "inconsistent_data",
        table: "wordProgress",
        recordId: progress.wordId,
        field: "setId",
        message: `wordProgress.setId (${progress.setId}) doesn't match word.setId (${word.setId})`,
        severity: "medium",
      });
    }
  }

  // 3. 检查 reviewLogs 中的孤立记录
  const reviewLogs = await db.reviewLogs.toArray();
  for (const log of reviewLogs) {
    if (!allWordIds.has(log.wordId)) {
      issues.push({
        type: "orphaned_record",
        table: "reviewLogs",
        recordId: log.id || 0,
        message: `ReviewLog for wordId ${log.wordId} has no corresponding word`,
        severity: "medium",
      });
    }
  }

  // 4. 检查 dailyStats.learnedWordIds 数组有效性
  const dailyStats = await db.dailyStats.toArray();
  for (const stat of dailyStats) {
    if (stat.learnedWordIds && Array.isArray(stat.learnedWordIds)) {
      for (const wordId of stat.learnedWordIds) {
        if (!allWordIds.has(wordId)) {
          issues.push({
            type: "array_invalid_item",
            table: "dailyStats",
            recordId: stat.date,
            field: "learnedWordIds",
            message: `dailyStats.learnedWordIds contains invalid wordId: ${wordId}`,
            severity: "low",
          });
        }
      }
    }
  }

  // 5. 检查 reviewPlans.learnedWordIds 数组有效性
  const reviewPlans = await db.reviewPlans.toArray();
  for (const plan of reviewPlans) {
    if (plan.learnedWordIds && Array.isArray(plan.learnedWordIds)) {
      for (const wordId of plan.learnedWordIds) {
        if (!allWordIds.has(wordId)) {
          issues.push({
            type: "array_invalid_item",
            table: "reviewPlans",
            recordId: plan.id || 0,
            field: "learnedWordIds",
            message: `reviewPlans.learnedWordIds contains invalid wordId: ${wordId}`,
            severity: "medium",
          });
        }
      }
    }
  }

  // 6. 检查 reviewPlans 中的孤立记录（wordSetId 不存在）
  const allWordSetIds = new Set(
    (await db.wordSets.toArray()).map((set) => set.id)
  );
  for (const plan of reviewPlans) {
    if (!allWordSetIds.has(plan.wordSetId)) {
      issues.push({
        type: "orphaned_record",
        table: "reviewPlans",
        recordId: plan.id || 0,
        message: `ReviewPlan for wordSetId ${plan.wordSetId} has no corresponding wordSet`,
        severity: "high",
      });
    }
  }

  // 生成摘要
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const issue of issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      totalIssues: issues.length,
      byType,
      bySeverity,
    },
  };
}

/**
 * 修复数据完整性问题
 *
 * @param dryRun 如果为 true，只返回修复计划，不执行修复
 * @returns 修复结果
 */
export async function fixDataIntegrity(dryRun: boolean = false): Promise<{
  fixed: number;
  errors: number;
  details: Array<{ issue: ValidationIssue; fixed: boolean; error?: string }>;
}> {
  await ensureDBOpen();
  const validationResult = await validateDataIntegrity();
  const details: Array<{
    issue: ValidationIssue;
    fixed: boolean;
    error?: string;
  }> = [];

  let fixed = 0;
  let errors = 0;

  if (dryRun) {
    // 只返回修复计划
    for (const issue of validationResult.issues) {
      details.push({ issue, fixed: false });
    }
    return { fixed: 0, errors: 0, details };
  }

  // 执行修复
  for (const issue of validationResult.issues) {
    try {
      let fixedThisIssue = false;

      if (issue.type === "orphaned_record") {
        if (issue.table === "wordProgress") {
          // 删除孤立的 wordProgress 记录
          await db.wordProgress.delete(issue.recordId as number);
          fixedThisIssue = true;
        } else if (issue.table === "reviewLogs") {
          // 删除孤立的 reviewLogs 记录
          if (typeof issue.recordId === "number") {
            await db.reviewLogs.delete(issue.recordId);
            fixedThisIssue = true;
          }
        } else if (issue.table === "reviewPlans") {
          // 删除孤立的 reviewPlans 记录
          if (typeof issue.recordId === "number") {
            await db.reviewPlans.delete(issue.recordId);
            fixedThisIssue = true;
          }
        }
      } else if (issue.type === "inconsistent_data") {
        if (issue.table === "wordProgress" && issue.field === "setId") {
          // 修复 wordProgress.setId 与 words.setId 不一致
          const word = await db.words.get(issue.recordId as number);
          if (word) {
            await db.wordProgress.update(issue.recordId as number, {
              setId: word.setId,
              updatedAt: new Date().toISOString(),
            });
            fixedThisIssue = true;
          }
        }
      } else if (issue.type === "array_invalid_item") {
        if (issue.table === "dailyStats" && issue.field === "learnedWordIds") {
          // 从 dailyStats.learnedWordIds 中移除无效的 wordId
          const stat = await db.dailyStats.get(issue.recordId as string);
          if (stat && stat.learnedWordIds) {
            const allWordIds = new Set(
              (await db.words.toArray()).map((word) => word.id)
            );
            const validWordIds = stat.learnedWordIds.filter((id) =>
              allWordIds.has(id)
            );
            await db.dailyStats.update(issue.recordId as string, {
              learnedWordIds: validWordIds,
              updatedAt: new Date().toISOString(),
            });
            fixedThisIssue = true;
          }
        } else if (
          issue.table === "reviewPlans" &&
          issue.field === "learnedWordIds"
        ) {
          // 从 reviewPlans.learnedWordIds 中移除无效的 wordId
          const plan = await db.reviewPlans.get(issue.recordId as number);
          if (plan && plan.learnedWordIds) {
            const allWordIds = new Set(
              (await db.words.toArray()).map((word) => word.id)
            );
            const validWordIds = plan.learnedWordIds.filter((id) =>
              allWordIds.has(id)
            );
            await db.reviewPlans.update(issue.recordId as number, {
              learnedWordIds: validWordIds,
              updatedAt: new Date().toISOString(),
            });
            fixedThisIssue = true;
          }
        }
      }

      if (fixedThisIssue) {
        fixed++;
        details.push({ issue, fixed: true });
      } else {
        details.push({ issue, fixed: false });
      }
    } catch (error) {
      errors++;
      details.push({
        issue,
        fixed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { fixed, errors, details };
}

/**
 * 清理 dailyStats.learnedWordIds 中的无效引用
 *
 * @param date 可选的日期，如果指定则只清理该日期的记录
 */
export async function cleanupDailyStatsLearnedWordIds(
  date?: string
): Promise<number> {
  await ensureDBOpen();
  const allWordIds = new Set((await db.words.toArray()).map((word) => word.id));

  let cleaned = 0;
  const stats = date
    ? [await db.dailyStats.get(date)].filter(Boolean)
    : await db.dailyStats.toArray();

  for (const stat of stats) {
    if (!stat || !stat.learnedWordIds) continue;

    const validWordIds = stat.learnedWordIds.filter((id) => allWordIds.has(id));

    if (validWordIds.length !== stat.learnedWordIds.length) {
      await db.dailyStats.update(stat.date, {
        learnedWordIds: validWordIds,
        updatedAt: new Date().toISOString(),
      });
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * 清理 reviewPlans.learnedWordIds 中的无效引用
 *
 * @param wordSetId 可选的单词集ID，如果指定则只清理该单词集的计划
 */
export async function cleanupReviewPlansLearnedWordIds(
  wordSetId?: number
): Promise<number> {
  await ensureDBOpen();
  const allWordIds = new Set((await db.words.toArray()).map((word) => word.id));

  let cleaned = 0;
  const plans = wordSetId
    ? await db.reviewPlans.where("wordSetId").equals(wordSetId).toArray()
    : await db.reviewPlans.toArray();

  for (const plan of plans) {
    if (!plan.learnedWordIds || !plan.id) continue;

    const validWordIds = plan.learnedWordIds.filter((id) => allWordIds.has(id));

    if (validWordIds.length !== plan.learnedWordIds.length) {
      await db.reviewPlans.update(plan.id, {
        learnedWordIds: validWordIds,
        updatedAt: new Date().toISOString(),
      });
      cleaned++;
    }
  }

  return cleaned;
}
