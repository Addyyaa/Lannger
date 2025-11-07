import dataVerify from "../utils/dataVerify";
import { db, WordSet, Word, resetDB, ensureDBOpen, DEFAULT_WORD_TYPE, getOrCreateDefaultWordSet, DEFAULT_WORD_SET_ID } from "../db";

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
 * @param setId 可选，未设置时使用默认单词集
 * @param kana 必填
 * @param meaning 必填
 * @param type 可选，未设置时使用默认类型
 * @param example 可选
 * @param review 可选
 * @param mark 可选
 * @returns
 */
export async function createWord(
  word: Omit<Word, "id" | "createdAt" | "updatedAt">
) {
  await ensureDBOpen();

  // 如果没有设置 setId，使用默认单词集
  let finalSetId = word.setId;
  if (finalSetId === undefined || finalSetId === null) {
    finalSetId = await getOrCreateDefaultWordSet();
  }

  // 如果没有设置 type，使用默认类型
  const finalType = word.type ?? DEFAULT_WORD_TYPE;

  const newWord = {
    ...word,
    setId: finalSetId,
    type: finalType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return await db.words.add(newWord as Word);
}

export async function getAllWordSets() {
  await ensureDBOpen(); // 确保数据库打开且默认单词集存在
  return await db.wordSets.toArray();
}

export async function getAllWords() {
  await ensureDBOpen();
  return await db.words.toArray();
}

// 模糊查询
export async function fuzzySearchWordSets(query: string) {
  await ensureDBOpen();
  return await db.wordSets
    .filter((wordSet) => wordSet.name.includes(query))
    .toArray();
}
export async function fuzzySearchWords(query: string) {
  await ensureDBOpen();
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
  await ensureDBOpen();
  return db.wordSets.get(id);
}

export async function getWord(id: number) {
  await ensureDBOpen();
  return await db.words.get(id);
}

// 按照普通字段查询
export async function getWordSetByCommon(keyword: string) {
  await ensureDBOpen();
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
  await ensureDBOpen();
  return await db.words.where("setId").equals(wordSet).toArray();
}

/**
 *
 * @param setId // 使用复合索引查询
 * @param kanaPrefix // 查询前缀
 * @returns
 */
export async function getWordByIndex(setId: number, kanaPrefix: string) {
  await ensureDBOpen();
  return await db.words
    .where("[setId+kana]")
    .between([setId, kanaPrefix], [setId, kanaPrefix + "\uffff"])
    .toArray();
}

export async function updateWordSet(wordSet: WordSet) {
  await ensureDBOpen();
  wordSet.updatedAt = new Date().toISOString();
  return await db.wordSets.put(wordSet);
}

export async function updateWord(word: Word) {
  await ensureDBOpen();
  word.updatedAt = new Date().toISOString();
  return await db.words.put(word);
}

// 删除单词集
export async function deleteWordSet(id: number) {
  try {
    await ensureDBOpen();
    // 不允许删除默认单词集（ID 为 0）
    if (id === DEFAULT_WORD_SET_ID) {
      throw new Error("Cannot delete the default word set");
    }

    // 将该词集下的单词对应的setId设置为默认单词集ID
    const words = await db.words.where("setId").equals(id).toArray();
    for (const word of words) {
      word.setId = DEFAULT_WORD_SET_ID;
      await db.words.put(word);
    }
    return await db.wordSets.delete(id);
  } catch (error) {
    console.error(error);
    return false;
  }
}

// 删除单词
export async function deleteWord(id: number) {
  try {
    await ensureDBOpen();
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


// 备份数据库
export async function backupDatabase() {
  const wordSets = await db.wordSets.toArray();
  const words = await db.words.toArray();
  const langggerDB = {
    wordSets,
    words,
  }
  const langggerDBString = JSON.stringify(langggerDB, null, 2);
  const blob = new Blob([langggerDBString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "langggerDB.json";
  a.click();
  URL.revokeObjectURL(url);
}


// 恢复数据库
export async function restoreDatabase(langggerDB: { wordSets: WordSet[], words: Word[] }) {
  // 完成数据库导入功能。 注意需要先删除原先的id，防止已有id冲突
  const wordSets = langggerDB.wordSets;
  for (const wordSet of wordSets) {
    if ('id' in wordSet) {
      delete (wordSet as any).id;
    }
  }
  if (wordSets.length <= 0) { return false; }

  await db.wordSets.bulkPut(wordSets as WordSet[]);

  const words = langggerDB.words;
  for (const word of words) {
    if ('id' in word) {
      delete (word as any).id;
    }
  }
  if (words.length <= 0) { return false; }
  await db.words.bulkPut(words as Word[]);
  return true;
}