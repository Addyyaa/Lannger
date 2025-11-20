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
      console.warn("getAllWordSets: 所有单词集数据无效", result);
    }

    return validWordSets.length > 0 ? validWordSets : (result as WordSet[]);
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
/**
 * 检测字符串是否包含日文假名（平假名或片假名）
 */
function containsKana(str: string): boolean {
  // 平假名范围：\u3040-\u309F
  // 片假名范围：\u30A0-\u30FF
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(str);
}

/**
 * 检测字符串是否包含汉字（中日韩统一表意文字）
 */
function containsKanji(str: string): boolean {
  // CJK 统一表意文字范围：\u4E00-\u9FAF
  return /[\u4E00-\u9FAF]/.test(str);
}

/**
 * 模糊搜索单词（性能优化版本）
 *
 * 优化策略：
 * 1. 限制返回结果数量（默认 50 个）
 * 2. 支持按单词集搜索（如果指定 wordSetId）
 * 3. 利用复合索引 [setId+kana] 进行高效前缀匹配
 * 4. 根据查询词特征智能选择查询策略
 * 5. 并行查询多个字段，合并去重
 *
 * @param query 搜索关键词
 * @param wordSetId 可选的单词集ID，如果指定则只在该单词集内搜索
 * @param limit 返回结果的最大数量，默认 50
 * @returns 匹配的单词列表
 */
