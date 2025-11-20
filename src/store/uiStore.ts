/**
 * UI 状态管理 Store（Zustand）
 * 管理全局 UI 状态：加载状态、错误提示、Toast 通知、Modal 状态
 */

import { create } from "zustand";
import { ErrorLog } from "../utils/errorHandler";

/**
 * Toast 通知接口
 */
export interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number; // 显示时长（毫秒），默认 3000
}

/**
 * UI Store 接口
 */
export interface UIStore {
  // Loading states
  loading: Record<string, boolean>; // key -> loading state
  setLoading: (key: string, loading: boolean) => void;

  // Error states
  errors: ErrorLog[];
  addError: (error: ErrorLog) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;

  // Toast notifications
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Modal states
  modals: Record<string, boolean>;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * UI Store（Zustand）
 */
export const useUIStore = create<UIStore>((set) => ({
  // Loading states
  loading: {},
  setLoading: (key, loading) =>
    set((state) => ({
      loading: { ...state.loading, [key]: loading },
    })),

  // Error states
  errors: [],
  addError: (error) =>
    set((state) => {
      const errorWithId: ErrorLog = {
        ...error,
        id: error.id || generateId(),
      };
      return {
        errors: [...state.errors, errorWithId],
      };
    }),
  clearError: (id) =>
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    })),
  clearAllErrors: () => set({ errors: [] }),

  // Toast notifications
  toasts: [],
  showToast: (toast) =>
    set((state) => {
      const newToast: Toast = {
        ...toast,
        id: generateId(),
        duration: toast.duration || 3000,
      };

      // 自动移除（如果设置了 duration）
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          set((s) => ({
            toasts: s.toasts.filter((t) => t.id !== newToast.id),
          }));
        }, newToast.duration);
      }

      return {
        toasts: [...state.toasts, newToast],
      };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Modal states
  modals: {},
  openModal: (key) =>
    set((state) => ({
      modals: { ...state.modals, [key]: true },
    })),
  closeModal: (key) =>
    set((state) => ({
      modals: { ...state.modals, [key]: false },
    })),
}));
