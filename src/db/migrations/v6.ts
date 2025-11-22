/**
 * 数据库版本 6 迁移
 * 优化 userSettings 表结构（将会话状态和锁定状态独立存储）
 */

import type { Migration } from "./types";
import type { Dexie } from "dexie";
import type { FlashcardSession, ReviewLock, UserSettings } from "../../db";

export const v6Migration: Migration = {
  version: 6,
  description: "优化 userSettings 表结构（将会话状态和锁定状态独立存储）",
  async up(db: Dexie) {
    await db.transaction(
      "rw",
      ["userSettings", "flashcardSessions", "reviewLocks"],
      async (trans) => {
        const settingsTable = trans.table("userSettings");
        const flashcardSessionsTable = trans.table("flashcardSessions");
        const reviewLocksTable = trans.table("reviewLocks");

        // 1. 迁移 flashcardSessionState
        const settings = await settingsTable.get(1);
        if (settings && (settings as any).flashcardSessionState) {
          const sessionState = (settings as any).flashcardSessionState;
          const now = sessionState.savedAt || new Date().toISOString();
          await flashcardSessionsTable.add({
            userId: 1,
            wordSetId: sessionState.wordSetId,
            wordIds: sessionState.wordIds,
            currentIndex: sessionState.currentIndex,
            sessionStats: sessionState.sessionStats,
            showAnswer: sessionState.showAnswer,
            currentWordId: sessionState.currentWordId,
            savedAt: sessionState.savedAt,
            createdAt: now,
            updatedAt: now,
          } as FlashcardSession);

          // 从 userSettings 中移除
          const updated: any = { ...settings };
          delete updated.flashcardSessionState;
          await settingsTable.put(updated as UserSettings);
        }

        // 2. 迁移 activeReviewLock
        if (settings && (settings as any).activeReviewLock) {
          const lock = (settings as any).activeReviewLock;
          const now = lock.lockedAt || new Date().toISOString();
          await reviewLocksTable.add({
            userId: 1,
            wordSetId: lock.wordSetId,
            reviewStage: lock.reviewStage,
            lockedAt: lock.lockedAt,
            createdAt: now,
            updatedAt: now,
          } as ReviewLock);

          // 从 userSettings 中移除
          const updated: any = { ...settings };
          delete updated.activeReviewLock;
          await settingsTable.put(updated as UserSettings);
        }
      }
    );
    console.log("数据库升级到 v6：会话状态和锁定状态已迁移到独立表");
  },
  async down(db: Dexie) {
    // v6 的回滚：将独立表的数据迁移回 userSettings
    await db.transaction(
      "rw",
      ["userSettings", "flashcardSessions", "reviewLocks"],
      async (trans) => {
        const settingsTable = trans.table("userSettings");
        const flashcardSessionsTable = trans.table("flashcardSessions");
        const reviewLocksTable = trans.table("reviewLocks");

        // 1. 恢复 flashcardSessionState
        const sessions = await flashcardSessionsTable.toArray();
        if (sessions.length > 0) {
          const latestSession = sessions[sessions.length - 1]; // 取最新的会话
          const settings = await settingsTable.get(1);
          if (settings) {
            await settingsTable.put({
              ...settings,
              flashcardSessionState: {
                wordSetId: latestSession.wordSetId,
                wordIds: latestSession.wordIds,
                currentIndex: latestSession.currentIndex,
                sessionStats: latestSession.sessionStats,
                showAnswer: latestSession.showAnswer,
                currentWordId: latestSession.currentWordId,
                savedAt: latestSession.savedAt,
              },
            } as any);
          }
        }

        // 2. 恢复 activeReviewLock
        const locks = await reviewLocksTable.toArray();
        if (locks.length > 0) {
          const latestLock = locks[locks.length - 1]; // 取最新的锁定
          const settings = await settingsTable.get(1);
          if (settings) {
            await settingsTable.put({
              ...settings,
              activeReviewLock: {
                wordSetId: latestLock.wordSetId,
                reviewStage: latestLock.reviewStage,
                lockedAt: latestLock.lockedAt,
              },
            } as any);
          }
        }

        // 3. 清空独立表
        await flashcardSessionsTable.clear();
        await reviewLocksTable.clear();
      }
    );
    console.log("数据库回滚到 v5：会话状态和锁定状态已恢复");
  },
};
