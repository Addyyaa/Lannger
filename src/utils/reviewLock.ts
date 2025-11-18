/**
 * 复习锁定机制工具
 * 管理复习锁定状态，防止同时复习多个课程
 *
 * v6 优化：锁定状态从 userSettings 独立存储，提升写入性能
 */

import { db, ReviewLock as ReviewLockRecord, ensureDBOpen } from "../db";
import { getWordSet } from "../store/wordStore";
import { safeDbOperation } from "./dbWrapper";

const USER_ID = 1; // 固定为 1（单用户应用）

/**
 * 复习锁定状态（兼容接口，用于外部调用）
 */
export interface ReviewLock {
  wordSetId: number;
  reviewStage: number;
  lockedAt: string;
}

/**
 * 获取当前复习锁定状态
 */
export async function getReviewLock(): Promise<ReviewLock | null> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const lock = await db.reviewLocks.where("userId").equals(USER_ID).first();

      if (!lock) {
        return null;
      }

      // 转换为兼容接口
      return {
        wordSetId: lock.wordSetId,
        reviewStage: lock.reviewStage,
        lockedAt: lock.lockedAt,
      };
    },
    {
      context: { operation: "getReviewLock" },
      silent: true,
    }
  );
}

/**
 * 设置复习锁定
 */
export async function setReviewLock(
  wordSetId: number,
  reviewStage: number
): Promise<void> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const now = new Date().toISOString();

      // 删除旧的锁定（只保留一个）
      await db.reviewLocks.where("userId").equals(USER_ID).delete();

      // 创建新锁定
      await db.reviewLocks.add({
        userId: USER_ID,
        wordSetId,
        reviewStage,
        lockedAt: now,
        createdAt: now,
        updatedAt: now,
      } as ReviewLockRecord);
    },
    {
      context: { operation: "setReviewLock", wordSetId, reviewStage },
    }
  );
}

/**
 * 解除复习锁定
 */
export async function clearReviewLock(): Promise<void> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      await db.reviewLocks.where("userId").equals(USER_ID).delete();
    },
    {
      context: { operation: "clearReviewLock" },
    }
  );
}

/**
 * 检查是否可以开始复习（检查锁定状态）
 */
export async function canStartReview(wordSetId: number): Promise<{
  allowed: boolean;
  lockInfo?: ReviewLock & { wordSetName: string };
}> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const lock = await getReviewLock();

      if (!lock) {
        return { allowed: true };
      }

      // 如果锁定的就是当前单词集，允许继续
      if (lock.wordSetId === wordSetId) {
        return { allowed: true };
      }

      // 否则，获取锁定的单词集名称
      const wordSet = await getWordSet(lock.wordSetId);
      const wordSetName = wordSet?.name || `单词集 #${lock.wordSetId}`;

      return {
        allowed: false,
        lockInfo: {
          ...lock,
          wordSetName,
        },
      };
    },
    {
      context: { operation: "canStartReview", wordSetId },
      silent: true,
    }
  );
}

/**
 * 获取锁定提示信息
 */
export async function getLockMessage(): Promise<string | null> {
  const lock = await getReviewLock();
  if (!lock) {
    return null;
  }

  const wordSet = await getWordSet(lock.wordSetId);
  const wordSetName = wordSet?.name || `单词集 #${lock.wordSetId}`;

  return `必须完成课程 ${wordSetName} 第 ${lock.reviewStage} 次复习`;
}
