import Dexie, { Table } from "dexie";

// 默认值常量
export const DEFAULT_WORD_TYPE = "undefined";
export const DEFAULT_WORD_SET_NAME = "Default";
export const DEFAULT_WORD_SET_ID = 0; // 默认单词集的固定ID

export interface Word {
  id: number;
  kanji?: string;
  setId?: number; // 未设置时将使用默认集合ID
  createdAt?: string;
  updatedAt?: string;
  kana: string;
  meaning: string;
  type?: string; // 未设置时将使用默认值
  example?: string;
  review?: {
    times: number;  // 已经复习的次数
    nextReview?: string;  // 下次复习时间
    difficulty?: number;  //难度系数
  };
  mark?: string;
}

export interface WordSet {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  mark?: string;
}

// 学习模式
export type StudyMode = "flashcard" | "test" | "review";

export interface FlashcardSessionState {
  wordSetId?: number;
  wordIds: number[];
  currentIndex: number;
  sessionStats: {
    studiedCount: number;
    correctCount: number;
    wrongCount: number;
  };
  showAnswer: boolean;
  currentWordId?: number;
  savedAt: string;
}

// 用户设置（单行表，id 固定为 1）
export interface UserSettings {
  id: number; // 固定为 1
  currentMode: StudyMode;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  createdAt?: string;
  updatedAt?: string;
  flashcardSessionState?: FlashcardSessionState | null;
  // 复习锁定状态（v4 新增）
  activeReviewLock?: {
    wordSetId: number;
    reviewStage: number;
    lockedAt: string;
  } | null;
}

// 每日统计（用于展示“今日已学习单词数”等，并支撑 Streak 计算）
export interface DailyStat {
  date: string; // YYYY-MM-DD
  learnedCount: number; // 当日新增学习（或完成学习）数量
  reviewedCount: number; // 当日复习数量
  testedCount: number; // 当日测试数量
  correctCount: number; // 当日答对总数
  goal?: number; // 当日目标（冗余存储，便于历史回看）
  updatedAt?: string;
}

// 学习会话（一次进入闪卡/测试/复习的完整过程）
export interface StudySession {
  id?: number;
  date: string; // YYYY-MM-DD
  mode: StudyMode;
  startedAt: string;
  finishedAt?: string;
  studiedCount: number; // 本次会话接触到的单词数量
  correctCount: number;
  wrongCount: number;
  newLearnedCount: number; // 本次会话中新学/达成学习的数量
}

// 单词级进度（间隔重复、动态排序依据）
export interface WordProgress {
  wordId: number; // 与 words.id 一一对应
  setId: number; // 冗余，便于按集合筛选
  easeFactor: number; // SM-2 EF（初始 2.5）
  intervalDays: number; // 当前间隔天数
  repetitions: number; // 连续复习成功次数
  difficulty?: number; // 用户导入/标注的难度（1-5）
  timesSeen: number; // 累计出现次数
  timesCorrect: number; // 累计答对次数
  correctStreak: number; // 连续答对
  wrongStreak: number; // 连续答错
  lastResult?: "correct" | "wrong" | "skip";
  lastMode?: StudyMode;
  lastReviewedAt?: string;
  nextReviewAt?: string; // 计划下次复习时间（ISO）
  // 答题速度相关字段（v3 新增）
  averageResponseTime?: number; // 平均答题时间（毫秒）
  lastResponseTime?: number; // 最近一次答题时间（毫秒）
  fastResponseCount?: number; // 快速答题次数（< 3秒）
  slowResponseCount?: number; // 慢速答题次数（> 10秒）
  createdAt?: string;
  updatedAt?: string;
}

// 复习/测试记录（明细日志，便于回放与调参）
export interface ReviewLog {
  id?: number;
  wordId: number;
  timestamp: string; // ISO
  mode: StudyMode;
  result: "correct" | "wrong" | "skip";
  grade?: 0 | 1 | 2 | 3 | 4 | 5; // 若采用 0-5 评分
  nextReviewAt?: string; // 本次打分后计算出的下一次时间
  easeFactorAfter?: number;
  intervalDaysAfter?: number;
  // 答题速度相关字段（v3 新增）
  responseTime?: number; // 本次答题时间（毫秒）
}

