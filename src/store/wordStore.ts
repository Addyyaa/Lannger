import dataVerify from "../utils/dataVerify";
import {
  db,
  WordSet,
  Word,
  resetDB,
  ensureDBOpen,
  DEFAULT_WORD_TYPE,
  getOrCreateDefaultWordSet,
  DEFAULT_WORD_SET_ID,
  DEFAULT_WORD_SET_NAME,
  FlashcardSessionState,
  UserSettings,
  DailyStat,
} from "../db";

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
  try {
    // 确保数据库打开且默认单词集存在
    await ensureDBOpen();
    
    // 验证数据库是否真的打开
    if (!db.isOpen()) {
      console.warn("数据库未打开，尝试重新打开...");
      await db.open();
    }
    
    // 获取单词集
    const result = await db.wordSets.toArray();
    
    // 确保返回的是数组
    if (!Array.isArray(result)) {
      console.error(
        "getAllWordSets: db.wordSets.toArray() 返回了非数组值:",
        result,
        typeof result
      );
      return [];
    }
    
    // 验证数据有效性
    const validWordSets = result.filter(
      (set): set is WordSet =>
        set !== null &&
        set !== undefined &&
        typeof set === "object" &&
        typeof set.id === "number" &&
        typeof set.name === "string"
    );
    
    // 如果有效数据为空但原始数据不为空，记录警告
    if (validWordSets.length === 0 && result.length > 0) {
      console.warn(
        "getAllWordSets: 所有单词集数据无效",
        result
      );
    }
    
    return validWordSets.length > 0 ? validWordSets : result as WordSet[];
  } catch (error) {
    console.error("获取单词集失败:", error);
    // 如果是数据库未打开的错误，尝试重新打开
    if (error instanceof Error && error.message.includes("not open")) {
      try {
        await db.open();
        // 重试一次
        const retryResult = await db.wordSets.toArray();
        if (Array.isArray(retryResult)) {
          return retryResult as WordSet[];
        }
      } catch (retryError) {
        console.error("重试获取单词集失败:", retryError);
      }
    }
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

export async function ensureUserSettingsRecord(): Promise<UserSettings> {
  await ensureDBOpen();
  const now = new Date().toISOString();
  let settings = await db.userSettings.get(1);
  if (!settings) {
    settings = {
      id: 1,
      currentMode: "flashcard",
      dailyGoal: 20,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.userSettings.put(settings);
  }
  return settings as UserSettings;
}

export async function saveFlashcardSessionState(
  state: Omit<FlashcardSessionState, "savedAt"> & { savedAt?: string }
): Promise<void> {
  await ensureDBOpen();
  const now = new Date().toISOString();
  const settings = await ensureUserSettingsRecord();
  const payload: FlashcardSessionState = {
    ...state,
    savedAt: state.savedAt ?? now,
  };

  await db.userSettings.put({
    ...settings,
    flashcardSessionState: payload,
    updatedAt: now,
  });
}

/**
 * 获取闪卡会话状态
 * 会话状态记录了闪卡会话的进度，包括当前单词索引，单词ID列表，会话统计等信息
 * @returns 闪卡会话状态
 */
export async function getFlashcardSessionState(): Promise<FlashcardSessionState | null> {
  await ensureDBOpen();
  const settings = await db.userSettings.get(1);
  if (!settings || !settings.flashcardSessionState) {
    return null;
  }

  const state = settings.flashcardSessionState;
  if (!Array.isArray(state.wordIds) || state.wordIds.length === 0) {
    return null;
  }
  console.log("getFlashcardSessionState", state);

  return state;
}

export async function clearFlashcardSessionState(): Promise<void> {
  await ensureDBOpen();
  const settings = await db.userSettings.get(1);
  if (!settings || !settings.flashcardSessionState) {
    return;
  }

  const now = new Date().toISOString();
  const updatedSettings = {
    ...settings,
    flashcardSessionState: null,
    updatedAt: now,
  };

  await db.userSettings.put(updatedSettings);
}

export async function getUserSettings(): Promise<UserSettings> {
  return ensureUserSettingsRecord();
}

export async function updateDailyGoal(goal: number): Promise<UserSettings> {
  const clampedGoal = Math.max(1, Math.round(goal));
  const now = new Date().toISOString();
  const settings = await ensureUserSettingsRecord();
  const updatedSettings: UserSettings = {
    ...settings,
    dailyGoal: clampedGoal,
    updatedAt: now,
  };
  await db.userSettings.put(updatedSettings);

  const today = new Date().toISOString().split("T")[0];
  const existingDailyStat = await db.dailyStats.get(today);
  if (existingDailyStat) {
    const updatedDailyStat: DailyStat = {
      ...existingDailyStat,
      goal: clampedGoal,
      updatedAt: now,
    };
    await db.dailyStats.put(updatedDailyStat);
  } else {
    const newDailyStat: DailyStat = {
      date: today,
      learnedCount: 0,
      reviewedCount: 0,
      testedCount: 0,
      correctCount: 0,
      goal: clampedGoal,
      updatedAt: now,
    };
    await db.dailyStats.put(newDailyStat);
  }

  return updatedSettings;
}

export async function resetWordProgress(wordSetId?: number): Promise<number> {
  await ensureDBOpen();

  const targetWords: Word[] =
    wordSetId !== undefined
      ? await db.words.where("setId").equals(wordSetId).toArray()
      : await db.words.toArray();

  if (!Array.isArray(targetWords) || targetWords.length === 0) {
    return 0;
  }

  let resetCount = 0;
  await db.transaction("rw", db.wordProgress, db.words, async () => {
    for (const word of targetWords) {
      if (!word || typeof word.id !== "number") continue;

      const now = new Date().toISOString();
      const existingProgress = await db.wordProgress.get(word.id);

      const baseProgress = existingProgress ?? {
        wordId: word.id,
        setId:
          typeof word.setId === "number" ? word.setId : DEFAULT_WORD_SET_ID,
        createdAt: now,
      };

      await db.wordProgress.put({
        ...baseProgress,
        wordId: word.id,
        setId:
          typeof word.setId === "number" ? word.setId : DEFAULT_WORD_SET_ID,
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        difficulty: word.review?.difficulty,
        timesSeen: 0,
        timesCorrect: 0,
        correctStreak: 0,
        wrongStreak: 0,
        lastResult: undefined,
        lastMode: undefined,
        lastReviewedAt: undefined,
        nextReviewAt: undefined,
        averageResponseTime: undefined,
        lastResponseTime: undefined,
        fastResponseCount: 0,
        slowResponseCount: 0,
        updatedAt: now,
      });

      resetCount += 1;
    }
  });

  return resetCount;
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
  };
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
      return await restoreFromBackupFormat(
        wordSets as WordSet[],
        words as Word[]
      );
    }

    if (words) {
      return await restoreFromWordList(words);
    }
  }

  console.error("restoreDatabase: 不支持的数据格式", payload);
  throw new Error(
    "恢复数据失败：文件格式不正确，请使用合法的备份文件或通过“导入单词”功能导入。"
  );
}

