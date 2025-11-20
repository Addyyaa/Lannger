/**
 * Zustand Review Store 单元测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useReviewStore } from "../reviewStore.zustand";
import { db } from "../../db";

describe("useReviewStore (Zustand)", () => {
  beforeEach(async () => {
    // 清理所有表数据
    await db.reviewPlans.clear();
    await db.wordSets.clear();
    await db.words.clear();

    // 重置 Store 状态
    useReviewStore.getState().reset();
  });

  describe("初始状态", () => {
    it("应该有正确的初始状态", () => {
      const state = useReviewStore.getState();
      expect(state.reviewPlans).toEqual({});
      expect(state.dueReviewPlans).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("loadReviewPlan", () => {
    it("应该加载复习计划", async () => {
      // 创建测试数据
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      await db.reviewPlans.add({
        wordSetId,
        reviewStage: 1,
        nextReviewAt: new Date().toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const plan = await useReviewStore.getState().loadReviewPlan(wordSetId);

      expect(plan).toBeDefined();
      expect(plan?.wordSetId).toBe(wordSetId);
      expect(plan?.reviewStage).toBe(1);

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.reviewPlans[wordSetId]).toBeDefined();
    });

    it("应该返回 null 当复习计划不存在时", async () => {
      const wordSetId = 999;

      const plan = await useReviewStore.getState().loadReviewPlan(wordSetId);

      expect(plan).toBeNull();

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
    });
  });

  describe("loadAllReviewPlans", () => {
    it("应该加载所有复习计划", async () => {
      // 创建测试数据
      const wordSetId1 = await db.wordSets.add({
        name: "单词集1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      const wordSetId2 = await db.wordSets.add({
        name: "单词集2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      await db.reviewPlans.add({
        wordSetId: wordSetId1,
        reviewStage: 1,
        nextReviewAt: new Date().toISOString(),
        completedStages: [],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await db.reviewPlans.add({
        wordSetId: wordSetId2,
        reviewStage: 2,
        nextReviewAt: new Date().toISOString(),
        completedStages: [1],
        startedAt: new Date().toISOString(),
        isCompleted: false,
        totalWords: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await useReviewStore.getState().loadAllReviewPlans();

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(Object.keys(state.reviewPlans).length).toBeGreaterThanOrEqual(2);
      expect(state.reviewPlans[wordSetId1]).toBeDefined();
      expect(state.reviewPlans[wordSetId2]).toBeDefined();
    });
  });

  describe("loadDueReviewPlans", () => {
    it("应该加载到期的复习计划", async () => {
      // 创建测试数据
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
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
      });

      await useReviewStore.getState().loadDueReviewPlans();

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.dueReviewPlans.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getOrCreateReviewPlan", () => {
    it("应该创建新的复习计划", async () => {
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const plan = await useReviewStore
        .getState()
        .getOrCreateReviewPlan(wordSetId, 10);

      expect(plan).toBeDefined();
      expect(plan.wordSetId).toBe(wordSetId);
      expect(plan.totalWords).toBe(10);
      expect(plan.reviewStage).toBe(1);
      expect(plan.isCompleted).toBe(false);

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
      expect(state.reviewPlans[wordSetId]).toBeDefined();
    });

    it("应该返回已存在的复习计划", async () => {
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      // 先创建一个复习计划
      const plan1 = await useReviewStore
        .getState()
        .getOrCreateReviewPlan(wordSetId, 10);

      // 再次调用应该返回同一个计划
      const plan2 = await useReviewStore
        .getState()
        .getOrCreateReviewPlan(wordSetId, 10);

      expect(plan1.id).toBe(plan2.id);
    });
  });

  describe("updateReviewPlan", () => {
    it("应该更新复习计划", async () => {
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const plan = await useReviewStore
        .getState()
        .getOrCreateReviewPlan(wordSetId, 10);

      const updatedPlan = {
        ...plan,
        reviewStage: 2,
        completedStages: [1],
        updatedAt: new Date().toISOString(),
      };

      await useReviewStore.getState().updateReviewPlan(updatedPlan);

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
      expect(state.reviewPlans[wordSetId]?.reviewStage).toBe(2);
      expect(state.reviewPlans[wordSetId]?.completedStages).toEqual([1]);
    });
  });

  describe("completeReviewStage", () => {
    it("应该完成复习阶段并进入下一阶段", async () => {
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const plan = await useReviewStore
        .getState()
        .getOrCreateReviewPlan(wordSetId, 10);

      expect(plan.reviewStage).toBe(1);

      const updatedPlan = await useReviewStore
        .getState()
        .completeReviewStage(wordSetId);

      expect(updatedPlan.reviewStage).toBe(2);
      expect(updatedPlan.completedStages).toContain(1);

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
      expect(state.reviewPlans[wordSetId]?.reviewStage).toBe(2);
    });
  });

  describe("deleteReviewPlan", () => {
    it("应该删除复习计划", async () => {
      const wordSetId = await db.wordSets.add({
        name: "测试单词集",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      await useReviewStore.getState().getOrCreateReviewPlan(wordSetId, 10);

      // 先加载到状态中
      await useReviewStore.getState().loadReviewPlan(wordSetId);

      await useReviewStore.getState().deleteReviewPlan(wordSetId);

      const state = useReviewStore.getState();
      expect(state.loading).toBe(false);
      expect(state.reviewPlans[wordSetId]).toBeUndefined();
    });
  });

  describe("clearError", () => {
    it("应该清除错误", () => {
      // 先设置一个错误
      useReviewStore.setState({ error: "测试错误" });

      useReviewStore.getState().clearError();

      const state = useReviewStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe("reset", () => {
    it("应该重置所有状态", () => {
      // 设置一些状态
      useReviewStore.setState({
        reviewPlans: {
          1: {
            id: 1,
            wordSetId: 1,
            reviewStage: 1,
            nextReviewAt: new Date().toISOString(),
            completedStages: [],
            startedAt: new Date().toISOString(),
            isCompleted: false,
            totalWords: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        error: "测试错误",
      });

      useReviewStore.getState().reset();

      const state = useReviewStore.getState();
      expect(state.reviewPlans).toEqual({});
      expect(state.dueReviewPlans).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
