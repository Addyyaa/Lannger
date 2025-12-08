/**
 * 进度跟踪 Hook
 * 提供统一的进度跟踪逻辑
 */

import { useState, useCallback, useRef } from "react";
import { updateWordProgress } from "../algorithm";
import { Word } from "../db";

export interface UseProgressTrackerOptions {
  /** 更新进度回调 */
  onProgressUpdate?: (wordId: number, result: "correct" | "wrong" | "skip") => void;
}

export interface UseProgressTrackerReturn {
  /** 更新单词进度 */
  updateProgress: (
    word: Word,
    result: "correct" | "wrong" | "skip",
    mode: "flashcard" | "test" | "review",
    responseTime?: number
  ) => Promise<void>;
  /** 批量更新进度 */
  batchUpdateProgress: (
    updates: Array<{
      word: Word;
      result: "correct" | "wrong" | "skip";
      mode: "flashcard" | "test" | "review";
      responseTime?: number;
    }>
  ) => Promise<void>;
}

/**
 * useProgressTracker Hook
 * 管理单词学习进度的更新
 */
export function useProgressTracker(
  options: UseProgressTrackerOptions = {}
): UseProgressTrackerReturn {
  const { onProgressUpdate } = options;
  const isUpdatingRef = useRef(false);

  const updateProgress = useCallback(
    async (
      word: Word,
      result: "correct" | "wrong" | "skip",
      mode: "flashcard" | "test" | "review",
      responseTime?: number
    ) => {
      if (!word.id) {
        return;
      }

      if (isUpdatingRef.current) {
        // 防止并发更新
        return;
      }

      try {
        isUpdatingRef.current = true;
        await updateWordProgress(word.id, result, mode, undefined, responseTime);
        onProgressUpdate?.(word.id, result);
      } catch (error) {
        // 错误已在 updateWordProgress 内部处理
        throw error;
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [onProgressUpdate]
  );

  const batchUpdateProgress = useCallback(
    async (
      updates: Array<{
        word: Word;
        result: "correct" | "wrong" | "skip";
        mode: "flashcard" | "test" | "review";
        responseTime?: number;
      }>
    ) => {
      // 批量更新，但保持顺序
      for (const update of updates) {
        await updateProgress(
          update.word,
          update.result,
          update.mode,
          update.responseTime
        );
      }
    },
    [updateProgress]
  );

  return {
    updateProgress,
    batchUpdateProgress,
  };
}

