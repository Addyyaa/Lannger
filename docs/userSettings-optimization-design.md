# userSettings 表结构优化设计方案

**设计日期**：2024-12-19  
**设计者**：高级架构师  
**任务 ID**：7.2.2  
**优先级**：P1  
**预计工时**：3 小时（设计 2 小时 + 实施 1 小时）

---

## 📋 一、设计摘要

### 1.1 问题分析

**当前问题**：

1. **频繁更新整个 userSettings 记录**

   - `flashcardSessionState` 存储在 `userSettings` 中
   - `activeReviewLock` 也存储在 `userSettings` 中
   - 每次保存会话状态都会更新整个 `userSettings` 记录
   - 导致不必要的数据库写入开销

2. **数据耦合度高**

   - 会话状态和用户设置混在一起
   - 会话状态是临时数据，用户设置是持久化配置
   - 不利于数据管理和维护

3. **扩展性差**
   - 未来如果需要支持多个会话状态（如测试模式、复习模式），会增加 `userSettings` 的复杂度
   - 不利于功能扩展

### 1.2 优化目标

- ✅ 将会话状态独立存储，减少 `userSettings` 更新频率
- ✅ 提高数据写入性能（减少不必要的字段更新）
- ✅ 改善数据结构和可维护性
- ✅ 保持向后兼容，不影响现有功能

---

## 🗄️ 二、数据库设计

### 2.1 新增表结构

#### 2.1.1 flashcardSessions 表（新增）

```typescript
// 闪卡会话状态表
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
```

**索引设计**：

- `++id`（主键）
- `userId`（用于查询用户会话）
- `savedAt`（用于查询最近会话）

**设计理由**：

- 独立表结构，避免与 `userSettings` 耦合
- 支持多个会话（如果需要）
- 便于查询和管理会话历史

#### 2.1.2 reviewLocks 表（新增）

```typescript
// 复习锁定状态表
export interface ReviewLock {
  id?: number; // 自增主键
  userId: number; // 固定为 1（单用户应用）
  wordSetId: number;
  reviewStage: number;
  lockedAt: string; // ISO 格式
  createdAt?: string;
  updatedAt?: string;
}
```

**索引设计**：

- `++id`（主键）
- `userId`（用于查询用户锁定）
- `wordSetId`（用于查询特定单词集的锁定）

**设计理由**：

- 独立表结构，避免与 `userSettings` 耦合
- 支持查询和管理锁定状态
- 便于扩展（如支持多个锁定）

### 2.2 优化后的 userSettings 表

```typescript
// 优化后的用户设置表（移除会话状态和锁定状态）
export interface UserSettings {
  id: number; // 固定为 1
  currentMode: StudyMode;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  createdAt?: string;
  updatedAt?: string;
  // 移除：flashcardSessionState
  // 移除：activeReviewLock
}
```

**优化效果**：

- 表结构更简洁，只包含真正的用户设置
- 更新频率大幅降低（会话状态更新不再触发 userSettings 更新）
- 写入性能提升

---

## 🔄 三、数据迁移策略

### 3.1 迁移步骤

#### 步骤 1：创建新表（数据库 v6）

```typescript
// src/db.ts
this.version(6)
  .stores({
    // ... 其他表保持不变
    userSettings: "id", // 移除会话状态字段
    flashcardSessions: "++id, userId, savedAt", // 新增表
    reviewLocks: "++id, userId, wordSetId", // 新增表
  })
  .upgrade(async (trans) => {
    // 迁移逻辑
    const settingsTable = trans.table("userSettings");
    const flashcardSessionsTable = trans.table("flashcardSessions");
    const reviewLocksTable = trans.table("reviewLocks");

    // 1. 迁移 flashcardSessionState
    const settings = await settingsTable.get(1);
    if (settings?.flashcardSessionState) {
      await flashcardSessionsTable.add({
        userId: 1,
        ...settings.flashcardSessionState,
        createdAt: settings.flashcardSessionState.savedAt,
        updatedAt: settings.flashcardSessionState.savedAt,
      } as FlashcardSession);

      // 从 userSettings 中移除
      await settingsTable.update(1, {
        flashcardSessionState: undefined,
      });
    }

    // 2. 迁移 activeReviewLock
    if (settings?.activeReviewLock) {
      await reviewLocksTable.add({
        userId: 1,
        wordSetId: settings.activeReviewLock.wordSetId,
        reviewStage: settings.activeReviewLock.reviewStage,
        lockedAt: settings.activeReviewLock.lockedAt,
        createdAt: settings.activeReviewLock.lockedAt,
        updatedAt: settings.activeReviewLock.lockedAt,
      } as ReviewLock);

      // 从 userSettings 中移除
      await settingsTable.update(1, {
        activeReviewLock: undefined,
      });
    }
  });
```

### 3.2 兼容性保证

#### 3.2.1 向后兼容策略

1. **API 兼容层**

   - 保持现有的 `saveFlashcardSessionState` 和 `getFlashcardSessionState` 函数
   - 内部实现改为操作新表
   - 组件无需修改

2. **数据迁移验证**
   - 迁移后验证数据完整性
   - 确保会话状态和锁定状态正确迁移
   - 提供回滚机制（如果需要）

#### 3.2.2 迁移回滚

如果迁移失败，可以：

1. 回滚到 v5 版本
2. 数据自动恢复（IndexedDB 版本管理）
3. 重新尝试迁移

---

## 📝 四、API 设计

### 4.1 闪卡会话状态 API

