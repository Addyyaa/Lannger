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

export class JpLearnDB extends Dexie {
  wordSets!: Table<WordSet, number>;
  words!: Table<Word, number>;

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
  if (!db.isOpen()) {
    await db.open();
  }
  // 无论数据库是否已打开，都确保默认单词集存在
  await ensureDefaultWordSetExists();
  return db;
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
