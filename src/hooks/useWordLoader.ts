/**
 * 单词加载 Hook
 * 提供统一的单词加载逻辑
 */

import { useState, useCallback, useEffect } from "react";
import { Word } from "../db";
import * as dbOperator from "../store/wordStore";
import { handleErrorSync } from "../utils/errorHandler";

export interface UseWordLoaderOptions {
  /** 单词集 ID */
  wordSetId?: number;
  /** 加载完成回调 */
  onLoadComplete?: (words: Word[]) => void;
}

export interface UseWordLoaderReturn {
  /** 当前单词 */
  currentWord: Word | null;
  /** 单词 ID 列表 */
  wordIds: number[];
  /** 当前索引 */
  currentIndex: number;
  /** 是否加载中 */
  loading: boolean;
  /** 设置单词 ID 列表 */
  setWordIds: (ids: number[]) => void;
  /** 设置当前索引 */
  setCurrentIndex: (index: number) => void;
  /** 加载当前单词 */
  loadCurrentWord: () => Promise<void>;
  /** 加载下一个单词 */
  loadNextWord: () => Promise<void>;
  /** 加载上一个单词 */
  loadPreviousWord: () => Promise<void>;
  /** 跳转到指定索引 */
  goToIndex: (index: number) => Promise<void>;
}

/**
 * useWordLoader Hook
 * 管理单词的加载和导航
 */
export function useWordLoader(
  _options: UseWordLoaderOptions = {}
): UseWordLoaderReturn {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [wordIds, setWordIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCurrentWord = useCallback(async () => {
    if (wordIds.length === 0) {
      setLoading(false);
      setCurrentWord(null);
      return;
    }

    if (currentIndex < 0 || currentIndex >= wordIds.length) {
      setLoading(false);
      setCurrentWord(null);
      return;
    }

    setLoading(true);
    const wordId = wordIds[currentIndex];
    try {
      const word = await dbOperator.getWord(wordId);
      setCurrentWord(word || null);
    } catch (error) {
      handleErrorSync(error, { operation: "loadCurrentWord", wordId });
      setCurrentWord(null);
    } finally {
      setLoading(false);
    }
  }, [currentIndex, wordIds]);

  const loadNextWord = useCallback(async () => {
    if (currentIndex < wordIds.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, wordIds.length]);

  const loadPreviousWord = useCallback(async () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const goToIndex = useCallback(
    async (index: number) => {
      if (index >= 0 && index < wordIds.length) {
        setCurrentIndex(index);
      }
    },
    [wordIds.length]
  );

  // 当索引或单词列表变化时，加载当前单词
  useEffect(() => {
    loadCurrentWord();
  }, [currentIndex, wordIds, loadCurrentWord]);

  return {
    currentWord,
    wordIds,
    currentIndex,
    loading,
    setWordIds,
    setCurrentIndex,
    loadCurrentWord,
    loadNextWord,
    loadPreviousWord,
    goToIndex,
  };
}
