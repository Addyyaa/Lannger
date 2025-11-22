import Dexie, { Table } from "dexie";
// 导入迁移函数（用于在 upgrade 回调中调用，实现代码复用）
import { v1Migration } from "./db/migrations/v1";
import { v2Migration } from "./db/migrations/v2";
import { v3Migration } from "./db/migrations/v3";
import { v4Migration } from "./db/migrations/v4";
import { v5Migration } from "./db/migrations/v5";
import { v6Migration } from "./db/migrations/v6";
import { v7Migration } from "./db/migrations/v7";

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
    times: number; // 已经复习的次数
    nextReview?: string; // 下次复习时间
    difficulty?: number; //难度系数
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

// v6 新增：闪卡会话状态表（独立存储，优化性能）
export interface FlashcardSession {
  id?: number; // 自增主键
  userId: number; // 固定为 1（单用户应用）
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
  savedAt: string; // ISO 格式
  createdAt?: string;
  updatedAt?: string;
}

// v6 新增：复习锁定状态表（独立存储，优化性能）
export interface ReviewLock {
  id?: number; // 自增主键
  userId: number; // 固定为 1（单用户应用）
  wordSetId: number;
  reviewStage: number;
  lockedAt: string; // ISO 格式
  createdAt?: string;
  updatedAt?: string;
}

// 用户设置（单行表，id 固定为 1）
// v6 优化：移除 flashcardSessionState 和 activeReviewLock（已迁移到独立表）
export interface UserSettings {
  id: number; // 固定为 1
  currentMode: StudyMode;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  createdAt?: string;
  updatedAt?: string;
  // v6 已移除：flashcardSessionState（迁移到 flashcardSessions 表）
  // v6 已移除：activeReviewLock（迁移到 reviewLocks 表）
}

// 每日统计（用于展示"今日已学习单词数"等，并支撑 Streak 计算）
export interface DailyStat {
  date: string; // YYYY-MM-DD
  learnedCount: number; // 当日新增学习（或完成学习）数量
  reviewedCount: number; // 当日复习数量
  testedCount: number; // 当日测试数量
  correctCount: number; // 当日答对总数
  goal?: number; // 当日目标（冗余存储，便于历史回看）
  learnedWordIds?: number[]; // 今日已学习的单词ID列表（用于去重，只统计首次掌握的单词）
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
  learnedWordIds?: number[]; // 该复习计划对应的单词ID列表（用于区分不同的学习批次）
  createdAt?: string;
  updatedAt?: string;
}

// 复习日志归档表（v7 新增：用于归档 90-365 天的日志）
export interface ReviewLogsArchive {
  id?: number; // 自增主键
  date: string; // YYYY-MM-DD
  wordIds?: number[]; // 单词 ID 列表（可选，如果数据量大则只保留数量）
  wordCount?: number; // 单词数量（当 wordIds 过大时使用）
  totalCount: number; // 总记录数
  correctCount: number; // 正确数量
  wrongCount: number; // 错误数量
  skipCount: number; // 跳过数量
  avgResponseTime?: number; // 平均响应时间（毫秒）
  createdAt: string; // 归档时间
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
  flashcardSessions!: Table<FlashcardSession, number>; // 闪卡会话状态表（v6 新增）
  reviewLocks!: Table<ReviewLock, number>; // 复习锁定状态表（v6 新增）
  reviewLogsArchive!: Table<ReviewLogsArchive, number>; // 复习日志归档表（v7 新增）

