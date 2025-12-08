/**
 * 复习计划 Store（Zustand 版本）
 * 管理复习计划的全局状态
 */

import { create } from "zustand";
import { ReviewPlan } from "../db";
import * as reviewService from "../services/reviewService";
import { queryCache } from "../utils/queryCache";

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
      // 尝试从缓存获取
      const cacheKey = `reviewStore:plan:${wordSetId}`;
      const cached = queryCache.get<ReviewPlan>(cacheKey);
      if (cached !== null) {
        set((state) => ({
          reviewPlans: { ...state.reviewPlans, [wordSetId]: cached },
          loading: false,
        }));
        return cached;
      }

      // 缓存未命中，从服务层加载
      const plan = await reviewService.getReviewPlan(wordSetId);
      if (plan) {
        // 存入缓存（10 分钟过期）
        queryCache.set(cacheKey, plan, 10 * 60 * 1000);
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
      // 尝试从缓存获取
      const cacheKey = "reviewStore:plans:all";
      const cached = queryCache.get<ReviewPlan[]>(cacheKey);
      if (cached !== null) {
        const plansMap = cached.reduce((acc, plan) => {
          if (plan.wordSetId !== undefined) {
            acc[plan.wordSetId] = plan;
          }
          return acc;
        }, {} as Record<number, ReviewPlan>);
        set({ reviewPlans: plansMap, loading: false });
        return;
      }

      // 缓存未命中，从服务层加载
      const plans = await reviewService.getAllReviewPlans();
      
      // 存入缓存（10 分钟过期）
      queryCache.set(cacheKey, plans, 10 * 60 * 1000);
      
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
      // 尝试从缓存获取（到期计划缓存时间较短，1 分钟）
      const cacheKey = "reviewStore:duePlans";
      const cached = queryCache.get<ReviewPlan[]>(cacheKey);
      if (cached !== null) {
        set({ dueReviewPlans: cached, loading: false });
        return;
      }

      // 缓存未命中，从服务层加载
      const duePlans = await reviewService.getDueReviewPlans();
      
      // 存入缓存（1 分钟过期，因为到期计划会频繁变化）
      queryCache.set(cacheKey, duePlans, 1 * 60 * 1000);
      
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
      // 清除相关缓存
      queryCache.invalidate(`reviewStore:plan:${wordSetId}`);
      queryCache.invalidate("reviewStore:plans:all");
      queryCache.invalidate("reviewStore:duePlans");
      queryCache.invalidate("reviewPlans:*");
      // 存入缓存
      queryCache.set(`reviewStore:plan:${wordSetId}`, plan, 10 * 60 * 1000);
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
      // 清除相关缓存
      queryCache.invalidate(`reviewStore:plan:${plan.wordSetId}`);
      queryCache.invalidate("reviewStore:plans:all");
      queryCache.invalidate("reviewStore:duePlans");
      queryCache.invalidate("reviewPlans:*");
      // 更新缓存
      queryCache.set(`reviewStore:plan:${plan.wordSetId}`, plan, 10 * 60 * 1000);
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
      // 清除相关缓存
      queryCache.invalidate(`reviewStore:plan:${wordSetId}`);
      queryCache.invalidate("reviewStore:plans:all");
      queryCache.invalidate("reviewStore:duePlans");
      queryCache.invalidate("reviewPlans:*");
      // 更新缓存
      queryCache.set(`reviewStore:plan:${wordSetId}`, updatedPlan, 10 * 60 * 1000);
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
      // 清除相关缓存
      queryCache.invalidate(`reviewStore:plan:${wordSetId}`);
      queryCache.invalidate("reviewStore:plans:all");
      queryCache.invalidate("reviewStore:duePlans");
      queryCache.invalidate("reviewPlans:*");
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
