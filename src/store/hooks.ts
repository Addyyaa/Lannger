/**
 * 统一的 Store Hooks
 * 提供便捷的 Store 访问方式，确保向后兼容
 */

// 直接导出 Zustand Store Hooks
export { useWordStore } from "./wordStore.zustand";
export type { WordStore } from "./wordStore.zustand";

export { useReviewStore } from "./reviewStore.zustand";
export type { ReviewStore } from "./reviewStore.zustand";

export { useUIStore } from "./uiStore";
export type { UIStore, Toast } from "./uiStore";

/**
 * 便捷的选择器 Hooks
 * 用于从 Store 中选择特定状态，避免不必要的重渲染
 */

import { useWordStore as useWordStoreBase } from "./wordStore.zustand";
import { useReviewStore as useReviewStoreBase } from "./reviewStore.zustand";
import { useUIStore as useUIStoreBase } from "./uiStore";

/**
 * 选择单词集列表
 */
export function useWordSets() {
  return useWordStoreBase((state) => state.wordSets);
}

/**
 * 选择当前单词集 ID
 */
export function useCurrentWordSetId() {
  return useWordStoreBase((state) => state.currentWordSetId);
}

/**
 * 选择单词（按 ID）
 */
export function useWord(wordId: number) {
  return useWordStoreBase((state) => state.words[wordId]);
}

/**
 * 选择单词进度（按 ID）
 */
export function useWordProgress(wordId: number) {
  return useWordStoreBase((state) => state.wordProgress[wordId]);
}

/**
 * 选择加载状态
 */
export function useWordStoreLoading() {
  return useWordStoreBase((state) => state.loading);
}

/**
 * 选择错误状态
 */
export function useWordStoreError() {
  return useWordStoreBase((state) => state.error);
}

/**
 * 选择到期复习计划
 */
export function useDueReviewPlans() {
  return useReviewStoreBase((state) => state.dueReviewPlans);
}

/**
 * 选择复习计划（按单词集 ID）
 */
export function useReviewPlan(wordSetId: number) {
  return useReviewStoreBase((state) => state.reviewPlans[wordSetId]);
}

/**
 * 选择复习 Store 加载状态
 */
export function useReviewStoreLoading() {
  return useReviewStoreBase((state) => state.loading);
}

/**
 * 选择 UI 加载状态（按 key）
 */
export function useUILoading(key: string) {
  return useUIStoreBase((state) => state.loading[key] || false);
}

/**
 * 选择所有 UI 加载状态
 */
export function useUILoadingStates() {
  return useUIStoreBase((state) => state.loading);
}

/**
 * 选择错误列表
 */
export function useUIErrors() {
  return useUIStoreBase((state) => state.errors);
}

/**
 * 选择 Toast 列表
 */
export function useUIToasts() {
  return useUIStoreBase((state) => state.toasts);
}

/**
 * 选择 Modal 状态（按 key）
 */
export function useUIModal(key: string) {
  return useUIStoreBase((state) => state.modals[key] || false);
}

