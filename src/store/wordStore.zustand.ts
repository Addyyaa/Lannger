/**
 * 单词数据 Store（Zustand 版本）
 * 管理单词集、单词、单词进度的全局状态
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Word, WordSet, WordProgress } from "../db";
import { db, ensureDBOpen } from "../db";
import * as wordService from "../services/wordService";

/**
 * Word Store 接口
 */
export interface WordStore {
  // State
  wordSets: WordSet[];
  words: Record<number, Word>; // wordId -> Word
  wordProgress: Record<number, WordProgress>; // wordId -> Progress
  currentWordSetId: number | null;
  loading: boolean;
  error: string | null;

  // Actions - 加载数据
  loadWordSets: () => Promise<void>;
  loadWords: (wordSetId: number) => Promise<void>;
  loadWordProgress: (wordIds: number[]) => Promise<void>;
  loadAllWords: () => Promise<void>;

  // Actions - CRUD 操作
  createWordSet: (
    wordSet: Omit<WordSet, "id" | "createdAt" | "updatedAt">
  ) => Promise<number>;
  createWord: (
    word: Omit<Word, "id" | "createdAt" | "updatedAt">
  ) => Promise<number>;
  updateWordSet: (wordSet: WordSet) => Promise<void>;
  updateWord: (word: Word) => Promise<void>;
  deleteWordSet: (id: number) => Promise<boolean>;
  deleteWord: (id: number) => Promise<boolean>;

  // Actions - 搜索
  searchWordSets: (query: string) => Promise<WordSet[]>;
  searchWords: (
    query: string,
    wordSetId?: number,
    limit?: number
  ) => Promise<Word[]>;

  // Actions - 工具方法
  setCurrentWordSetId: (id: number | null) => void;
  clearError: () => void;
  reset: () => void; // 重置所有状态（用于测试）
}

/**
 * Word Store（Zustand）
 * 使用 persist middleware 持久化 currentWordSetId
 */
export const useWordStore = create<WordStore>()(
  persist(
    (set, get) => ({
      // Initial state
      wordSets: [],
      words: {},
      wordProgress: {},
      currentWordSetId: null,
      loading: false,
      error: null,

      // Actions - 加载数据
      loadWordSets: async () => {
        set({ loading: true, error: null });
        try {
          const wordSets = await wordService.getAllWordSets();
          set({ wordSets, loading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "加载单词集失败";
          set({ error: errorMessage, loading: false });
        }
      },

      loadWords: async (wordSetId: number) => {
        set({ loading: true, error: null });
        try {
          const words = await wordService.getWordsByWordSet(wordSetId);
          const wordsMap = words.reduce((acc, word) => {
            if (word.id !== undefined) {
              acc[word.id] = word;
            }
            return acc;
          }, {} as Record<number, Word>);
          set((state) => ({
            words: { ...state.words, ...wordsMap },
            loading: false,
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "加载单词失败";
          set({ error: errorMessage, loading: false });
        }
      },

      loadAllWords: async () => {
        set({ loading: true, error: null });
        try {
          const words = await wordService.getAllWords();
          const wordsMap = words.reduce((acc, word) => {
            if (word.id !== undefined) {
              acc[word.id] = word;
            }
            return acc;
          }, {} as Record<number, Word>);
          set({ words: wordsMap, loading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "加载所有单词失败";
          set({ error: errorMessage, loading: false });
        }
      },

      loadWordProgress: async (wordIds: number[]) => {
        try {
          await ensureDBOpen();
          // 批量查询 wordProgress
          const progresses = await db.wordProgress.bulkGet(wordIds);
          const progressMap: Record<number, WordProgress> = {};

          for (let i = 0; i < wordIds.length; i++) {
            const wordId = wordIds[i];
            const progress = progresses[i];
            if (progress) {
              progressMap[wordId] = progress;
            }
          }

          set((state) => ({
            wordProgress: { ...state.wordProgress, ...progressMap },
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "加载单词进度失败";
          set({ error: errorMessage });
        }
      },

      // Actions - CRUD 操作
      createWordSet: async (wordSet) => {
        set({ loading: true, error: null });
        try {
          const id = await wordService.createWordSet(wordSet);
          // 重新加载单词集列表
          await get().loadWordSets();
          set({ loading: false });
          return id;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "创建单词集失败";
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      createWord: async (word) => {
        set({ loading: true, error: null });
        try {
          const id = await wordService.createWord(word);
          // 如果创建成功，重新加载对应单词集的单词
          if (word.setId !== undefined) {
            await get().loadWords(word.setId);
          }
          set({ loading: false });
          return id;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "创建单词失败";
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      updateWordSet: async (wordSet) => {
        set({ loading: true, error: null });
        try {
          await wordService.updateWordSet(wordSet);
          // 更新本地状态
          set((state) => ({
            wordSets: state.wordSets.map((ws) =>
              ws.id === wordSet.id ? wordSet : ws
            ),
            loading: false,
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "更新单词集失败";
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      updateWord: async (word) => {
        set({ loading: true, error: null });
        try {
          await wordService.updateWord(word);
          // 更新本地状态
          if (word.id !== undefined) {
            set((state) => ({
              words: { ...state.words, [word.id!]: word },
              loading: false,
            }));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "更新单词失败";
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      deleteWordSet: async (id) => {
        set({ loading: true, error: null });
        try {
          const success = await wordService.deleteWordSet(id);
          if (success) {
            // 重新加载单词集列表
            await get().loadWordSets();
            // 如果删除的是当前选中的单词集，清空选择
            if (get().currentWordSetId === id) {
              set({ currentWordSetId: null });
            }
          }
          set({ loading: false });
          return success;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "删除单词集失败";
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      deleteWord: async (id) => {
        set({ loading: true, error: null });
        try {
          const success = await wordService.deleteWord(id);
          if (success) {
            // 从本地状态中移除
            set((state) => {
              const { [id]: deleted, ...words } = state.words;
              const { [id]: deletedProgress, ...wordProgress } =
                state.wordProgress;
              return { words, wordProgress };
            });
          }
          set({ loading: false });
          return success;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "删除单词失败";
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      // Actions - 搜索
      searchWordSets: async (query: string) => {
        try {
          const results = await wordService.fuzzySearchWordSets(query);
          return results;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "搜索单词集失败";
          set({ error: errorMessage });
          return [];
        }
      },

      searchWords: async (query: string, wordSetId?: number, limit = 50) => {
        try {
          const results = await wordService.fuzzySearchWords(
            query,
            wordSetId,
            limit
          );
          return results;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "搜索单词失败";
          set({ error: errorMessage });
          return [];
        }
      },

      // Actions - 工具方法
      setCurrentWordSetId: (id) => set({ currentWordSetId: id }),

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          wordSets: [],
          words: {},
          wordProgress: {},
          currentWordSetId: null,
          loading: false,
          error: null,
        }),
    }),
    {
      name: "word-store", // LocalStorage key
      partialize: (state) => ({
        // 只持久化 currentWordSetId，不持久化 words 和 wordProgress（从数据库加载）
        currentWordSetId: state.currentWordSetId,
      }),
    }
  )
);