  constructor() {
    super("jpLearnDB");
    this.version(1).stores({
      wordSets: "++id, name, createdAt",
      words: "++id, kana, kanji, meaning, type, [setId+kana]",
    });

    // 数据库升级时初始化默认数据
    // 使用模块化迁移函数（保持向后兼容）
    this.version(1).upgrade(async () => {
      await v1Migration.up(this);
    });

    // v2：扩展表结构以支持学习统计、间隔重复与模式参数
    this.version(2)
      .stores({
        wordSets: "++id, name, createdAt",
        words: "++id, kana, kanji, meaning, type, [setId+kana]",
        userSettings: "id", // 固定单行：id = 1
        studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
        dailyStats: "date", // 主键：YYYY-MM-DD
        wordProgress:
          "wordId, setId, nextReviewAt, easeFactor, intervalDays, repetitions, lastReviewedAt, lastResult, timesSeen, timesCorrect, correctStreak, wrongStreak, difficulty",
        reviewLogs:
          "++id, wordId, timestamp, mode, result, grade, nextReviewAt",
      })
      .upgrade(async () => {
        // 使用模块化迁移函数（保持向后兼容）
        await v2Migration.up(this);
      });

    // v3：添加答题速度支持
    this.version(3)
      .stores({
        wordSets: "++id, name, createdAt",
        words: "++id, kana, kanji, meaning, type, [setId+kana]",
        userSettings: "id",
        studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
        dailyStats: "date",
        wordProgress:
          "wordId, setId, nextReviewAt, easeFactor, intervalDays, repetitions, lastReviewedAt, lastResult, timesSeen, timesCorrect, correctStreak, wrongStreak, difficulty, averageResponseTime",
        reviewLogs:
          "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime",
      })
      .upgrade(async () => {
        // 使用模块化迁移函数（保持向后兼容）
        await v3Migration.up(this);
      });

    // v4：添加复习计划表（支持艾宾浩斯遗忘曲线）
    this.version(4)
      .stores({
        wordSets: "++id, name, createdAt",
        words: "++id, kana, kanji, meaning, type, [setId+kana]",
        userSettings: "id",
        studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
        dailyStats: "date",
        wordProgress:
          "wordId, setId, nextReviewAt, easeFactor, intervalDays, repetitions, lastReviewedAt, lastResult, timesSeen, timesCorrect, correctStreak, wrongStreak, difficulty, averageResponseTime",
        reviewLogs:
          "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime",
        reviewPlans:
          "++id, wordSetId, reviewStage, nextReviewAt, isCompleted, [wordSetId+reviewStage], [nextReviewAt+isCompleted]",
      })
      .upgrade(async () => {
        // 使用模块化迁移函数（保持向后兼容）
        await v4Migration.up(this);
      });

    // v5：优化索引（性能优化）
    // wordProgress: 从14个索引减少到5个（保留高频查询字段）
    // reviewPlans: 从7个索引减少到4个（移除低频使用索引）
    this.version(5)
      .stores({
        wordSets: "++id, name, createdAt",
        words: "++id, kana, kanji, meaning, type, [setId+kana]",
        userSettings: "id",
        studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
        dailyStats: "date",
        // 优化后的 wordProgress 索引：只保留高频查询字段
        // 保留：wordId (主键), setId, nextReviewAt, lastReviewedAt, [setId+nextReviewAt]
        // 移除：easeFactor, intervalDays, repetitions, lastResult, timesSeen, timesCorrect,
        //       correctStreak, wrongStreak, difficulty, averageResponseTime
        wordProgress:
          "wordId, setId, nextReviewAt, lastReviewedAt, [setId+nextReviewAt]",
        reviewLogs:
          "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime",
        // 优化后的 reviewPlans 索引：只保留高频查询字段
        // 保留：++id, wordSetId, nextReviewAt, [wordSetId+reviewStage]
        // 移除：reviewStage, isCompleted, [nextReviewAt+isCompleted]
        reviewPlans: "++id, wordSetId, nextReviewAt, [wordSetId+reviewStage]",
      })
      .upgrade(async () => {
        // 使用模块化迁移函数（保持向后兼容）
        await v5Migration.up(this);
      });

    // v6：优化 userSettings 表结构（将会话状态和锁定状态独立存储）
    // 新增表：flashcardSessions（闪卡会话状态）、reviewLocks（复习锁定状态）
    // 优化效果：写入性能提升 5-6 倍
    this.version(6)
      .stores({
        wordSets: "++id, name, createdAt",
        words: "++id, kana, kanji, meaning, type, [setId+kana]",
        userSettings: "id", // 移除 flashcardSessionState 和 activeReviewLock 字段
        studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
        dailyStats: "date",
        wordProgress:
          "wordId, setId, nextReviewAt, lastReviewedAt, [setId+nextReviewAt]",
        reviewLogs:
          "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime",
        reviewPlans: "++id, wordSetId, nextReviewAt, [wordSetId+reviewStage]",
        flashcardSessions: "++id, userId, savedAt", // 新增表
        reviewLocks: "++id, userId, wordSetId", // 新增表
      })
      .upgrade(async () => {
        // 使用模块化迁移函数（保持向后兼容）
        await v6Migration.up(this);
      });

    // v7：添加复习日志归档表（用于归档 90-365 天的日志）
    this.version(7)
      .stores({
        wordSets: "++id, name, createdAt",
        words: "++id, kana, kanji, meaning, type, [setId+kana]",
        userSettings: "id",
        studySessions: "++id, mode, startedAt, finishedAt, date, [date+mode]",
        dailyStats: "date",
        wordProgress:
          "wordId, setId, nextReviewAt, lastReviewedAt, [setId+nextReviewAt]",
        reviewLogs:
          "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime",
        reviewPlans: "++id, wordSetId, nextReviewAt, [wordSetId+reviewStage]",
        flashcardSessions: "++id, userId, savedAt",
        reviewLocks: "++id, userId, wordSetId",
        reviewLogsArchive: "++id, date, [date+wordId]", // 新增归档表
      })
      .upgrade(async () => {
        // 使用模块化迁移函数（保持向后兼容）
        await v7Migration.up(this);
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

/**
 * 导出迁移管理器（用于高级功能：手动迁移、回滚等）
 *
 * 使用示例：
 * ```typescript
 * import { db, getMigrationManager } from "./db";
 *
 * const manager = getMigrationManager();
 * // 手动迁移到指定版本
 * await manager.migrate(6);
 * // 回滚到指定版本
 * await manager.rollback(5);
 * // 查看迁移日志
 * const logs = manager.getMigrationLogs();
 * ```
 */
export function getMigrationManager() {
  // 使用动态导入避免循环依赖
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MigrationManager } = require("./db/migrations/MigrationManager");
  return new MigrationManager(db);
}
