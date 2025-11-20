/**
 * Review Store + Service 集成测试
 * 测试 Zustand Review Store 与 Service 层的完整交互流程
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useReviewStore } from "../reviewStore.zustand";
import * as reviewService from "../../services/reviewService";
import { db } from "../../db";

describe("Review Store Integration Tests", () => {
  beforeEach(async () => {
    // 清理所有表数据
    await db.reviewPlans.clear();
    await db.wordSets.clear();
    await db.words.clear();

    // 重置 Store 状态
    useReviewStore.getState().reset();
  });

  describe("Store + Service 完整流程", () => {
    it("应该通过 Store 创建复习计划，然后通过 Service 查询", async () => {
      // 创建单词集
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      // 1. 通过 Store 创建复习计划
      const plan = await useReviewStore
        .getState()
        .getOrCreateReviewPlan(wordSetId, 10);

      expect(plan).toBeDefined();
      expect(plan.wordSetId).toBe(wordSetId);

      // 2. 通过 Service 直接查询数据库验证
      const servicePlan = await reviewService.getReviewPlan(wordSetId);
      expect(servicePlan).toBeDefined();
      expect(servicePlan?.wordSetId).toBe(wordSetId);

      // 3. 验证 Store 状态已更新
      const state = useReviewStore.getState();
      expect(state.reviewPlans[wordSetId]).toBeDefined();
    });

    it("应该通过 Service 创建数据，然后通过 Store 加载", async () => {
      // 创建单词集
      const wordSetId = await db.wordSets.add({
        name: "Service 测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      // 1. 通过 Service 直接创建复习计划
      await reviewService.getOrCreateReviewPlan(wordSetId, 20);

      // 2. 通过 Store 加载数据
      await useReviewStore.getState().loadReviewPlan(wordSetId);

      // 3. 验证 Store 状态
      const state = useReviewStore.getState();
      expect(state.reviewPlans[wordSetId]).toBeDefined();
      expect(state.reviewPlans[wordSetId]?.totalWords).toBe(20);
    });

    it("应该正确处理完成复习阶段：Store 更新后 Service 查询应反映更改", async () => {
      // 创建单词集和复习计划
      const wordSetId = await db.wordSets.add({
        name: "阶段测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const plan = await useReviewStore
        .getState()
        .getOrCreateReviewPlan(wordSetId, 10);

      expect(plan.reviewStage).toBe(1);

      // 通过 Store 完成复习阶段
      const updatedPlan = await useReviewStore
        .getState()
        .completeReviewStage(wordSetId);

      expect(updatedPlan.reviewStage).toBe(2);
      expect(updatedPlan.completedStages).toContain(1);

      // 验证 Service 查询反映更改
      const servicePlan = await reviewService.getReviewPlan(wordSetId);
      expect(servicePlan?.reviewStage).toBe(2);
      expect(servicePlan?.completedStages).toContain(1);

      // 验证 Store 状态已更新
      const state = useReviewStore.getState();
      expect(state.reviewPlans[wordSetId]?.reviewStage).toBe(2);
    });

    it("应该正确处理删除操作：Store 删除后 Service 查询应返回 null", async () => {
      // 创建单词集和复习计划
      const wordSetId = await db.wordSets.add({
        name: "待删除测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      await useReviewStore.getState().getOrCreateReviewPlan(wordSetId, 10);
      await useReviewStore.getState().loadReviewPlan(wordSetId);

      // 通过 Store 删除
      await useReviewStore.getState().deleteReviewPlan(wordSetId);

      // 验证 Service 查询返回 null
      const plan = await reviewService.getReviewPlan(wordSetId);
      expect(plan).toBeNull();

      // 验证 Store 状态已更新
      const state = useReviewStore.getState();
      expect(state.reviewPlans[wordSetId]).toBeUndefined();
    });
  });

  describe("到期复习计划查询集成", () => {
    it("应该正确加载到期的复习计划", async () => {
      // 创建单词集
      const wordSetId = await db.wordSets.add({
        name: "到期测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      // 创建一个已到期的复习计划
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      await db.reviewPlans.add({
        wordSetId,
        reviewStage: 1,
        nextReviewAt: pastDate.toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      // 通过 Store 加载到期计划
      await useReviewStore.getState().loadDueReviewPlans();

      // 验证 Store 状态
      const state = useReviewStore.getState();
      expect(state.dueReviewPlans.length).toBeGreaterThanOrEqual(1);
      expect(state.dueReviewPlans.some((p) => p.wordSetId === wordSetId)).toBe(
        true
      );
    });
  });

  describe("批量操作集成", () => {
    it("应该支持加载所有复习计划", async () => {
      // 创建多个单词集和复习计划
      const wordSetIds: number[] = [];
      for (let i = 0; i < 3; i++) {
        const wordSetId = await db.wordSets.add({
          name: `批量测试单词集${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
        wordSetIds.push(wordSetId);

        await useReviewStore
          .getState()
          .getOrCreateReviewPlan(wordSetId, 10 * (i + 1));
      }

      // 加载所有复习计划
      await useReviewStore.getState().loadAllReviewPlans();

      // 验证所有计划都在 Store 中
      const state = useReviewStore.getState();
      wordSetIds.forEach((wordSetId) => {
        expect(state.reviewPlans[wordSetId]).toBeDefined();
      });
    });
  });
});
