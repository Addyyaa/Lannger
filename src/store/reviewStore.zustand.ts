/**
 * 复习计划 Store（Zustand 版本）
 * 管理复习计划的全局状态
 */

import { create } from "zustand";
import { ReviewPlan } from "../db";
import * as reviewService from "../services/reviewService";

/**
 * Review Store 接口
 */
export interface ReviewStore {
  // State
  reviewPlans: Record<number, ReviewPlan>; // wordSetId -> ReviewPlan
  dueReviewPlans: ReviewPlan[];
  loading: boolean;
  error: string | null;

  // Actions - 加载数据
  loadReviewPlan: (wordSetId: number) => Promise<ReviewPlan | null>;
  loadAllReviewPlans: () => Promise<void>;
  loadDueReviewPlans: () => Promise<void>;

  // Actions - CRUD 操作
  getOrCreateReviewPlan: (
    wordSetId: number,
    totalWords: number,
    learnedWordIds?: number[]
  ) => Promise<ReviewPlan>;
  updateReviewPlan: (plan: ReviewPlan) => Promise<void>;
  completeReviewStage: (
    wordSetId: number,
    completedAt?: Date,
    reviewPlanId?: number
  ) => Promise<ReviewPlan>;
  deleteReviewPlan: (wordSetId: number) => Promise<void>;

  // Actions - 工具方法
  clearError: () => void;
  reset: () => void; // 重置所有状态（用于测试）
}

/**
 * Review Store（Zustand）
 */
export const useReviewStore = create<ReviewStore>((set) => ({
  // Initial state
  reviewPlans: {},
  dueReviewPlans: [],
  loading: false,
  error: null,

  // Actions - 加载数据
  loadReviewPlan: async (wordSetId: number) => {
    set({ loading: true, error: null });
    try {
      const plan = await reviewService.getReviewPlan(wordSetId);
      if (plan) {
        set((state) => ({
          reviewPlans: { ...state.reviewPlans, [wordSetId]: plan },
          loading: false,
        }));
      } else {
        set({ loading: false });
      }
      return plan;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "加载复习计划失败";
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  loadAllReviewPlans: async () => {
    set({ loading: true, error: null });
    try {
      const plans = await reviewService.getAllReviewPlans();
      const plansMap = plans.reduce((acc, plan) => {
        if (plan.wordSetId !== undefined) {
          acc[plan.wordSetId] = plan;
        }
        return acc;
      }, {} as Record<number, ReviewPlan>);
      set({ reviewPlans: plansMap, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "加载所有复习计划失败";
      set({ error: errorMessage, loading: false });
    }
  },

  loadDueReviewPlans: async () => {
    set({ loading: true, error: null });
    try {
      const duePlans = await reviewService.getDueReviewPlans();
      set({ dueReviewPlans: duePlans, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "加载到期复习计划失败";
      set({ error: errorMessage, loading: false });
    }
  },

  // Actions - CRUD 操作
  getOrCreateReviewPlan: async (
    wordSetId: number,
    totalWords: number,
    learnedWordIds?: number[]
  ) => {
    set({ loading: true, error: null });
    try {
      const plan = await reviewService.getOrCreateReviewPlan(
        wordSetId,
        totalWords,
        learnedWordIds
      );
      set((state) => ({
        reviewPlans: { ...state.reviewPlans, [wordSetId]: plan },
        loading: false,
      }));
      return plan;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "创建复习计划失败";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateReviewPlan: async (plan: ReviewPlan) => {
    set({ loading: true, error: null });
    try {
      await reviewService.updateReviewPlan(plan);
      set((state) => ({
        reviewPlans: {
          ...state.reviewPlans,
          [plan.wordSetId]: plan,
        },
        loading: false,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "更新复习计划失败";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  completeReviewStage: async (
    wordSetId: number,
    completedAt?: Date,
    reviewPlanId?: number
  ) => {
    set({ loading: true, error: null });
    try {
      const updatedPlan = await reviewService.completeReviewStage(
        wordSetId,
        completedAt,
        reviewPlanId
      );
      set((state) => ({
        reviewPlans: {
          ...state.reviewPlans,
          [wordSetId]: updatedPlan,
        },
        loading: false,
      }));
      return updatedPlan;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "完成复习阶段失败";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  deleteReviewPlan: async (wordSetId: number) => {
    set({ loading: true, error: null });
    try {
      await reviewService.deleteReviewPlan(wordSetId);
      set((state) => {
        const { [wordSetId]: deleted, ...reviewPlans } = state.reviewPlans;
        return { reviewPlans, loading: false };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "删除复习计划失败";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Actions - 工具方法
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      reviewPlans: {},
      dueReviewPlans: [],
      loading: false,
      error: null,
    }),
}));
