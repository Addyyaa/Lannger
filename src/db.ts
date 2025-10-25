import Dexie, { Table } from "dexie";

export interface Word {
  id: number;
  kanji?: string;
  setId?: number;
  createdAt?: string;
  updatedAt?: string;
  kana: string;
  meaning: string;
  type?: string;
  example?: string;
  review?: {
    times: number;
    nextReview?: string;
    difficulty?: number;
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
  }
}

export let db = new JpLearnDB();

export async function ensureDBOpen() {
  if (!db.isOpen()) {
    await db.open();
  }
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
