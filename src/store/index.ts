/**
 * Store 统一导出
 * 提供所有 Zustand Store 的统一访问入口
 */

// Word Store
export { useWordStore } from "./wordStore.zustand";
export type { WordStore } from "./wordStore.zustand";

// Review Store
export { useReviewStore } from "./reviewStore.zustand";
export type { ReviewStore } from "./reviewStore.zustand";

// UI Store
export { useUIStore } from "./uiStore";
export type { UIStore, Toast } from "./uiStore";

// 统一的 Store Hooks（推荐使用）
export * from "./hooks";

// 兼容性导出：保持旧的 wordStore 和 reviewStore 导出，内部调用新 Store
// 注意：这些是临时兼容层，后续会逐步迁移组件使用新的 Zustand Store
export * from "./wordStore"; // 旧的 wordStore（作为 wordService 的别名）
export * from "./reviewStore"; // 旧的 reviewStore（作为 reviewService 的别名）
