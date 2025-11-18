/**
 * 复习锁定机制测试
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getReviewLock,
  setReviewLock,
  clearReviewLock,
  canStartReview,
  getLockMessage,
} from "../reviewLock";
import { db, ensureDBOpen } from "../../db";
import { createWordSet } from "../../store/wordStore";

describe("reviewLock", () => {
  beforeEach(async () => {
    await ensureDBOpen();
    // v6 优化：清理锁定状态（从 reviewLocks 表删除）
    await db.reviewLocks.where("userId").equals(1).delete();
  });

  afterEach(async () => {
    // v6 优化：清理锁定状态（从 reviewLocks 表删除）
    await db.reviewLocks.where("userId").equals(1).delete();
  });

  describe("getReviewLock", () => {
    it("应该返回 null 当没有锁定时", async () => {
      const lock = await getReviewLock();
      expect(lock).toBeNull();
    });

    it("应该返回锁定状态当存在锁定时", async () => {
      await setReviewLock(1, 2);
      const lock = await getReviewLock();
      expect(lock).not.toBeNull();
      expect(lock?.wordSetId).toBe(1);
      expect(lock?.reviewStage).toBe(2);
      expect(lock?.lockedAt).toBeDefined();
    });
  });

  describe("setReviewLock", () => {
    it("应该设置复习锁定", async () => {
      await setReviewLock(1, 2);
      const lock = await getReviewLock();
      expect(lock).not.toBeNull();
      expect(lock?.wordSetId).toBe(1);
      expect(lock?.reviewStage).toBe(2);
    });

    it("应该更新现有的锁定", async () => {
      await setReviewLock(1, 2);
      await setReviewLock(2, 3);
      const lock = await getReviewLock();
      expect(lock?.wordSetId).toBe(2);
      expect(lock?.reviewStage).toBe(3);
    });
  });

  describe("clearReviewLock", () => {
    it("应该清除锁定状态", async () => {
      await setReviewLock(1, 2);
      await clearReviewLock();
      const lock = await getReviewLock();
      expect(lock).toBeNull();
    });

    it("应该在没有锁定时不报错", async () => {
      await expect(clearReviewLock()).resolves.not.toThrow();
    });
  });

  describe("canStartReview", () => {
    it("应该允许开始复习当没有锁定时", async () => {
      const result = await canStartReview(1);
      expect(result.allowed).toBe(true);
      expect(result.lockInfo).toBeUndefined();
    });

    it("应该允许开始复习当锁定的就是当前单词集", async () => {
      await setReviewLock(1, 2);
      const result = await canStartReview(1);
      expect(result.allowed).toBe(true);
    });

    it("应该拒绝开始复习当有其他单词集被锁定时", async () => {
      // 创建测试单词集
      const wordSetId = await createWordSet({
        name: "测试单词集",
        mark: "测试",
      });

      await setReviewLock(wordSetId, 2);
      const result = await canStartReview(wordSetId + 1);
      expect(result.allowed).toBe(false);
      expect(result.lockInfo).toBeDefined();
      expect(result.lockInfo?.wordSetId).toBe(wordSetId);
    });
  });

  describe("getLockMessage", () => {
    it("应该返回 null 当没有锁定时", async () => {
      const message = await getLockMessage();
      expect(message).toBeNull();
    });

    it("应该返回锁定消息当存在锁定时", async () => {
      const wordSetId = await createWordSet({
        name: "测试单词集",
        mark: "测试",
      });

      await setReviewLock(wordSetId, 2);
      const message = await getLockMessage();
      expect(message).toContain("必须完成课程");
      expect(message).toContain("测试单词集");
      expect(message).toContain("第 2 次复习");
    });
  });
});
