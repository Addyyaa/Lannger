/**
 * 会话状态存储
 *
 * v6 优化：将会话状态从 userSettings 独立存储，提升写入性能
 */

import { db, FlashcardSession, ensureDBOpen } from "../db";
import { safeDbOperation } from "../utils/dbWrapper";

const USER_ID = 1; // 固定为 1（单用户应用）

/**
 * 保存闪卡会话状态
 *
 * @param session 会话状态（不包含 id、userId、createdAt、updatedAt）
 * @returns 会话 ID
 */
export async function saveFlashcardSession(
  session: Omit<FlashcardSession, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<number> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      const now = new Date().toISOString();

      // 删除旧的会话（只保留最新的）
      await db.flashcardSessions.where("userId").equals(USER_ID).delete();

      // 创建新会话
      const id = await db.flashcardSessions.add({
        userId: USER_ID,
        ...session,
        savedAt: session.savedAt || now,
        createdAt: now,
        updatedAt: now,
      } as FlashcardSession);

      return id;
    },
    {
      context: { operation: "saveFlashcardSession" },
    }
  );
}

/**
 * 获取闪卡会话状态
 *
 * @returns 最新的会话状态，如果不存在则返回 null
 */
export async function getFlashcardSession(): Promise<FlashcardSession | null> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      // 获取所有会话，按 savedAt 降序排序，取第一个（最新的）
      const sessions = await db.flashcardSessions
        .where("userId")
        .equals(USER_ID)
        .toArray();

      if (sessions.length === 0) {
        return null;
      }

      // 按 savedAt 降序排序，返回最新的
      sessions.sort((a, b) => {
        const timeA = new Date(a.savedAt).getTime();
        const timeB = new Date(b.savedAt).getTime();
        return timeB - timeA; // 降序
      });

      return sessions[0];
    },
    {
      context: { operation: "getFlashcardSession" },
      silent: true,
    }
  );
}

/**
 * 清除闪卡会话状态
 */
export async function clearFlashcardSession(): Promise<void> {
  return safeDbOperation(
    async () => {
      await ensureDBOpen();
      await db.flashcardSessions.where("userId").equals(USER_ID).delete();
    },
    {
      context: { operation: "clearFlashcardSession" },
    }
  );
}
