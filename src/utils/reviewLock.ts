/**
 * 复习锁定机制工具
 * 管理复习锁定状态，防止同时复习多个课程
 */

import { db, UserSettings, ensureDBOpen } from "../db";
import { getWordSet } from "../store/wordStore";
import { handleError } from "./errorHandler";
import { safeDbOperation } from "./dbWrapper";

/**
 * 复习锁定状态
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
      const settings = await db.userSettings.get(1);
      return settings?.activeReviewLock || null;
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
      const settings = await db.userSettings.get(1);

      if (!settings) {
        throw new Error("用户设置不存在");
      }

      settings.activeReviewLock = {
        wordSetId,
        reviewStage,
        lockedAt: new Date().toISOString(),
      };
      settings.updatedAt = new Date().toISOString();

      await db.userSettings.put(settings);
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
      const settings = await db.userSettings.get(1);

      if (!settings) {
        return;
      }

      settings.activeReviewLock = null;
      settings.updatedAt = new Date().toISOString();

      await db.userSettings.put(settings);
    },
    {
      context: { operation: "clearReviewLock" },
    }
  );
}

/**
 * 检查是否可以开始复习（检查锁定状态）
 */
export async function canStartReview(
  wordSetId: number
): Promise<{ allowed: boolean; lockInfo?: ReviewLock & { wordSetName: string } }> {
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

