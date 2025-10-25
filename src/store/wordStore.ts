import dataVerify from "../utils/dataVerify";
import { db, WordSet, Word, resetDB, ensureDBOpen } from "../db";

/**
 * 创建单词集
 * @param name 必填
 * @param mark 可选
 * @returns
 */
export async function createWordSet(
  wordSet: Omit<WordSet, "id" | "createdAt" | "updatedAt">
) {
  await ensureDBOpen();
  const newWordSet = {
    ...wordSet,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return await db.wordSets.add(newWordSet as WordSet);
}

/**
 * 创建单词
 * @param kanji 可选
 * @param setId 可选
 * @param kana 必填
 * @param meaning 必填
 * @param type 可选
 * @param example 可选
 * @param review 可选
 * @param mark 可选
 * @returns
 */
export async function createWord(
  word: Omit<Word, "id" | "createdAt" | "updatedAt">
) {
  await ensureDBOpen();
  const newWord = {
    ...word,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return await db.words.add(newWord as Word);
}

export async function getAllWordSets() {
  return await db.wordSets.toArray();
}

export async function getAllWords() {
  return await db.words.toArray();
}

// 模糊查询
export async function fuzzySearchWordSets(query: string) {
  return await db.wordSets
    .filter((wordSet) => wordSet.name.includes(query))
    .toArray();
}
export async function fuzzySearchWords(query: string) {
  return await db.words
    .filter(
      (word) =>
        word.kana.includes(query) ||
        word.kanji?.includes(query) ||
        word.meaning.includes(query)
    )
    .toArray();
}

export async function getWordSet(id: number) {
  return db.wordSets.get(id);
}

export async function getWord(id: number) {
  return await db.words.get(id);
}

// 按照普通字段查询
export async function getWordSetByCommon(keyword: string) {
  const sets = await db.words.where("kana").startsWith(keyword).toArray();
  if (sets.length > 0) {
    return sets;
  }
  const wordsByKanji = await db.words
    .where("kanji")
    .startsWith(keyword)
    .toArray();
  if (wordsByKanji.length > 0) {
    return wordsByKanji;
  }
  const wordsBySetName = await db.wordSets
    .where("name")
    .startsWith(keyword)
    .toArray();
  if (wordsBySetName.length > 0) {
    return wordsBySetName;
  }
  const wordsByMeaning = await db.words
    .where("meaning")
    .startsWith(keyword)
    .toArray();
  if (wordsByMeaning.length > 0) {
    return wordsByMeaning;
  }
  return [];
}

// 按词组查询单词
export async function getWordsByWordSet(wordSet: number) {
  return await db.words.where("setId").equals(wordSet).toArray();
}

/**
 *
 * @param setId // 使用复合索引查询
 * @param kanaPrefix // 查询前缀
 * @returns
 */
export async function getWordByIndex(setId: number, kanaPrefix: string) {
  return await db.words
    .where("[setId+kana]")
    .between([setId, kanaPrefix], [setId, kanaPrefix + "\uffff"])
    .toArray();
}

export async function updateWordSet(wordSet: WordSet) {
  wordSet.updatedAt = new Date().toISOString();
  return await db.wordSets.put(wordSet);
}

export async function updateWord(word: Word) {
  word.updatedAt = new Date().toISOString();
  return await db.words.put(word);
}

// 删除单词集
export async function deleteWordSet(id: number) {
  try {
    return await db.wordSets.delete(id);
  } catch (error) {
    console.error(error);
    return false;
  }
}

// 删除单词
export async function deleteWord(id: number) {
  try {
    return await db.words.delete(id);
  } catch (error) {
    console.error(error);
    return false;
  }
}

// 按时间查询
export async function getWordSetsByTime(startTime: string, endTime: string) {
  if (!dataVerify(startTime) || !dataVerify(endTime)) {
    throw new Error("startTime and endTime must be valid dates");
  }
  return await db.wordSets
    .where("createdAt")
    .between(startTime, endTime)
    .toArray();
}
export async function getWordsByTime(startTime: string, endTime: string) {
  if (!dataVerify(startTime) || !dataVerify(endTime)) {
    throw new Error("startTime and endTime must be valid dates");
  }
  return await db.words
    .where("createdAt")
    .between(startTime, endTime)
    .toArray();
}

// 删除数据库
export async function deleteDatabase() {
  await resetDB();
}