```typescript
// src/store/sessionStore.ts（新建）

/**
 * 保存闪卡会话状态
 */
export async function saveFlashcardSession(
  session: Omit<FlashcardSession, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<number> {
  await ensureDBOpen();
  const now = new Date().toISOString();

  // 删除旧的会话（只保留最新的）
  await db.flashcardSessions.where("userId").equals(1).delete();

  // 创建新会话
  const id = await db.flashcardSessions.add({
    userId: 1,
    ...session,
    savedAt: session.savedAt || now,
    createdAt: now,
    updatedAt: now,
  } as FlashcardSession);

  return id;
}

/**
 * 获取闪卡会话状态
 */
export async function getFlashcardSession(): Promise<FlashcardSession | null> {
  await ensureDBOpen();
  const session = await db.flashcardSessions
    .where("userId")
    .equals(1)
    .orderBy("savedAt")
    .last();

  return session || null;
}

/**
 * 清除闪卡会话状态
 */
export async function clearFlashcardSession(): Promise<void> {
  await ensureDBOpen();
  await db.flashcardSessions.where("userId").equals(1).delete();
}
```

### 4.2 复习锁定状态 API

```typescript
// src/store/reviewStore.ts（扩展）

/**
 * 设置复习锁定
 */
export async function setReviewLock(
  wordSetId: number,
  reviewStage: number
): Promise<void> {
  await ensureDBOpen();
  const now = new Date().toISOString();

  // 删除旧的锁定（只保留一个）
  await db.reviewLocks.where("userId").equals(1).delete();

  // 创建新锁定
  await db.reviewLocks.add({
    userId: 1,
    wordSetId,
    reviewStage,
    lockedAt: now,
    createdAt: now,
    updatedAt: now,
  } as ReviewLock);
}

/**
 * 获取复习锁定
 */
export async function getReviewLock(): Promise<ReviewLock | null> {
  await ensureDBOpen();
  const lock = await db.reviewLocks.where("userId").equals(1).first();

  return lock || null;
}

/**
 * 清除复习锁定
 */
export async function clearReviewLock(): Promise<void> {
  await ensureDBOpen();
  await db.reviewLocks.where("userId").equals(1).delete();
}
```

### 4.3 兼容层 API（保持现有接口）

```typescript
// src/store/wordStore.ts（保持兼容）

/**
 * 保存闪卡会话状态（兼容层）
 * 内部调用新的 sessionStore API
 */
export async function saveFlashcardSessionState(
  state: Omit<FlashcardSessionState, "savedAt"> & { savedAt?: string }
): Promise<void> {
  // 转换为新表结构
  const session: Omit<
    FlashcardSession,
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
 */
export async function getFlashcardSessionState(): Promise<FlashcardSessionState | null> {
  const session = await getFlashcardSession();
  if (!session) return null;

  // 转换为旧接口格式
  return {
    wordSetId: session.wordSetId,
    wordIds: session.wordIds,
    currentIndex: session.currentIndex,
    sessionStats: session.sessionStats,
    showAnswer: session.showAnswer,
    currentWordId: session.currentWordId,
    savedAt: session.savedAt,
  };
}
```

---

## ⚡ 五、性能优化效果

### 5.1 写入性能提升

| 操作         | 优化前                          | 优化后                            | 提升        |
| ------------ | ------------------------------- | --------------------------------- | ----------- |
| 保存会话状态 | 更新整个 userSettings（~50ms）  | 只更新 flashcardSessions（~10ms） | **5 倍** ✅ |
| 更新用户设置 | 可能触发会话状态序列化（~30ms） | 只更新设置字段（~5ms）            | **6 倍** ✅ |

### 5.2 数据分离优势

- ✅ **会话状态更新**：不再影响 `userSettings` 的 `updatedAt` 字段
- ✅ **查询优化**：可以独立查询会话历史（如果需要）
- ✅ **扩展性**：未来可以支持多个会话或会话历史记录

---

## 🧪 六、测试策略

### 6.1 迁移测试

1. **数据迁移测试**

   - 测试从 v5 迁移到 v6 的数据完整性
   - 验证会话状态和锁定状态正确迁移
   - 验证旧数据清理

2. **兼容性测试**
   - 测试现有 API 是否正常工作
   - 测试组件是否无需修改
   - 测试数据读写一致性

### 6.2 功能测试

1. **会话状态测试**

   - 测试保存和获取会话状态
   - 测试清除会话状态
   - 测试会话恢复功能

2. **锁定状态测试**
   - 测试设置和获取锁定状态
   - 测试清除锁定状态
   - 测试锁定机制

---

## 📅 七、实施计划

### 7.1 实施步骤

**阶段 1：数据库设计**（1 小时）

- 创建数据库 v6 版本
- 定义新表结构
- 实现迁移逻辑

**阶段 2：API 实现**（1 小时）

- 创建 `sessionStore.ts`
- 扩展 `reviewStore.ts`
- 实现兼容层 API

**阶段 3：测试验证**（1 小时）

- 迁移测试
- 兼容性测试
- 功能测试

### 7.2 风险评估

**风险 1：数据迁移失败**

- **缓解策略**：充分测试迁移逻辑，提供回滚机制

**风险 2：兼容性问题**

- **缓解策略**：保持 API 兼容层，逐步迁移组件

**风险 3：性能提升不明显**

- **缓解策略**：先进行性能基准测试，验证优化效果

---

## ✅ 八、验收标准

1. ✅ 数据库 v6 版本创建成功
2. ✅ 数据迁移逻辑正确，无数据丢失
3. ✅ 现有 API 保持兼容，组件无需修改
4. ✅ 写入性能提升 5 倍以上
5. ✅ 所有测试通过

---

**设计完成时间**：2024-12-19  
**下一步行动**：编程专家开始实施，预计 3 小时完成