export async function fuzzySearchWords(
  query: string,
  wordSetId?: number,
  limit: number = 50
): Promise<Word[]> {
  await ensureDBOpen();

  if (!query || query.trim() === "") {
    return [];
  }

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const resultsMap = new Map<number, Word>(); // 使用 Map 去重

  // 如果指定了单词集，使用优化查询策略
  if (wordSetId !== undefined) {
    const queries: Promise<Word[]>[] = [];

    // 策略1：如果查询词包含假名，优先使用复合索引 [setId+kana] 进行前缀匹配
    if (containsKana(trimmedQuery)) {
      queries.push(
        db.words
          .where("[setId+kana]")
          .between(
            [wordSetId, trimmedQuery],
            [wordSetId, trimmedQuery + "\uffff"]
          )
          .limit(limit)
          .toArray()
      );
    }

    // 策略2：如果查询词包含汉字，优先查询 kanji 字段（使用索引）
    if (containsKanji(trimmedQuery)) {
      queries.push(
        db.words
          .where("setId")
          .equals(wordSetId)
          .filter((word) => word.kanji?.includes(trimmedQuery) ?? false)
          .limit(limit)
          .toArray()
      );
    }

    // 策略3：通用模糊搜索（kana、kanji、meaning 全字段匹配）
    // 如果前两个策略都没有，或者需要补充结果，执行全字段搜索
    queries.push(
      db.words
        .where("setId")
        .equals(wordSetId)
        .filter(
          (word) =>
            word.kana.toLowerCase().includes(lowerQuery) ||
            word.kanji?.toLowerCase().includes(lowerQuery) ||
            word.meaning.toLowerCase().includes(lowerQuery)
        )
        .limit(limit)
        .toArray()
    );

    // 并行执行所有查询策略
    const queryResults = await Promise.all(queries);

    // 合并结果并去重（按 id），同时确保只包含指定单词集的单词
    for (const words of queryResults) {
      for (const word of words) {
        // 双重验证：确保单词属于指定单词集（防御性编程）
        if (
          word.id !== undefined &&
          word.setId === wordSetId &&
          !resultsMap.has(word.id)
        ) {
          resultsMap.set(word.id, word);
          // 如果已达到限制，提前终止
          if (resultsMap.size >= limit) {
            break;
          }
        }
      }
      if (resultsMap.size >= limit) {
        break;
      }
    }
  } else {
    // 全表搜索，但限制结果数量（性能优化）
    const words = await db.words
      .filter(
        (word) =>
          word.kana.toLowerCase().includes(lowerQuery) ||
          word.kanji?.toLowerCase().includes(lowerQuery) ||
          word.meaning.toLowerCase().includes(lowerQuery)
      )
      .limit(limit)
      .toArray();
    words.forEach((word) => {
      if (word.id !== undefined) {
        resultsMap.set(word.id, word);
      }
    });
  }

  return Array.from(resultsMap.values()).slice(0, limit);
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

/**
 * 保存闪卡会话状态（兼容层）
 * v6 优化：内部使用新的 sessionStore API，不再更新 userSettings
 */
export async function saveFlashcardSessionState(
  state: Omit<FlashcardSessionState, "savedAt"> & { savedAt?: string }
): Promise<void> {
  // 导入 sessionStore（避免循环依赖）
  const { saveFlashcardSession } = await import("./sessionStore");

  // 转换为新表结构
  const session: Omit<
    import("../db").FlashcardSession,
    "id" | "userId" | "createdAt" | "updatedAt"
  > = {
    wordSetId: state.wordSetId,
    wordIds: state.wordIds,
    currentIndex: state.currentIndex,
    sessionStats: state.sessionStats,
    showAnswer: state.showAnswer,
    currentWordId: state.currentWordId,
    savedAt: state.savedAt || new Date().toISOString(),
  };

  await saveFlashcardSession(session);
}

/**
 * 获取闪卡会话状态（兼容层）
 * v6 优化：内部使用新的 sessionStore API，不再从 userSettings 读取
 * 会话状态记录了闪卡会话的进度，包括当前单词索引，单词ID列表，会话统计等信息
 * @returns 闪卡会话状态
 */
export async function getFlashcardSessionState(): Promise<FlashcardSessionState | null> {
  // 导入 sessionStore（避免循环依赖）
  const { getFlashcardSession } = await import("./sessionStore");

  const session = await getFlashcardSession();
  if (!session) {
    return null;
  }

  // 转换为旧接口格式
  const state: FlashcardSessionState = {
    wordSetId: session.wordSetId,
    wordIds: session.wordIds,
    currentIndex: session.currentIndex,
    sessionStats: session.sessionStats,
    showAnswer: session.showAnswer,
    currentWordId: session.currentWordId,
    savedAt: session.savedAt,
  };

  if (!Array.isArray(state.wordIds) || state.wordIds.length === 0) {
    return null;
  }

  console.log("getFlashcardSessionState", state);
  return state;
}

/**
 * 清除闪卡会话状态（兼容层）
 * v6 优化：内部使用新的 sessionStore API，不再更新 userSettings
 */
export async function clearFlashcardSessionState(): Promise<void> {
  // 导入 sessionStore（避免循环依赖）
  const { clearFlashcardSession } = await import("./sessionStore");
  await clearFlashcardSession();
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

/**
 * 删除单词集（带级联删除和数据迁移）
 *
 * 删除单词集时：
 * 1. 将该词集下的单词移动到默认单词集
 * 2. 更新 wordProgress.setId（保持数据一致性）
 * 3. 删除对应的 reviewPlans 记录
 *
 * @param id 单词集ID
 * @returns 是否删除成功
 */
export async function deleteWordSet(id: number): Promise<boolean> {
  await ensureDBOpen();
  // 不允许删除默认单词集（ID 为 0）
  if (id === DEFAULT_WORD_SET_ID) {
    const error = new Error("Cannot delete the default word set");
    console.error("删除单词集失败:", error);
    throw error;
  }

  try {
    // 使用事务确保数据一致性
    await db.transaction(
      "rw",
      db.wordSets,
      db.words,
      db.wordProgress,
      db.reviewPlans,
      async () => {
        // 1. 将该词集下的单词移动到默认单词集
        const words = await db.words.where("setId").equals(id).toArray();
        const wordIds = words.map((word) => word.id);

        // 批量更新单词的 setId
        if (words.length > 0) {
          const updatedWords = words.map((word) => ({
            ...word,
            setId: DEFAULT_WORD_SET_ID,
            updatedAt: new Date().toISOString(),
          }));
          await db.words.bulkPut(updatedWords);
        }

        // 2. 更新 wordProgress.setId（保持冗余字段一致性）
        if (wordIds.length > 0) {
          const progresses = await db.wordProgress
            .where("wordId")
            .anyOf(wordIds)
            .toArray();

          if (progresses.length > 0) {
            const updatedProgresses = progresses.map((progress) => ({
              ...progress,
              setId: DEFAULT_WORD_SET_ID,
              updatedAt: new Date().toISOString(),
            }));
            await db.wordProgress.bulkPut(updatedProgresses);
          }
        }

        // 3. 删除对应的 reviewPlans 记录（级联删除）
        await db.reviewPlans.where("wordSetId").equals(id).delete();

        // 4. 删除单词集
        await db.wordSets.delete(id);
      }
    );

    return true;
  } catch (error) {
    console.error("删除单词集失败:", error);
    throw error; // 重新抛出错误，而不是返回 false
  }
}

/**
 * 删除单词（带级联删除）
 *
 * 删除单词时，同时删除：
 * 1. wordProgress 记录
 * 2. reviewLogs 记录
 *
 * @param id 单词ID
 * @returns 是否删除成功
 */
export async function deleteWord(id: number): Promise<boolean> {
  try {
    await ensureDBOpen();

    // 使用事务确保数据一致性
    await db.transaction(
      "rw",
      db.words,
      db.wordProgress,
      db.reviewLogs,
      async () => {
        // 删除单词进度记录
        await db.wordProgress.delete(id);

        // 删除复习日志记录（批量删除）
        const logs = await db.reviewLogs.where("wordId").equals(id).toArray();
        if (logs.length > 0) {
          const logIds = logs
            .map((log) => log.id)
            .filter((id): id is number => id !== undefined);
          if (logIds.length > 0) {
            await db.reviewLogs.bulkDelete(logIds);
          }
        }

        // 删除单词
        await db.words.delete(id);
      }
    );

    return true;
  } catch (error) {
    console.error("删除单词失败:", error);
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
  await ensureDBOpen();

  // 获取所有单词集，但排除默认单词集
  const allWordSets = await db.wordSets.toArray();
  const wordSets = allWordSets.filter(
    (set) =>
      set.id !== DEFAULT_WORD_SET_ID && set.name !== DEFAULT_WORD_SET_NAME
  );

  // 获取所有单词
  const allWords = await db.words.toArray();

  // 处理单词：对于属于默认单词集的单词，添加 wordSet 字段以便恢复时映射
  const words = allWords.map((word) => {
    if (word.setId === DEFAULT_WORD_SET_ID) {
      // 属于默认单词集的单词，添加 wordSet 字段，移除 setId（恢复时会通过名称映射）
      const { setId, ...wordWithoutSetId } = word;
      return {
        ...wordWithoutSetId,
        wordSet: DEFAULT_WORD_SET_NAME,
      };
    }
    // 不属于默认单词集的单词，保持原样（但需要找到对应的单词集名称）
    const wordSet = allWordSets.find((set) => set.id === word.setId);
    if (wordSet) {
      const { setId, ...wordWithoutSetId } = word;
      return {
        ...wordWithoutSetId,
        wordSet: wordSet.name,
      };
    }
    // 如果找不到对应的单词集，也添加 wordSet 字段（使用默认名称）
    const { setId, ...wordWithoutSetId } = word;
    return {
      ...wordWithoutSetId,
      wordSet: DEFAULT_WORD_SET_NAME,
    };
  });

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

  // 不重置数据库，保留已有数据
  await ensureDBOpen();

  // 用于映射文件中的单词集名称到数据库中的 ID
  const wordSetNameMap = new Map<string, number>();
  // 用于映射文件中的旧单词集 ID 到数据库中的新 ID
  const wordSetIdMap = new Map<number, number>();
  wordSetNameMap.set(DEFAULT_WORD_SET_NAME, DEFAULT_WORD_SET_ID);
  wordSetIdMap.set(DEFAULT_WORD_SET_ID, DEFAULT_WORD_SET_ID);

  // 获取所有现有的单词集，建立名称到 ID 的映射
  const existingWordSets = await db.wordSets.toArray();
  for (const set of existingWordSets) {
    if (typeof set.name === "string" && typeof set.id === "number") {
      wordSetNameMap.set(set.name, set.id);
      wordSetIdMap.set(set.id, set.id);
    }
  }

  // 处理单词集：不使用文件中的 id，使用数据库自增 id
  for (const rawSet of wordSets) {
    const cloned = { ...rawSet } as Partial<WordSet>;
    const originalId =
      typeof (rawSet as any)?.id === "number" ? (rawSet as any).id : undefined;

    // 移除文件中的 id，让数据库自动分配
    delete (cloned as any).id;

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

    // 检查是否已存在同名单词集
    if (wordSetNameMap.has(cloned.name)) {
      // 如果已存在，使用现有的 ID
      const existingId = wordSetNameMap.get(cloned.name)!;
      if (originalId !== undefined) {
        wordSetIdMap.set(originalId, existingId);
      }
    } else {
      // 如果不存在，创建新的单词集（使用数据库自增 id）
      try {
        const newId = await db.wordSets.add(cloned as WordSet);
        wordSetNameMap.set(cloned.name, newId);
        if (originalId !== undefined) {
          wordSetIdMap.set(originalId, newId);
        }
      } catch (error) {
        console.error(
          "restoreFromBackupFormat: 创建单词集失败",
          cloned.name,
          error
        );
        // 如果创建失败，跳过该单词集
        continue;
      }
    }
  }

  // 处理单词：不使用文件中的 id，使用数据库自增 id
  for (const rawWord of words) {
    try {
      const cloned = { ...rawWord } as Partial<Word>;

      // 移除文件中的 id，让数据库自动分配
      delete (cloned as any).id;

      // 处理单词集 ID 映射
      let setId = DEFAULT_WORD_SET_ID;
      const originalSetId =
        typeof cloned.setId === "number" ? cloned.setId : undefined;

      // 优先通过单词集名称查找（如果文件中有 wordSetName 或 wordSet 字段）
      const wordSetName =
        (rawWord as any)?.wordSetName || (rawWord as any)?.wordSet;

      if (typeof wordSetName === "string" && wordSetName.trim() !== "") {
        const setName = wordSetName.trim();
        if (wordSetNameMap.has(setName)) {
          setId = wordSetNameMap.get(setName)!;
        } else {
          // 如果单词集不存在，创建它
          try {
            const newSetId = await createWordSet({ name: setName, mark: "" });
            wordSetNameMap.set(setName, newSetId);
            wordSetIdMap.set(newSetId, newSetId);
            setId = newSetId;
          } catch (error) {
            console.error(
              "restoreFromBackupFormat: 创建单词集失败",
              setName,
              error
            );
            setId = DEFAULT_WORD_SET_ID;
          }
        }
      } else if (originalSetId !== undefined) {
        // 如果没有名称，通过旧的 ID 映射
        if (wordSetIdMap.has(originalSetId)) {
          setId = wordSetIdMap.get(originalSetId)!;
        } else {
          // 如果找不到映射，使用默认单词集
          setId = DEFAULT_WORD_SET_ID;
        }
      }

      cloned.setId = setId;

      // 验证必填字段
      cloned.kana = typeof cloned.kana === "string" ? cloned.kana : "";
      cloned.kanji = typeof cloned.kanji === "string" ? cloned.kanji : "";
      cloned.meaning = typeof cloned.meaning === "string" ? cloned.meaning : "";
      cloned.example = typeof cloned.example === "string" ? cloned.example : "";

      if (
        cloned.kana.trim() === "" ||
        cloned.kanji.trim() === "" ||
        cloned.meaning.trim() === "" ||
        cloned.example.trim() === ""
      ) {
        console.warn("restoreFromBackupFormat: 跳过缺少必填字段的单词", cloned);
        continue;
      }

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

      // 使用 add 方法添加新单词（使用数据库自增 id），不覆盖已有数据
      await db.words.add(cloned as Word);
    } catch (error) {
      console.error("restoreFromBackupFormat: 导入单词失败", rawWord, error);
      // 继续处理下一个单词
    }
  }

  return true;
}

async function restoreFromWordList(words: unknown[]): Promise<boolean> {
  if (!Array.isArray(words) || words.length === 0) {
    console.error("restoreFromWordList: 输入为空或不是数组", words);
    return false;
  }

  // 不重置数据库，保留已有数据
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