async function restoreFromBackupFormat(
  wordSets: WordSet[],
  words: Word[]
): Promise<boolean> {
  if (!Array.isArray(wordSets) || !Array.isArray(words)) {
    console.error("restoreFromBackupFormat: 输入数据不是数组", wordSets, words);
    return false;
  }

  // 重新初始化数据库，确保数据干净
  await resetDB();
  await ensureDBOpen();

  const parseNumericId = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  };

  const wordSetIdMap = new Map<number, number>();
  wordSetIdMap.set(DEFAULT_WORD_SET_ID, DEFAULT_WORD_SET_ID);

  const wordSetsWithId: WordSet[] = [];
  const wordSetsWithoutId: Array<{ data: WordSet; originalId?: number }> = [];

  for (const rawSet of wordSets) {
    const cloned = { ...rawSet } as Partial<WordSet>;
    const originalId = parseNumericId((rawSet as any)?.id);

    if (typeof cloned.name !== "string" || cloned.name.trim() === "") {
      cloned.name = generateFallbackWordSetName();
    } else {
      cloned.name = cloned.name.trim();
    }

    if (typeof cloned.mark !== "string") {
      cloned.mark = cloned.mark ? String(cloned.mark) : "";
    }

    cloned.createdAt = cloned.createdAt ?? new Date().toISOString();
    cloned.updatedAt = cloned.updatedAt ?? new Date().toISOString();

    if (originalId !== undefined) {
      cloned.id = originalId;
      wordSetIdMap.set(originalId, originalId);
      wordSetsWithId.push(cloned as WordSet);
    } else {
      delete (cloned as any).id;
      wordSetsWithoutId.push({ data: cloned as WordSet });
    }
  }

  if (wordSetsWithId.length > 0) {
    await db.wordSets.bulkPut(wordSetsWithId as WordSet[]);
  }

  if (wordSetsWithoutId.length > 0) {
    for (const item of wordSetsWithoutId) {
      const newId = await db.wordSets.add(item.data as WordSet);
      if (item.originalId !== undefined) {
        wordSetIdMap.set(item.originalId, newId);
      }
    }
  }

  // 确保映射包含当前数据库中的所有词集 ID
  const existingWordSets = await db.wordSets.toArray();
  for (const set of existingWordSets) {
    if (typeof set.id === "number" && !wordSetIdMap.has(set.id)) {
      wordSetIdMap.set(set.id, set.id);
    }
  }

  const sanitizedWords = words.map((word) => {
    const cloned = { ...word } as Partial<Word>;

    const originalWordId = parseNumericId((word as any)?.id);
    if (originalWordId !== undefined) {
      cloned.id = originalWordId;
    } else {
      delete (cloned as any).id;
    }

    const originalSetId = parseNumericId((word as any)?.setId);
    if (originalSetId !== undefined) {
      cloned.setId =
        wordSetIdMap.get(originalSetId) ?? originalSetId ?? DEFAULT_WORD_SET_ID;
    } else {
      cloned.setId = DEFAULT_WORD_SET_ID;
    }

    cloned.kana = typeof cloned.kana === "string" ? cloned.kana : "";
    cloned.kanji = typeof cloned.kanji === "string" ? cloned.kanji : "";
    cloned.meaning = typeof cloned.meaning === "string" ? cloned.meaning : "";
    cloned.example = typeof cloned.example === "string" ? cloned.example : "";
    cloned.mark = typeof cloned.mark === "string" ? cloned.mark : "";
    cloned.type =
      typeof cloned.type === "string" && cloned.type.trim() !== ""
        ? cloned.type
        : DEFAULT_WORD_TYPE;

    if (cloned.review && typeof cloned.review === "object") {
      const review = cloned.review as Word["review"];
      cloned.review = {
        times: typeof review?.times === "number" ? review.times : 0,
        nextReview:
          typeof review?.nextReview === "string"
            ? review.nextReview
            : undefined,
        difficulty:
          typeof review?.difficulty === "number"
            ? review.difficulty
            : undefined,
      };
    } else {
      cloned.review = undefined;
    }

    cloned.createdAt = cloned.createdAt ?? new Date().toISOString();
    cloned.updatedAt = cloned.updatedAt ?? new Date().toISOString();

    return cloned as Word;
  });

  if (sanitizedWords.length > 0) {
    await db.words.bulkPut(sanitizedWords as Word[]);
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
        console.warn(
          "restoreFromWordList: 缺少必填字段",
          missingFields,
          wordData
        );
        continue;
      }

      let setId = DEFAULT_WORD_SET_ID;
      if (
        typeof wordData.wordSet === "string" &&
        wordData.wordSet.trim() !== ""
      ) {
        const setName = wordData.wordSet.trim();
        if (!wordSetMap.has(setName)) {
          try {
            const newSetId = await createWordSet({ name: setName, mark: "" });
            wordSetMap.set(setName, newSetId);
          } catch (error) {
            console.error(
              "restoreFromWordList: 创建单词集失败",
              setName,
              error
            );
            continue;
          }
        }
        setId = wordSetMap.get(setName) ?? DEFAULT_WORD_SET_ID;
      }

      const difficultyRaw =
        wordData.difficultyCoefficient ??
        (wordData.review as any)?.difficulty ??
        5;
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
        type:
          typeof wordData.type === "string"
            ? String(wordData.type)
            : DEFAULT_WORD_TYPE,
        review: {
          times:
            typeof (wordData.review as any)?.times === "number"
              ? (wordData.review as any).times
              : 0,
          difficulty,
        },
      });
    } catch (error) {
      console.error("restoreFromWordList: 导入单词失败", raw, error);
    }
  }

  return true;
}
