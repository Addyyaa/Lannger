import dataVerify from "../utils/dataVerify";
import { db, WordSet, Word, resetDB, ensureDBOpen, DEFAULT_WORD_TYPE, getOrCreateDefaultWordSet, DEFAULT_WORD_SET_ID, DEFAULT_WORD_SET_NAME } from "../db";

/**
 * 生成导入时的临时词集名称，避免硬编码常量
 */
function generateFallbackWordSetName(): string {
  return `imported_word_set_${Date.now()}`;
}

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

export async function getAllWordSets(): Promise<WordSet[]> {
  await ensureDBOpen(); // 确保数据库打开且默认单词集存在
  try {
    const result = await db.wordSets.toArray();
    // 确保返回的是数组
    if (Array.isArray(result)) {
      return result as WordSet[];
    } else {
      console.error("getAllWordSets: db.wordSets.toArray() 返回了非数组值:", result, typeof result);
      return [];
    }
  } catch (error) {
    console.error("获取单词集失败:", error);
    return [];
  }
}

export async function getAllWords() {
  await ensureDBOpen();
  try {
    const result = await db.words.toArray();
    // 确保返回的是数组
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("获取单词列表失败:", error);
    return [];
  }
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
export async function restoreDatabase(payload: unknown) {
  await ensureDBOpen();

  // 场景一：直接提供单词数组（与导入功能相同的数据结构）
  if (Array.isArray(payload)) {
    return await restoreFromWordList(payload);
  }

  // 场景二：对象中包含 words / wordSets
  if (payload && typeof payload === "object") {
    const data = payload as { wordSets?: unknown; words?: unknown };

    const wordSets = Array.isArray(data.wordSets) ? data.wordSets : undefined;
    const words = Array.isArray(data.words) ? data.words : undefined;

    if (wordSets && words) {
      return await restoreFromBackupFormat(wordSets as WordSet[], words as Word[]);
    }

    if (words) {
      return await restoreFromWordList(words);
    }
  }

  console.error("restoreDatabase: 不支持的数据格式", payload);
  throw new Error("恢复数据失败：文件格式不正确，请使用合法的备份文件或通过“导入单词”功能导入。");
}

async function restoreFromBackupFormat(wordSets: WordSet[], words: Word[]): Promise<boolean> {
  if (!Array.isArray(wordSets) || !Array.isArray(words)) {
    console.error("restoreFromBackupFormat: 输入数据不是数组", wordSets, words);
    return false;
  }

  // 重新初始化数据库，确保数据干净
  await resetDB();
  await ensureDBOpen();

  const sanitizedWordSets = wordSets.map((set) => {
    const cloned = { ...set } as any;
    delete cloned.id;
    if (typeof cloned.name !== "string" || cloned.name.trim() === "") {
      cloned.name = generateFallbackWordSetName();
    }
    cloned.createdAt = cloned.createdAt ?? new Date().toISOString();
    cloned.updatedAt = cloned.updatedAt ?? new Date().toISOString();
    return cloned;
  });

  if (sanitizedWordSets.length > 0) {
    await db.wordSets.bulkPut(sanitizedWordSets as any);
  } else {
    await getOrCreateDefaultWordSet();
  }

  const sanitizedWords = words.map((word) => {
    const cloned = { ...word } as any;
    delete cloned.id;
    if (typeof cloned.setId !== "number") {
      cloned.setId = DEFAULT_WORD_SET_ID;
    }
    cloned.createdAt = cloned.createdAt ?? new Date().toISOString();
    cloned.updatedAt = cloned.updatedAt ?? new Date().toISOString();
    return cloned;
  });

  if (sanitizedWords.length > 0) {
    await db.words.bulkPut(sanitizedWords as any);
  }

  return true;
}

async function restoreFromWordList(words: unknown[]): Promise<boolean> {
  if (!Array.isArray(words) || words.length === 0) {
    console.error("restoreFromWordList: 输入为空或不是数组", words);
    return false;
  }

  // 清空数据库并重新初始化默认单词集
  await resetDB();
  await ensureDBOpen();

  const wordSetMap = new Map<string, number>();
  wordSetMap.set(DEFAULT_WORD_SET_NAME, DEFAULT_WORD_SET_ID);

  const existingSets = await db.wordSets.toArray();
  existingSets.forEach((set) => {
    wordSetMap.set(set.name, set.id);
  });

  for (const raw of words) {
    try {
      if (!raw || typeof raw !== "object") {
        console.warn("restoreFromWordList: 跳过无效项", raw);
        continue;
      }

      const wordData = raw as Record<string, unknown>;
      const requiredFields = ["kana", "kanji", "meaning", "example"];
      const missingFields = requiredFields.filter((field) => {
        const value = wordData[field];
        return typeof value !== "string" || value.trim() === "";
      });

      if (missingFields.length > 0) {
        console.warn("restoreFromWordList: 缺少必填字段", missingFields, wordData);
        continue;
      }

      let setId = DEFAULT_WORD_SET_ID;
      if (typeof wordData.wordSet === "string" && wordData.wordSet.trim() !== "") {
        const setName = wordData.wordSet.trim();
        if (!wordSetMap.has(setName)) {
          try {
            const newSetId = await createWordSet({ name: setName, mark: "" });
            wordSetMap.set(setName, newSetId);
          } catch (error) {
            console.error("restoreFromWordList: 创建单词集失败", setName, error);
            continue;
          }
        }
        setId = wordSetMap.get(setName) ?? DEFAULT_WORD_SET_ID;
      }

      const difficultyRaw = wordData.difficultyCoefficient ?? (wordData.review as any)?.difficulty ?? 5;
      let difficulty = parseInt(String(difficultyRaw), 10);
      if (Number.isNaN(difficulty)) {
        difficulty = 5;
      }
      difficulty = Math.min(Math.max(difficulty, 1), 5);

      await createWord({
        kana: String(wordData.kana),
        kanji: String(wordData.kanji),
        meaning: String(wordData.meaning),
        example: String(wordData.example),
        mark: wordData.mark ? String(wordData.mark) : "",
        setId,
        type: typeof wordData.type === "string" ? String(wordData.type) : DEFAULT_WORD_TYPE,
        review: {
          times: typeof (wordData.review as any)?.times === "number" ? (wordData.review as any).times : 0,
          difficulty,
        },
      });
    } catch (error) {
      console.error("restoreFromWordList: 导入单词失败", raw, error);
    }
  }

  return true;
}