// 复习计划（基于艾宾浩斯遗忘曲线）
export interface ReviewPlan {
  id?: number; // 自增主键
  wordSetId: number; // 关联 wordSets.id（外键逻辑）
  reviewStage: number; // 当前复习阶段（1-8）
  nextReviewAt: string; // ISO 格式，下次复习时间
  completedStages: number[]; // 已完成的阶段数组 [1, 2, 3, ...]
  startedAt: string; // 开始复习的时间（ISO）
  lastCompletedAt?: string; // 最后一次完成复习的时间（ISO）
  isCompleted: boolean; // 是否完成全部 8 次复习
  totalWords: number; // 该单词集的总单词数（冗余，便于统计）
  createdAt?: string;
  updatedAt?: string;
}

export class JpLearnDB extends Dexie {
  wordSets!: Table<WordSet, number>;
  words!: Table<Word, number>;
  // 新增：用户设置、学习统计与调度相关的表
  userSettings!: Table<UserSettings, number>;
  studySessions!: Table<StudySession, number>;
  dailyStats!: Table<DailyStat, string>; // 以 YYYY-MM-DD 为主键
  wordProgress!: Table<WordProgress, number>; // 主键为 wordId（唯一）
  reviewLogs!: Table<ReviewLog, number>;
  reviewPlans!: Table<ReviewPlan, number>; // 复习计划表（v4 新增）

  constructor() {
    super("jpLearnDB");
    this.version(1).stores({
      wordSets: "++id, name, createdAt",
      words: "++id, kana, kanji, meaning, type, [setId+kana]",
    });

    // 数据库升级时初始化默认数据
    this.version(1).upgrade(async (trans) => {
      // 确保默认单词集存在，使用固定ID 0
      const defaultWordSet = await trans.table("wordSets").get(DEFAULT_WORD_SET_ID);

      if (!defaultWordSet) {
        await trans.table("wordSets").put({
          id: DEFAULT_WORD_SET_ID,
          name: DEFAULT_WORD_SET_NAME,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as WordSet);
      }

      // 为没有 type 的单词设置默认 type
      const wordsTable = trans.table("words");
      const wordsWithoutType = await wordsTable.filter((word) => word.type === undefined || word.type === null).toArray();
      for (const word of wordsWithoutType) {
        await wordsTable.update(word.id, { type: DEFAULT_WORD_TYPE });
      }
    });

    // v2：扩展表结构以支持学习统计、间隔重复与模式参数
    this.version(2).stores({
      wordSets: "++id, name, createdAt",
      words: "++id, kana, kanji, meaning, type, [setId+kana]",
      userSettings: "id", // 固定单行：id = 1
      studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
      dailyStats: "date", // 主键：YYYY-MM-DD
      wordProgress: "wordId, setId, nextReviewAt, easeFactor, intervalDays, repetitions, lastReviewedAt, lastResult, timesSeen, timesCorrect, correctStreak, wrongStreak, difficulty",
      reviewLogs: "++id, wordId, timestamp, mode, result, grade, nextReviewAt",
    }).upgrade(async (trans) => {
      // 初始化用户设置（若不存在）
      const settingsTable = trans.table("userSettings");
      const existingSettings = await settingsTable.get(1);
      if (!existingSettings) {
        const nowIso = new Date().toISOString();
        await settingsTable.put({
          id: 1,
          currentMode: "flashcard",
          dailyGoal: 20,
          currentStreak: 0,
          longestStreak: 0,
          updatedAt: nowIso,
          createdAt: nowIso,
        } as UserSettings);
      }

      // 将 words 中已有数据迁移到 wordProgress（若不存在）
      const wordsTable = trans.table("words");
      const progressTable = trans.table("wordProgress");
      const allWords = await wordsTable.toArray();
      const now = new Date();
      for (const w of allWords) {
        if (!w || typeof w.id !== "number") continue;
        const existing = await progressTable.get(w.id);
        if (existing) continue;

        const review = w.review || { times: 0, difficulty: undefined, nextReview: undefined };
        const repetitions = review.times ?? 0;
        const difficulty = review.difficulty ?? undefined;
        const nextReviewAt = review.nextReview ?? undefined;

        const initial: WordProgress = {
          wordId: w.id,
          setId: typeof w.setId === "number" ? w.setId : DEFAULT_WORD_SET_ID,
          // SM-2 风格的初始参数（保守值，后续按答题动态调整）
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions,
          difficulty,
          timesSeen: 0,
          timesCorrect: 0,
          correctStreak: 0,
          wrongStreak: 0,
          lastResult: undefined,
          lastMode: undefined,
          lastReviewedAt: undefined,
          nextReviewAt: nextReviewAt,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        await progressTable.put(initial);
      }
    });

    // v3：添加答题速度支持
    this.version(3).stores({
      wordSets: "++id, name, createdAt",
      words: "++id, kana, kanji, meaning, type, [setId+kana]",
      userSettings: "id",
      studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
      dailyStats: "date",
      wordProgress: "wordId, setId, nextReviewAt, easeFactor, intervalDays, repetitions, lastReviewedAt, lastResult, timesSeen, timesCorrect, correctStreak, wrongStreak, difficulty, averageResponseTime",
      reviewLogs: "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime",
    }).upgrade(async (trans) => {
      // 为现有的 wordProgress 记录添加答题速度字段的默认值
      const progressTable = trans.table("wordProgress");
      const allProgress = await progressTable.toArray();
      for (const progress of allProgress) {
        if (progress.averageResponseTime === undefined) {
          await progressTable.update(progress.wordId, {
            averageResponseTime: undefined,
            lastResponseTime: undefined,
            fastResponseCount: 0,
            slowResponseCount: 0,
          });
        }
      }
    });

    // v4：添加复习计划表（支持艾宾浩斯遗忘曲线）
    this.version(4).stores({
      wordSets: "++id, name, createdAt",
      words: "++id, kana, kanji, meaning, type, [setId+kana]",
      userSettings: "id",
      studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
      dailyStats: "date",
      wordProgress: "wordId, setId, nextReviewAt, easeFactor, intervalDays, repetitions, lastReviewedAt, lastResult, timesSeen, timesCorrect, correctStreak, wrongStreak, difficulty, averageResponseTime",
      reviewLogs: "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime",
      reviewPlans: "++id, wordSetId, reviewStage, nextReviewAt, isCompleted, [wordSetId+reviewStage], [nextReviewAt+isCompleted]",
    }).upgrade(async (trans) => {
      // 为所有现有单词集创建初始复习计划
      const wordSetsTable = trans.table("wordSets");
      const wordsTable = trans.table("words");
      const reviewPlansTable = trans.table("reviewPlans");

      const allWordSets = await wordSetsTable.toArray();
      const now = new Date();

      for (const wordSet of allWordSets) {
        // 检查是否已存在复习计划（防止重复创建）
        const existing = await reviewPlansTable
          .where("wordSetId")
          .equals(wordSet.id)
          .first();

        if (!existing) {
          // 统计该单词集的单词数
          const wordCount = await wordsTable
            .where("setId")
            .equals(wordSet.id)
            .count();

          // 创建初始复习计划（阶段1，1小时后复习）
          const firstReviewTime = new Date(now);
          firstReviewTime.setHours(firstReviewTime.getHours() + 1);

          await reviewPlansTable.add({
            wordSetId: wordSet.id,
            reviewStage: 1,
            nextReviewAt: firstReviewTime.toISOString(),
            completedStages: [],
            startedAt: now.toISOString(),
            isCompleted: false,
            totalWords: wordCount,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          } as ReviewPlan);
        }
      }
    });
  }
}

export let db = new JpLearnDB();

/**
 * 内部函数：确保默认单词集存在（不检查数据库是否打开）
 */
async function ensureDefaultWordSetExists(): Promise<void> {
  let defaultWordSet = await db.wordSets.get(DEFAULT_WORD_SET_ID);

  if (!defaultWordSet) {
    await db.wordSets.put({
      id: DEFAULT_WORD_SET_ID,
      name: DEFAULT_WORD_SET_NAME,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as WordSet);
  }
}

/**
 * 获取或创建默认单词集
 * @returns 默认单词集的ID（固定为0）
 */
export async function getOrCreateDefaultWordSet(): Promise<number> {
  await ensureDBOpen();
  await ensureDefaultWordSetExists();
  return DEFAULT_WORD_SET_ID;
}

export async function ensureDBOpen() {
  try {
    // 如果数据库未打开，尝试打开
    if (!db.isOpen()) {
      await db.open();
    }
    
    // 验证数据库是否真的打开
    if (!db.isOpen()) {
      throw new Error("数据库打开失败");
    }
    
    // 无论数据库是否已打开，都确保默认单词集存在
    await ensureDefaultWordSetExists();
    
    return db;
  } catch (error) {
    console.error("ensureDBOpen 失败:", error);
    // 尝试重新打开数据库
    try {
      await db.open();
      await ensureDefaultWordSetExists();
      return db;
    } catch (retryError) {
      console.error("重试打开数据库失败:", retryError);
      throw retryError;
    }
  }
}

// 删除后重建并打开
export async function resetDB() {
  try {
    await db.delete(); // 删除整个 IndexedDB
  } finally {
    db = new JpLearnDB(); // 重新构建实例（包含 schema）
    await db.open(); // 立刻打开，避免后续第一笔操作再碰 closed
  }
  return db;
}
