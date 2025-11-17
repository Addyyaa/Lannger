# Langger 产品开发任务清单

## 📝 编辑历史

> **重要说明**：本文档采用协作编辑模式，所有编辑都需要标注时间、角色和类型。请勿删除他人编写的内容，只能删除自己编写的内容。

### 编辑记录

- **2024 年 12 月 19 日 - 架构师 - 请求**：添加架构设计 & 系统优化章节，包含 6 个架构任务（A1-A6）的设计方案和角色协作说明

---

## 📋 概述

本文档基于 README.md 中的 TODO 需求，详细拆解了测试模式和复习模式的功能开发任务。同时包含系统架构设计与优化任务，需要各角色协作完成。

---

## 🏗️ 架构设计 & 系统优化（架构师主导）

> **角色协作说明**：本节任务由架构师设计，需要以下角色协助实现：
>
> - **Code Implementation Expert** / **代码实现专家**：负责具体代码实现
> - **数据库设计专家**：负责数据库 Schema 设计和优化
> - **高级产品经理**：负责需求确认和优先级排序

### 架构评估总结

> **2024 年 12 月 19 日 - 架构师 - 请求**：基于对当前代码库的全面分析，完成架构评估。

**当前架构状态**：

- ✅ 分层清晰：UI、业务逻辑、数据访问分离良好
- ✅ 算法模块化：间隔重复算法独立，易于扩展
- ✅ 数据模型设计：遵循 SRP，表结构合理
- ⚠️ 状态管理：缺少统一的状态管理方案
- ⚠️ 错误处理：缺少全局错误边界和统一异常处理
- ⚠️ 性能优化：大数据量场景需要优化
- ❌ 测试覆盖：缺少单元测试和集成测试

---

### 任务 A1：状态管理架构优化

> **2024 年 12 月 19 日 - 架构师 - 请求**：设计状态管理架构优化方案，需要 Code Implementation Expert 协助实现。

**优先级**：P1（重要，影响长期维护性）  
**状态**：待设计  
**预计工时**：16 小时  
**负责角色**：架构师设计 → Code Implementation Expert 实现

**架构设计要点**：

1. **技术选型评估**：

   - 方案 A：Zustand（推荐）- 轻量级、函数式、TypeScript 友好
   - 方案 B：Context API + useReducer - 无需额外依赖，但需优化结构
   - 方案 C：Jotai - 原子化状态管理，适合细粒度控制

2. **状态管理范围**：

   ```typescript
   // 建议的状态结构
   interface AppState {
     // 用户设置
     userSettings: UserSettings;

     // 当前学习会话
     currentSession: {
       mode: StudyMode;
       wordSetId?: number;
       wordIds: number[];
       currentIndex: number;
     } | null;

     // UI 状态
     ui: {
       theme: "light" | "dark";
       language: string;
       isLoading: boolean;
       error: Error | null;
     };

     // 缓存数据（减少数据库查询）
     cache: {
       wordSets: WordSet[];
       words: Map<number, Word>;
       wordProgress: Map<number, WordProgress>;
     };
   }
   ```

3. **实施步骤**：
   - 步骤 1：引入 Zustand（或选定方案）
   - 步骤 2：创建 Store 结构（参考 `src/store/` 目录）
   - 步骤 3：迁移现有状态（从 `wordStore.ts` 和组件状态）
   - 步骤 4：更新组件使用新 Store
   - 步骤 5：移除冗余状态管理代码

**需要 Code Implementation Expert 协助**：

- [ ] 评估 Zustand vs Context API 在项目中的适用性
- [ ] 实现 Store 结构和类型定义
- [ ] 实现状态迁移脚本（确保数据一致性）
- [ ] 更新所有使用状态的组件
- [ ] 编写状态管理使用文档

**验收标准**：

- [ ] 状态管理方案选定并完成实现
- [ ] 所有组件成功迁移到新状态管理
- [ ] 性能无明显下降（状态更新响应时间 < 50ms）
- [ ] 代码可维护性提升（状态逻辑集中管理）

---

### 任务 A2：错误处理与监控体系

> **2024 年 12 月 19 日 - 架构师 - 请求**：设计全局错误处理和监控体系，提升用户体验和系统可观测性。

**优先级**：P1（重要，影响用户体验）  
**状态**：待设计  
**预计工时**：12 小时  
**负责角色**：架构师设计 → Code Implementation Expert 实现

**架构设计要点**：

1. **全局错误边界**：

   ```typescript
   // src/components/ErrorBoundary.tsx
   class ErrorBoundary extends React.Component {
     // 捕获组件树中的错误
     // 显示友好的错误页面
     // 记录错误到日志系统
   }
   ```

2. **统一错误处理层**：

   ```typescript
   // src/utils/errorHandler.ts
   export class AppError extends Error {
     code: string;
     userMessage: string;
     context?: Record<string, unknown>;
   }

   export function handleError(error: unknown): void {
     // 1. 记录错误（控制台 + 日志系统）
     // 2. 显示用户友好的提示
     // 3. 上报错误（如需要）
   }
   ```

3. **数据库操作包装**：

   ```typescript
   // src/utils/dbWrapper.ts
   export async function safeDbOperation<T>(
     operation: () => Promise<T>,
     fallback?: T
   ): Promise<T> {
     try {
       return await operation();
     } catch (error) {
       handleError(error);
       return fallback ?? ({} as T);
     }
   }
   ```

4. **性能监控**：
   - 关键操作耗时统计
   - 数据库查询性能监控
   - 组件渲染性能分析

**需要 Code Implementation Expert 协助**：

- [ ] 实现 ErrorBoundary 组件
- [ ] 实现统一错误处理工具函数
- [ ] 包装所有数据库操作（使用 safeDbOperation）
- [ ] 添加关键路径的性能监控
- [ ] 实现错误日志收集（可选：集成 Sentry 或自建）

**验收标准**：

- [ ] 所有错误都能被正确捕获和处理
- [ ] 用户看到友好的错误提示，而非白屏
- [ ] 错误信息被正确记录（便于调试）
- [ ] 关键操作有性能监控数据

---

### 任务 A3：性能优化架构设计

> **2024 年 12 月 19 日 - 架构师 - 请求**：设计性能优化方案，重点关注大数据量场景下的查询和计算性能。

**优先级**：P1（重要，影响用户体验）  
**状态**：待设计  
**预计工时**：20 小时  
**负责角色**：架构师设计 → Code Implementation Expert + 数据库设计专家 协作

**架构设计要点**：

1. **数据库查询优化**：

   - 问题：`getAllWords()` 在大数据量时可能阻塞
   - 方案：实现分页和懒加载

   ```typescript
   // src/utils/pagination.ts
   export async function getWordsPaginated(
     page: number,
     pageSize: number = 50
   ): Promise<{ words: Word[]; total: number; hasMore: boolean }> {
     // 使用 Dexie 的 limit/offset 或游标
   }
   ```

2. **算法计算优化**：

   - 问题：调度算法可能涉及全表扫描
   - 方案：使用 Web Worker 处理复杂计算

   ```typescript
   // src/workers/schedulerWorker.ts
   // 将权重计算、排序等耗时操作移到 Worker
   ```

3. **缓存策略**：

   ```typescript
   // src/utils/cache.ts
   interface CacheConfig {
     ttl: number; // 缓存过期时间
     maxSize: number; // 最大缓存条目数
   }

   // 实现 LRU 缓存，缓存常用数据
   ```

4. **虚拟滚动优化**：
   - 确认 `react-window` 在所有列表场景的使用
   - 优化长列表渲染性能

**需要数据库设计专家协助**：

- [ ] 分析现有索引设计，提出优化建议
- [ ] 设计分页查询的索引策略
- [ ] 评估复合索引对查询性能的影响
- [ ] 提供数据库性能测试方案

**需要 Code Implementation Expert 协助**：

- [ ] 实现分页查询工具函数
- [ ] 实现 Web Worker 计算逻辑
- [ ] 实现缓存管理工具
- [ ] 优化所有列表组件的渲染性能
- [ ] 添加性能监控和报告

**验收标准**：

- [ ] 1000+ 单词场景下，列表加载时间 < 500ms
- [ ] 算法调度计算不阻塞主线程
- [ ] 内存使用合理（缓存大小可控）
- [ ] 性能监控数据显示优化效果

---

### 任务 A4：数据迁移与版本管理优化

> **2024 年 12 月 19 日 - 架构师 - 请求**：优化数据库迁移机制，提升数据安全性和迁移可维护性。

**优先级**：P2（重要，影响数据安全）  
**状态**：待设计  
**预计工时**：8 小时  
**负责角色**：架构师设计 → 数据库设计专家 + Code Implementation Expert 协作

**架构设计要点**：

1. **迁移逻辑模块化**：

   ```typescript
   // src/db/migrations/
   // ├── v1-to-v2.ts
   // ├── v2-to-v3.ts
   // ├── v3-to-v4.ts
   // └── index.ts

   // 每个迁移文件独立，便于维护和测试
   ```

2. **迁移回滚机制**：

   ```typescript
   interface Migration {
     version: number;
     up: (trans: Transaction) => Promise<void>;
     down?: (trans: Transaction) => Promise<void>; // 可选回滚
   }
   ```

3. **数据完整性校验**：
   ```typescript
   // src/db/validators.ts
   export async function validateDatabaseIntegrity(): Promise<{
     isValid: boolean;
     errors: string[];
   }> {
     // 检查外键关系、必填字段、数据范围等
   }
   ```

**需要数据库设计专家协助**：

- [ ] 设计迁移脚本的结构和规范
- [ ] 评估每个版本迁移的数据风险
- [ ] 设计数据完整性校验规则
- [ ] 提供迁移测试方案

**需要 Code Implementation Expert 协助**：

- [ ] 重构现有迁移逻辑为模块化结构
- [ ] 实现迁移回滚机制（如需要）
- [ ] 实现数据完整性校验工具
- [ ] 编写迁移测试用例

**验收标准**：

- [ ] 迁移逻辑清晰、可维护
- [ ] 迁移过程有日志记录
- [ ] 数据完整性校验通过
- [ ] 迁移失败时有恢复机制

---

### 任务 A5：测试架构设计

> **2024 年 12 月 19 日 - 架构师 - 请求**：设计测试架构，建立完整的测试体系以保障代码质量。

**优先级**：P1（重要，影响代码质量）  
**状态**：待设计  
**预计工时**：24 小时  
**负责角色**：架构师设计 → Code Implementation Expert 实现

**架构设计要点**：

1. **测试框架选型**：

   - 单元测试：Vitest（与 Vite 集成良好）
   - E2E 测试：Playwright 或 Cypress
   - 测试覆盖率：c8 或 @vitest/coverage

2. **测试目录结构**：

   ```
   src/
   ├── algorithm/
   │   ├── __tests__/
   │   │   ├── spacedRepetition.test.ts
   │   │   ├── scheduler.test.ts
   │   │   └── ...
   ├── utils/
   │   ├── __tests__/
   │   │   └── ...
   └── components/
       ├── __tests__/
       │   └── ...
   ```

3. **测试优先级**：

   - P0：算法模块（核心业务逻辑）
   - P1：工具函数（数据验证、解析等）
   - P2：组件测试（关键交互流程）

4. **Mock 策略**：
   ```typescript
   // src/__mocks__/db.ts
   // Mock IndexedDB 操作，避免真实数据库依赖
   ```

**需要 Code Implementation Expert 协助**：

- [ ] 配置 Vitest 测试环境
- [ ] 实现算法模块的单元测试（覆盖率 > 80%）
- [ ] 实现工具函数的单元测试
- [ ] 实现关键组件的集成测试
- [ ] 配置 CI/CD 自动测试流程
- [ ] 编写测试文档和使用指南

**验收标准**：

- [ ] 测试框架配置完成
- [ ] 核心算法测试覆盖率 > 80%
- [ ] 所有测试用例通过
- [ ] CI/CD 集成测试流程

---

### 任务 A6：架构演进路线图

> **2024 年 12 月 19 日 - 架构师 - 请求**：制定架构演进路线图，需要高级产品经理协助确认优先级和资源分配。

**优先级**：P2（规划性质）  
**状态**：已完成规划  
**负责角色**：架构师 + 高级产品经理 协作

**短期目标（1-2 周）**：

1. ✅ 完成架构评估（当前任务）
2. ⏳ 实现错误处理机制（任务 A2）
3. ⏳ 优化数据库查询性能（任务 A3）
4. ⏳ 添加基础单元测试（任务 A5）

**中期目标（1-2 月）**：

1. 引入状态管理库（任务 A1）
2. 实现性能监控体系（任务 A3）
3. 完善测试覆盖（任务 A5）
4. 数据同步机制设计（如需要）

**长期目标（3-6 月）**：

1. 服务端支持架构设计（数据备份/同步）
2. 多用户支持架构设计
3. 算法优化与 A/B 测试框架
4. 微前端架构评估（如需要）

**需要高级产品经理协助**：

- [ ] 确认架构演进优先级
- [ ] 评估新功能对架构的影响
- [ ] 协调资源分配（开发时间）
- [ ] 评估技术债务的优先级

---

### 架构原则遵循情况

> **2024 年 12 月 19 日 - 架构师 - 请求**：评估当前架构对设计原则的遵循情况。

| 原则            | 当前状态 | 改进任务            | 优先级 |
| --------------- | -------- | ------------------- | ------ |
| SRP（单一职责） | ✅ 良好  | 继续保持            | -      |
| DRY（避免重复） | ✅ 良好  | 继续保持            | -      |
| 可扩展性        | ⚠️ 中等  | 任务 A1（状态管理） | P1     |
| 可测试性        | ❌ 不足  | 任务 A5（测试架构） | P1     |
| 性能            | ⚠️ 中等  | 任务 A3（性能优化） | P1     |
| 错误处理        | ❌ 不足  | 任务 A2（错误处理） | P1     |
| 数据安全        | ⚠️ 中等  | 任务 A4（数据迁移） | P2     |

---

### 架构设计文档

> **2024 年 12 月 19 日 - 架构师 - 请求**：技术栈评估和架构模式说明。

**技术栈评估**：

- ✅ React 19 + TypeScript：保持，无需变更
- ✅ Vite：保持，构建性能优秀
- ✅ Dexie：保持，IndexedDB ORM 成熟
- ⚠️ 状态管理：需要引入（见任务 A1）
- ⚠️ 测试框架：需要引入（见任务 A5）

**架构模式**：

- 当前：MVC 风格（Model: db.ts, View: Components, Controller: Store/Utils）
- 建议：保持当前模式，优化各层职责

**依赖关系**：

```
UI Layer (Components/Pages)
    ↓
Business Logic Layer (Store/Algorithm)
    ↓
Data Access Layer (db.ts)
    ↓
IndexedDB (Dexie)
```

---

**架构师备注**：

> **2024 年 12 月 19 日 - 架构师 - 请求**：
>
> - 所有架构任务都需要与产品需求对齐，避免过度设计
> - 优先解决影响用户体验和代码维护性的问题
> - 技术选型需要评估学习成本和团队接受度
> - 定期回顾架构决策，根据实际使用情况调整

**最后更新**：2024 年 12 月 19 日  
**架构师**：系统架构师

---

## 🎯 一、测试模式（Test Mode）功能开发

### 1.1 核心功能需求

#### 任务 1.1.1：实现双向选择题功能

**优先级**：P0（核心功能）  
**状态**：待开发  
**预计工时**：8 小时

**需求描述**：

- 实现两种出题模式：
  - **模式 A**：显示单词（kanji/kana），用户从多个选项中选择对应的意思（meaning）
  - **模式 B**：显示意思（meaning），用户从多个选项中选择对应的单词（kanji/kana）
- 每次出题随机选择模式 A 或模式 B
- 选项数量：4 个选项（1 个正确答案 + 3 个干扰项）
- 干扰项从同一单词集（wordSet）中随机选择，确保难度相近

**技术实现要点**：

- 创建 `TestStudy.tsx` 组件（参考 `FlashcardStudy.tsx` 的结构）
- 使用 `testScheduler.ts` 获取测试单词列表
- 实现选项生成算法：
  ```typescript
  // 伪代码示例
  function generateOptions(
    correctWord: Word,
    allWords: Word[],
    count: number = 4
  ) {
    const distractors = allWords
      .filter((w) => w.id !== correctWord.id && w.setId === correctWord.setId)
      .shuffle()
      .slice(0, count - 1);
    const options = [correctWord, ...distractors].shuffle();
    return options;
  }
  ```
- 记录用户选择，判断正确/错误
- 更新 `wordProgress` 和 `reviewLogs`

**验收标准**：

- [ ] 能够随机显示单词或意思作为题目
- [ ] 能够生成 4 个选项（1 正确 + 3 干扰）
- [ ] 点击选项后能正确判断对错
- [ ] 答对/答错后能正确更新学习进度
- [ ] 支持横屏和竖屏布局

---

#### 任务 1.1.2：实现倒计时功能

**优先级**：P0（核心功能）  
**状态**：待开发  
**预计工时**：4 小时

**需求描述**：

- 每道题目设置倒计时（默认 30 秒，可配置）
- 倒计时显示在题目区域显眼位置
- 倒计时结束时：
  - 自动标记为"错误"
  - 显示正确答案
  - 自动进入下一题
- 用户选择答案后立即停止倒计时
- 倒计时支持暂停/继续（可选功能）

**技术实现要点**：

- 使用 `useState` 和 `useEffect` 管理倒计时状态
- 倒计时组件设计：

  ```typescript
  const [timeLeft, setTimeLeft] = useState(30); // 默认 30 秒
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isPaused]);
  ```

- 倒计时 UI 设计：
  - 圆形进度条 + 数字显示
  - 剩余时间 < 10 秒时显示红色警告
  - 支持响应式设计（横屏/竖屏）

**验收标准**：

- [ ] 每道题显示倒计时（默认 30 秒）
- [ ] 倒计时结束时自动标记为错误并进入下一题
- [ ] 用户选择答案后立即停止倒计时
- [ ] 倒计时 UI 清晰可见，剩余时间 < 10 秒时显示警告
- [ ] 倒计时时间可配置（后续版本）

---

#### 任务 1.1.3：测试结果统计与展示

**优先级**：P1（重要功能）  
**状态**：待开发  
**预计工时**：4 小时

**需求描述**：

- 测试结束后显示统计信息：
  - 总题数
  - 答对题数
  - 答错题数
  - 正确率（百分比）
  - 平均答题时间
- 显示错题回顾（可选）
- 支持重新开始测试

**技术实现要点**：

- 在 `TestStudy.tsx` 中维护测试会话状态：
  ```typescript
  interface TestSessionStats {
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    averageTime: number;
    wrongAnswers: Array<{
      wordId: number;
      userAnswer: string;
      correctAnswer: string;
    }>;
  }
  ```
- 测试结束后弹出结果弹窗（使用 `ComponentAsModel`）
- 结果弹窗包含：
  - 统计数字展示
  - 错题列表（可展开查看）
  - "重新测试"按钮
  - "返回"按钮

**验收标准**：

- [ ] 测试结束后显示完整的统计信息
- [ ] 统计信息准确无误
- [ ] 支持查看错题回顾
- [ ] 支持重新开始测试

---

### 1.2 集成与优化

#### 任务 1.2.1：集成到 Study 页面

**优先级**：P0  
**状态**：待开发  
**预计工时**：2 小时

**需求描述**：

- 在 `Study.tsx` 中添加测试模式的处理逻辑
- 点击"测试模式"后，选择单词集，然后进入测试界面
- 测试完成后更新 `dailyStats.testedCount`

**技术实现要点**：

- 修改 `Study.tsx` 的 `handleSelectWordSet` 函数：
  ```typescript
  if (selectedMode === "test") {
    setShowTestStudy(true);
  }
  ```
- 创建 `TestStudy` 组件并导入
- 在 `handleSessionComplete` 中处理测试模式的统计更新

**验收标准**：

- [ ] 能够从 Study 页面进入测试模式
- [ ] 测试完成后能正确更新统计数据
- [ ] 测试会话状态能正确保存和恢复

---

## 🔄 二、复习模式（Review Mode）功能开发

### 2.1 艾宾浩斯遗忘曲线实现

#### 任务 2.1.1：实现艾宾浩斯遗忘曲线算法

**优先级**：P0（核心功能）  
**状态**：待开发  
**预计工时**：12 小时

**需求描述**：

- 实现标准的艾宾浩斯遗忘曲线复习时间点：
  - 第 1 次复习：学习后 1 小时
  - 第 2 次复习：学习后 1 天
  - 第 3 次复习：学习后 2 天
  - 第 4 次复习：学习后 4 天
  - 第 5 次复习：学习后 7 天
  - 第 6 次复习：学习后 15 天
  - 第 7 次复习：学习后 30 天
  - 第 8 次复习：学习后 60 天
- 每个单词集（wordSet）独立维护复习进度
- 总共需要完成 8 次复习才算完成该单词集的复习流程

**技术实现要点**：

- 在数据库中添加复习计划表（或扩展现有表）：
  ```typescript
  interface ReviewPlan {
    id?: number;
    wordSetId: number;
    reviewStage: number; // 1-8，当前复习阶段
    nextReviewAt: string; // ISO 格式的下次复习时间
    completedStages: number[]; // 已完成的复习阶段 [1, 2, 3, ...]
    startedAt: string; // 开始复习的时间
    updatedAt: string;
  }
  ```
- 实现复习时间计算函数：

  ```typescript
  const EBBINGHAUS_INTERVALS = [1, 1, 2, 4, 7, 15, 30, 60]; // 天数

  function calculateNextReviewTime(stage: number, lastReviewTime: Date): Date {
    const days = EBBINGHAUS_INTERVALS[stage - 1];
    const nextTime = new Date(lastReviewTime);
    nextTime.setDate(nextTime.getDate() + days);
    return nextTime;
  }
  ```

- 修改 `reviewScheduler.ts`，集成艾宾浩斯算法
- 在 `wordProgress` 表中记录每个单词的复习阶段

**验收标准**：

- [ ] 能够为每个单词集创建独立的复习计划
- [ ] 能够正确计算 8 个复习时间点
- [ ] 复习时间点到达后能够正确触发复习提醒
- [ ] 复习完成后能够正确更新到下一阶段

---

#### 任务 2.1.2：实现复习通知机制

**优先级**：P0（核心功能）  
**状态**：待开发  
**预计工时**：8 小时

**需求描述**：

- 当复习时间点到达时，在应用内显示通知
- 通知内容：
  - 单词集名称
  - 当前复习阶段（第 X 次复习）
  - 需要复习的单词数量
  - "开始复习"按钮
- 支持多个复习通知（多个课程同时到达复习时间）
- 通知优先级：按复习时间到达的先后顺序排序

**技术实现要点**：

- 创建 `ReviewNotification.tsx` 组件
- 在 `Study.tsx` 或 `Home.tsx` 中检查复习通知：

  ```typescript
  useEffect(() => {
    const checkReviewNotifications = async () => {
      const now = new Date();
      const dueReviews = await db.reviewPlans
        .where("nextReviewAt")
        .belowOrEqual(now.toISOString())
        .sortBy("nextReviewAt");

      if (dueReviews.length > 0) {
        setReviewNotifications(dueReviews);
      }
    };

    checkReviewNotifications();
    // 每分钟检查一次
    const interval = setInterval(checkReviewNotifications, 60000);
    return () => clearInterval(interval);
  }, []);
  ```

- 通知弹窗设计：
  - 磨砂玻璃效果（与现有 UI 风格一致）
  - 显示多个通知时，按时间顺序排列
  - 每个通知显示关键信息
  - 支持"稍后提醒"和"开始复习"操作

**验收标准**：

- [ ] 复习时间到达时能够正确显示通知
- [ ] 多个通知能够正确排序（按时间先后）
- [ ] 通知 UI 清晰美观，符合现有设计风格
- [ ] 支持点击通知直接进入复习

---

### 2.2 复习状态管理

#### 任务 2.2.1：实现复习锁定机制

**优先级**：P0（核心功能）  
**状态**：待开发  
**预计工时**：6 小时

**需求描述**：

- 用户选择某个课程开始复习后，进入"复习锁定状态"
- 在锁定状态下：
  - 无法选择其他课程进行复习
  - 其他课程的复习按钮显示为禁用状态
  - 显示提示："必须完成课程 XXX 第 X 次复习"
- 完成当前复习后，自动解除锁定
- 锁定状态仅影响复习模式，不影响闪卡和测试模式

**技术实现要点**：

- 在 `UserSettings` 中添加复习锁定状态：
  ```typescript
  interface UserSettings {
    // ... 现有字段
    activeReviewLock?: {
      wordSetId: number;
      reviewStage: number;
      lockedAt: string;
    } | null;
  }
  ```
- 在 `Study.tsx` 中检查锁定状态：
  ```typescript
  const checkReviewLock = async () => {
    const settings = await db.userSettings.get(1);
    if (settings?.activeReviewLock) {
      // 显示锁定提示，禁用其他复习按钮
      return settings.activeReviewLock;
    }
    return null;
  };
  ```
- 开始复习时设置锁定：
  ```typescript
  const startReview = async (wordSetId: number, reviewStage: number) => {
    const settings = await db.userSettings.get(1);
    if (settings) {
      settings.activeReviewLock = {
        wordSetId,
        reviewStage,
        lockedAt: new Date().toISOString(),
      };
      await db.userSettings.put(settings);
    }
  };
  ```
- 完成复习时解除锁定：
  ```typescript
  const completeReview = async () => {
    const settings = await db.userSettings.get(1);
    if (settings) {
      settings.activeReviewLock = null;
      await db.userSettings.put(settings);
    }
  };
  ```

**验收标准**：

- [ ] 选择复习课程后，其他课程复习按钮被禁用
- [ ] 显示清晰的锁定提示信息
- [ ] 完成复习后能够正确解除锁定
- [ ] 锁定状态不影响其他学习模式

---

#### 任务 2.2.2：实现复习进度跟踪

**优先级**：P0（核心功能）  
**状态**：待开发  
**预计工时**：6 小时

**需求描述**：

- 跟踪每个单词集的复习进度：
  - 当前复习阶段（1-8）
  - 已完成的复习次数
  - 下次复习时间
  - 复习完成状态（8 次全部完成）
- 在单词集管理页面显示复习进度
- 支持查看复习历史记录

**技术实现要点**：

- 在 `ReviewPlan` 表中维护复习进度
- 创建复习进度展示组件：
  ```typescript
  interface ReviewProgressDisplay {
    wordSetId: number;
    currentStage: number;
    completedStages: number[];
    nextReviewAt: string;
    isCompleted: boolean;
  }
  ```
- 在 `WordSetsManage.tsx` 或 `WordSetsTable.tsx` 中显示复习进度
- 复习进度可视化：
  - 进度条显示（8 个阶段，已完成阶段高亮）
  - 文字说明："第 X/8 次复习"
  - 下次复习时间倒计时

**验收标准**：

- [ ] 能够正确显示每个单词集的复习进度
- [ ] 进度信息准确无误
- [ ] 复习进度 UI 清晰直观
- [ ] 支持查看详细的复习历史

---

### 2.3 多课程复习冲突处理

#### 任务 2.3.1：实现复习队列管理

**优先级**：P1（重要功能）  
**状态**：待开发  
**预计工时**：8 小时

**需求描述**：

- 当多个课程的复习时间重叠时，按时间先后顺序排队
- 优先显示最先到达复习时间的课程
- 当前课程复习完成后，自动显示下一个课程的复习通知
- 如果用户在复习过程中关闭应用，下次打开时继续显示当前锁定的复习

**技术实现要点**：

- 实现复习队列排序算法：
  ```typescript
  function sortReviewQueue(reviews: ReviewPlan[]): ReviewPlan[] {
    return reviews
      .filter((r) => !r.isCompleted)
      .sort((a, b) => {
        const timeA = new Date(a.nextReviewAt).getTime();
        const timeB = new Date(b.nextReviewAt).getTime();
        return timeA - timeB;
      });
  }
  ```
- 在通知组件中实现队列显示：
  - 第一个通知：当前需要复习的课程（高亮显示）
  - 后续通知：排队等待的课程（灰色显示，显示预计复习时间）
- 复习完成后自动处理队列：

  ```typescript
  const handleReviewComplete = async (wordSetId: number) => {
    // 更新当前复习进度
    await updateReviewProgress(wordSetId);

    // 解除锁定
    await clearReviewLock();

    // 检查下一个需要复习的课程
    const nextReview = await getNextReviewInQueue();
    if (nextReview) {
      // 显示下一个复习通知
      showReviewNotification(nextReview);
    }
  };
  ```

**验收标准**：

- [ ] 多个复习通知能够按时间顺序正确排序
- [ ] 当前复习完成后能够自动显示下一个通知
- [ ] 队列管理逻辑清晰，用户体验流畅
- [ ] 应用重启后能够正确恢复复习状态

---

### 2.4 复习模式 UI 实现

#### 任务 2.4.1：创建复习学习组件

**优先级**：P0  
**状态**：待开发  
**预计工时**：10 小时

**需求描述**：

- 创建 `ReviewStudy.tsx` 组件（参考 `FlashcardStudy.tsx`）
- 复习模式的学习界面：
  - 显示当前复习阶段（"第 X/8 次复习"）
  - 显示需要复习的单词列表
  - 支持闪卡式复习（与现有闪卡模式类似）
  - 显示复习进度（已完成/总数）
- 复习完成后：
  - 更新复习计划到下一阶段
  - 解除复习锁定
  - 显示复习结果统计

**技术实现要点**：

- 复用 `FlashcardStudy.tsx` 的部分逻辑
- 集成 `reviewScheduler.ts` 获取需要复习的单词
- 实现复习完成判断：
  ```typescript
  const isReviewComplete = (reviewedWords: number[], totalWords: number) => {
    // 所有单词都复习完成
    return reviewedWords.length >= totalWords;
  };
  ```
- 复习完成后更新 `ReviewPlan`：
  ```typescript
  const completeReviewStage = async (
    wordSetId: number,
    currentStage: number
  ) => {
    const plan = await db.reviewPlans
      .where("wordSetId")
      .equals(wordSetId)
      .first();
    if (plan) {
      plan.completedStages.push(currentStage);
      plan.reviewStage = currentStage + 1;
      if (plan.reviewStage <= 8) {
        const nextTime = calculateNextReviewTime(plan.reviewStage, new Date());
        plan.nextReviewAt = nextTime.toISOString();
      } else {
        plan.isCompleted = true;
      }
      await db.reviewPlans.put(plan);
    }
  };
  ```

**验收标准**：

- [ ] 复习界面清晰显示当前复习阶段
- [ ] 能够正确显示需要复习的单词
- [ ] 复习完成后能够正确更新到下一阶段
- [ ] 复习结果统计准确

---

## 📊 三、数据库扩展

### 任务 3.1：扩展数据库 Schema

**优先级**：P0  
**状态**：待开发  
**预计工时**：4 小时

**需求描述**：

- 添加 `reviewPlans` 表用于管理复习计划
- 扩展 `wordProgress` 表，添加复习阶段相关字段
- 实现数据库迁移逻辑（version 4）

**技术实现要点**：

- 在 `db.ts` 中添加 `reviewPlans` 表定义
- 实现数据库版本升级：
  ```typescript
  this.version(4)
    .stores({
      // ... 现有表
      reviewPlans:
        "++id, wordSetId, reviewStage, nextReviewAt, [wordSetId+reviewStage]",
    })
    .upgrade(async (trans) => {
      // 迁移逻辑：为现有单词集创建初始复习计划
    });
  ```

**验收标准**：

- [ ] 数据库 Schema 扩展成功
- [ ] 现有数据能够正确迁移
- [ ] 新表索引设计合理，查询性能良好

---

## 🎨 四、UI/UX 优化

### 任务 4.1：统一设计风格

**优先级**：P1  
**状态**：待开发  
**预计工时**：6 小时

**需求描述**：

- 测试模式和复习模式的 UI 与现有闪卡模式保持一致
- 使用相同的主题色彩、字体、间距
- 支持深色/浅色主题切换
- 支持横屏/竖屏自适应

**验收标准**：

- [ ] 所有学习模式 UI 风格统一
- [ ] 支持主题切换
- [ ] 响应式设计完善

---

## 🧪 五、测试与优化

### 任务 5.1：功能测试

**优先级**：P1  
**状态**：待开发  
**预计工时**：8 小时

**需求描述**：

- 编写单元测试覆盖核心算法
- 进行集成测试验证完整流程
- 进行用户体验测试

**验收标准**：

- [ ] 核心功能测试覆盖率达到 80% 以上
- [ ] 所有功能流程测试通过
- [ ] 无明显 Bug 和性能问题

---

## 📝 六、文档更新

### 任务 6.1：更新项目文档

**优先级**：P2  
**状态**：待开发  
**预计工时**：2 小时

**需求描述**：

- 更新 README.md，添加测试模式和复习模式的说明
- 更新算法文档（`src/algorithm/README.md`）
- 添加用户使用指南

**验收标准**：

- [ ] 文档内容准确完整
- [ ] 用户能够根据文档理解新功能

---

## 📅 开发计划

### 第一阶段：测试模式开发（预计 2 周）

- 任务 1.1.1：双向选择题功能
- 任务 1.1.2：倒计时功能
- 任务 1.1.3：测试结果统计
- 任务 1.2.1：集成到 Study 页面

### 第二阶段：复习模式核心功能（预计 3 周）

- 任务 2.1.1：艾宾浩斯遗忘曲线算法
- 任务 2.1.2：复习通知机制
- 任务 2.2.1：复习锁定机制
- 任务 2.2.2：复习进度跟踪
- 任务 3.1：数据库扩展

### 第三阶段：复习模式完善（预计 2 周）

- 任务 2.3.1：复习队列管理
- 任务 2.4.1：复习学习组件
- 任务 4.1：UI/UX 优化

### 第四阶段：测试与发布（预计 1 周）

- 任务 5.1：功能测试
- 任务 6.1：文档更新

---

## 🎯 成功标准

1. **功能完整性**：所有 TODO 需求均已实现
2. **用户体验**：界面流畅，交互自然，无明显卡顿
3. **数据准确性**：学习进度、统计数据准确无误
4. **性能表现**：应用启动快速，操作响应及时
5. **代码质量**：代码规范，注释完整，易于维护

---

## 📌 注意事项

1. **数据迁移**：数据库 Schema 变更时，需要确保现有用户数据能够正确迁移
2. **向后兼容**：新功能不应影响现有闪卡模式的正常使用
3. **性能优化**：复习通知检查频率需要平衡实时性和性能
4. **用户体验**：复习锁定机制需要清晰的提示，避免用户困惑
5. **错误处理**：所有异步操作都需要完善的错误处理和用户提示

---

## 🤝 协作请求

### 来自代码实现专家的协作请求

> **2024 年 12 月 19 日-代码实现专家-请求**：添加协作请求部分，请求数据库设计专家和高级产品经理协助确认设计细节

#### 请求 1：数据库设计专家 - ReviewPlans 表设计确认

**请求时间**：2024-12-19  
**优先级**：P0  
**状态**：待处理

**背景**：
根据 `todo.md` 中的任务 2.1.1，需要实现艾宾浩斯遗忘曲线的 8 次复习机制。当前数据库结构（v3）已经包含了 `wordProgress` 和 `reviewLogs` 表，但缺少专门管理每个单词集（wordSet）复习计划的表。

**需要确认的问题**：

1. 是否需要新增 `reviewPlans` 表来管理每个单词集的复习进度？

   - 表结构设计：`id`, `wordSetId`, `reviewStage` (1-8), `nextReviewAt`, `completedStages[]`, `startedAt`, `updatedAt`
   - 还是可以将复习计划信息存储在 `wordProgress` 表中（每个单词独立维护复习阶段）？

2. 如果使用 `reviewPlans` 表：

   - 主键设计：自增 `id` 还是使用 `wordSetId` 作为主键？
   - 索引设计：需要哪些索引来支持高效查询（如按 `nextReviewAt` 查询到期的复习）？
   - 与 `wordProgress` 表的关系：如何关联？是否需要外键约束？

3. 数据迁移策略：
   - 现有用户数据如何迁移到新的复习计划系统？
   - 是否需要为所有现有单词集创建初始复习计划？

**建议方案**（供参考）：

```typescript
interface ReviewPlan {
  id?: number; // 自增主键
  wordSetId: number; // 单词集ID（唯一索引）
  reviewStage: number; // 当前复习阶段 1-8
  nextReviewAt: string; // ISO 格式的下次复习时间
  completedStages: number[]; // 已完成的复习阶段 [1, 2, 3, ...]
  startedAt: string; // 开始复习的时间
  updatedAt: string;
  isCompleted?: boolean; // 是否完成全部8次复习
}
```

**期望回复时间**：尽快，以便开始实现任务 2.1.1

---

#### 请求 2：高级产品经理 - 测试模式和复习模式交互细节确认

**请求时间**：2024-12-19  
**优先级**：P0  
**状态**：待处理

**背景**：
根据 `todo.md` 和 `README.md` 的 TODO，需要实现测试模式和复习模式。虽然 `todo.md` 已经详细列出了功能需求，但部分交互细节和用户体验流程需要进一步确认。

**需要确认的问题**：

**测试模式相关**：

1. **倒计时配置**：

   - 默认倒计时时间：30 秒是否合适？是否需要支持用户自定义？
   - 倒计时暂停功能：是否需要？如果用户中途离开，倒计时如何处理？

2. **选项生成策略**：

   - 干扰项选择：是否必须从同一单词集中选择？如果单词集单词数量少于 4 个怎么办？
   - 选项顺序：是否完全随机，还是需要确保正确答案不在固定位置？

3. **测试结果展示**：
   - 错题回顾：是否需要显示用户选择的错误答案？还是只显示正确答案？
   - 重新测试：是否使用相同的单词列表，还是重新生成？

**复习模式相关**：

1. **复习通知时机**：

   - 通知触发时机：是应用启动时检查，还是需要后台定时检查？
   - 通知显示位置：在 Home 页面、Study 页面，还是全局弹窗？
   - 通知持久化：如果用户忽略通知，下次打开应用是否继续显示？

2. **复习锁定机制**：

   - 锁定提示位置：在单词集选择界面显示，还是在复习界面显示？
   - 锁定解除条件：是否必须完成所有单词的复习，还是可以中途退出？
   - 退出处理：如果用户在复习过程中关闭应用，下次打开时如何处理？

3. **复习进度显示**：

   - 进度展示位置：在单词集管理页面、Study 页面，还是两个地方都显示？
   - 进度可视化：使用进度条、百分比，还是阶段标识（如 "第 3/8 次复习"）？

4. **多课程复习冲突**：
   - 队列显示：如果有多个课程需要复习，是否同时显示所有通知，还是只显示第一个？
   - 用户选择：是否允许用户选择跳过当前复习，先复习其他课程？

**期望回复时间**：尽快，以便开始实现相关功能

---

#### 请求 3：代码实现专家 - 技术实现方案确认

**请求时间**：2024-12-19  
**优先级**：P1  
**状态**：待处理

**背景**：
在开始实现之前，需要确认一些技术实现细节，以确保代码质量和可维护性。

**需要确认的问题**：

1. **组件复用策略**：

   - `TestStudy.tsx` 和 `ReviewStudy.tsx` 是否应该复用 `FlashcardStudy.tsx` 的部分逻辑？
   - 还是应该创建独立的组件，通过 props 控制不同的行为？

2. **状态管理**：

   - 复习锁定状态：存储在 `UserSettings` 中是否合适？还是需要单独的状态管理？
   - 测试会话状态：是否需要像闪卡模式一样支持会话恢复？

3. **性能优化**：

   - 复习通知检查频率：每分钟检查一次是否合适？是否需要考虑性能影响？
   - 单词列表加载：是否需要虚拟滚动（react-window）来优化大量单词的显示？

4. **错误处理**：
   - 数据库操作失败：如何向用户展示友好的错误提示？
   - 网络问题：PWA 离线场景下的数据同步策略？

**建议方案**（供参考）：

- 创建基础的学习组件 `BaseStudy.tsx`，包含通用的学习逻辑
- `FlashcardStudy.tsx`、`TestStudy.tsx`、`ReviewStudy.tsx` 继承或组合基础组件
- 使用 React Context 管理全局学习状态（如复习锁定状态）

**期望回复时间**：在开始实现前确认

---

## 📝 协作记录

> **格式说明**：所有编辑都需要明确标注时间（年月日时分）、角色、请求/答复类型，不能删除别人写的内容，只能删除自己写的内容。

---

### 2024-12-19 10:00 - 代码实现专家 - 请求

**内容**：添加协作请求部分，请求数据库设计专家和高级产品经理协助确认设计细节

**待处理**：等待其他角色的回复

---

### 2024-12-19 14:30 - 高级产品经理 - 答复

#### ✅ 回复请求 2：测试模式和复习模式交互细节确认

**回复人**：高级产品经理  
**回复时间**：2024-12-19 14:30  
**状态**：✅ 已确认

---

**测试模式交互细节确认**：

1. **倒计时配置**：

   - ✅ **默认倒计时时间：30 秒** - 经过用户调研，30 秒适合大多数用户，既能保持紧张感又不会过于焦虑
   - ⏸️ **用户自定义配置**：**暂不支持**（v1.0 版本），后续版本（v1.1）可考虑添加
   - ⏸️ **倒计时暂停功能**：**暂不支持**（v1.0 版本），如果用户中途离开（切换标签页/应用），倒计时继续运行，返回时显示剩余时间
   - 📝 **实现要求**：使用 `document.visibilitychange` 事件处理页面切换场景

2. **选项生成策略**：

   - ✅ **干扰项选择**：**必须从同一单词集中选择**，确保难度相近
   - ✅ **单词数量不足 4 个的处理**：
     - 如果单词集单词数量 < 4：从所有单词集中随机选择干扰项（标记来源，便于后续优化）
     - 如果单词集单词数量 = 1：显示提示"单词数量不足，无法进行测试"，引导用户添加更多单词
   - ✅ **选项顺序**：**完全随机**，确保正确答案不在固定位置（避免用户记忆位置而非内容）

3. **测试结果展示**：
   - ✅ **错题回顾**：**显示用户选择的错误答案 + 正确答案**，格式如下：
     ```
     题目：单词/意思
     您的答案：❌ [用户选择的错误选项]
     正确答案：✅ [正确答案]
     ```
   - ✅ **重新测试**：**重新生成单词列表**（使用相同的调度算法），确保每次测试都有新鲜感

---

**复习模式交互细节确认**：

1. **复习通知时机**：

   - ✅ **通知触发时机**：
     - **应用启动时检查**（必须）
     - **Study 页面加载时检查**（必须）
     - **每分钟后台检查**（可选，但需要考虑性能，建议使用 `requestIdleCallback` 优化）
   - ✅ **通知显示位置**：
     - **主要位置**：Study 页面顶部（横幅通知，非阻塞）
     - **次要位置**：Home 页面（如果有复习通知，显示徽章提示）
     - **全局弹窗**：仅在用户主动点击通知时显示详细弹窗
   - ✅ **通知持久化**：
     - 如果用户忽略通知（点击"稍后提醒"），**下次打开应用继续显示**
     - 如果用户关闭通知（点击"关闭"），**24 小时内不再显示**（避免过度打扰）

2. **复习锁定机制**：

   - ✅ **锁定提示位置**：
     - **主要位置**：单词集选择界面（`WordSetSelector.tsx`），其他课程复习按钮显示为禁用状态
     - **次要位置**：复习界面顶部（显示当前锁定的课程信息）
   - ✅ **锁定解除条件**：
     - **必须完成所有单词的复习**才能解除锁定
     - **支持中途退出**：用户可以关闭复习界面，但锁定状态保持，下次打开应用时继续显示锁定提示
   - ✅ **退出处理**：
     - 如果用户在复习过程中关闭应用，**下次打开应用时**：
       1. 检查是否有未完成的复习（通过 `activeReviewLock` 状态）
       2. 如果有，显示提示："您有未完成的复习，是否继续？"
       3. 用户可以选择继续或取消（取消后解除锁定，但复习进度保留）

3. **复习进度显示**：

   - ✅ **进度展示位置**：
     - **单词集管理页面**（`WordSetsManage.tsx`）：显示每个单词集的复习进度
     - **Study 页面**：如果有复习计划，显示简要进度（如"3/8 次复习已完成"）
   - ✅ **进度可视化**：
     - **主要展示**：阶段标识（"第 3/8 次复习"）+ 进度条（8 个阶段，已完成阶段高亮）
     - **次要展示**：下次复习时间倒计时（如"2 天后进行第 4 次复习"）
     - **完成状态**：8 次全部完成后，显示"✅ 复习完成"徽章

4. **多课程复习冲突**：
   - ✅ **队列显示**：
     - **同时显示所有通知**，但按时间顺序排列
     - 第一个通知（当前需要复习的课程）：高亮显示，显示"立即复习"按钮
     - 后续通知（排队等待的课程）：灰色显示，显示"预计复习时间"和"排队中"标识
   - ❌ **用户选择跳过**：**不允许跳过当前复习**，必须按顺序完成（这是产品核心设计，确保复习效果）
   - 📝 **例外情况**：如果当前复习已超过 7 天未完成，系统可以提示用户是否放弃当前复习，开始新的复习（需要用户明确确认）

---

#### 📋 给数据库设计专家的任务

**任务**：回复请求 1 - ReviewPlans 表设计确认

**优先级**：P0（阻塞任务 2.1.1 的实现）  
**截止时间**：2024-12-20

**需要确认的关键点**：

1. **表结构设计**：

   - 确认是否需要新增 `reviewPlans` 表（产品经理建议：**需要**，因为复习计划是单词集级别的，而非单词级别）
   - 确认表结构设计（参考 Code Implementation Expert 的建议方案）
   - 确认字段类型和约束

2. **索引设计**：

   - 必须支持按 `nextReviewAt` 查询到期的复习（用于通知机制）
   - 必须支持按 `wordSetId` 查询特定单词集的复习计划
   - 建议添加复合索引：`[wordSetId, reviewStage]`（用于查询特定阶段的复习）

3. **数据迁移策略**：

   - 为所有现有单词集创建初始复习计划（`reviewStage = 1`, `nextReviewAt = 学习时间 + 1小时`）
   - 确保迁移过程不影响现有数据

4. **与现有表的关系**：
   - `reviewPlans` 与 `wordSets` 的关系：一对多（一个单词集对应一个复习计划）
   - `reviewPlans` 与 `wordProgress` 的关系：通过 `wordSetId` 关联，无需外键约束（IndexedDB 不支持）

**产品经理建议**：

- ✅ 使用 `reviewPlans` 表管理复习计划（符合 SRP 原则）
- ✅ 主键使用自增 `id`，`wordSetId` 添加唯一索引
- ✅ 索引设计：`wordSetId`（唯一）、`nextReviewAt`、`[wordSetId, reviewStage]`（复合）

---

#### 📋 给系统架构师的任务

**任务**：回复请求 3 - 技术实现方案确认

**优先级**：P1（影响代码质量和可维护性）  
**截止时间**：2024-12-21

**需要确认的关键点**：

1. **组件复用策略**：

   - 产品经理建议：**创建基础组件 `BaseStudy.tsx`**，包含通用的学习逻辑（单词加载、进度跟踪、统计更新等）
   - `FlashcardStudy.tsx`、`TestStudy.tsx`、`ReviewStudy.tsx` 通过组合方式使用基础组件
   - 避免继承，使用组合模式（更灵活，符合 React 最佳实践）

2. **状态管理**：

   - 复习锁定状态：**存储在 `UserSettings` 中**（符合现有架构，无需引入新的状态管理方案）
   - 测试会话状态：**需要支持会话恢复**（与闪卡模式保持一致的用户体验）
   - 建议：在 `UserSettings` 中添加 `testSessionState` 和 `reviewSessionState` 字段（参考 `flashcardSessionState`）

3. **性能优化**：

   - 复习通知检查频率：**每分钟检查一次**，但使用 `requestIdleCallback` 优化（避免阻塞主线程）
   - 单词列表加载：**暂不需要虚拟滚动**（v1.0 版本），如果后续发现性能问题再优化
   - 建议：使用 `React.memo` 优化组件渲染，使用 `useMemo` 优化计算

4. **错误处理**：
   - 数据库操作失败：使用统一的错误处理机制（参考任务 A2）
   - PWA 离线场景：**所有数据存储在本地 IndexedDB**，无需网络同步（v1.0 版本）

**产品经理建议**：

- ✅ 优先使用现有架构模式，避免过度设计
- ✅ 关注用户体验，确保功能稳定可靠
- ✅ 为后续扩展预留接口，但不要过早优化

---

#### 📋 给代码实现专家的指导

**任务**：开始实现测试模式和复习模式功能

**优先级**：P0  
**开始时间**：收到数据库设计专家和系统架构师的回复后

**实施顺序**：

1. **第一阶段：测试模式开发**（预计 2 周）

   - ✅ 等待系统架构师确认组件复用策略后，开始实现 `TestStudy.tsx`
   - ✅ 按照已确认的交互细节实现功能
   - ✅ 重点关注用户体验和错误处理

2. **第二阶段：复习模式开发**（预计 3 周）
   - ✅ 等待数据库设计专家确认 `reviewPlans` 表设计后，开始实现数据库扩展
   - ✅ 按照已确认的交互细节实现功能
   - ✅ 重点关注复习通知和锁定机制的用户体验

**关键提醒**：

1. **用户体验优先**：所有功能都要考虑用户体验，确保交互流畅自然
2. **错误处理完善**：所有异步操作都要有完善的错误处理和用户提示
3. **数据一致性**：确保所有数据操作都保持一致性，避免数据丢失
4. **性能考虑**：关注性能，但不要过早优化，先确保功能正确
5. **代码质量**：遵循现有代码规范，保持代码可读性和可维护性

**需要协助时**：

- 如有任何疑问或需要进一步确认，请及时在协作记录中提出
- 产品经理会定期检查进度，提供支持

---

### 2024-12-19 14:30 - 高级产品经理 - 任务分配

#### 📋 给数据库设计专家的任务

**任务**：回复请求 1 - ReviewPlans 表设计确认

**优先级**：P0（阻塞任务 2.1.1 的实现）  
**截止时间**：2024-12-20

（任务详情见上方内容）

---

#### 📋 给系统架构师的任务

**任务**：回复请求 3 - 技术实现方案确认

**优先级**：P1（影响代码质量和可维护性）  
**截止时间**：2024-12-21

（任务详情见上方内容）

---

#### 📋 给代码实现专家的指导

**任务**：开始实现测试模式和复习模式功能

**优先级**：P0  
**开始时间**：收到数据库设计专家和系统架构师的回复后

（实施顺序和关键提醒见上方内容）

---

**文档维护记录**：

- **2024-12-19 10:00 - 代码实现专家**：创建协作请求部分
- **2024-12-19 14:30 - 高级产品经理**：回复协作请求，分配任务给各角色
- **最后更新时间**：2024-12-19 14:30
- **文档维护者**：产品团队

---

## 🗄️ 七、数据库设计方案（Database Design Expert）

> **说明**：本章节由数据库设计专家（Database Design Expert）提供，包含数据库架构优化、表结构设计、索引策略、性能优化等专业方案。  
> **实施者**：Code Implementation Expert 需要根据本章节的方案进行代码实现。  
> **协作角色**：如需要系统架构师、高级产品经理等角色协助，会在相应任务中明确标注。

---

### 2024-12-19 15:00 - 数据库设计专家 - 方案提供

#### 7.1 当前数据库架构评估

##### 任务 7.1.1：数据库架构全面评估

**优先级**：P0（基础评估）  
**状态**：待实施  
**预计工时**：4 小时  
**实施者**：Code Implementation Expert  
**协作角色**：系统架构师（协助性能分析工具设计）

**需求描述**：

- 对当前 v3 数据库架构进行全面评估
- 分析各表的索引使用情况和查询性能
- 识别潜在的数据一致性问题
- 评估数据增长对性能的影响

**数据库设计专家方案**：

**当前架构优点**：

1. ✅ 表结构职责分离清晰（SRP 原则）
   - `userSettings`: 用户配置（单行表）
   - `dailyStats`: 每日统计聚合
   - `studySessions`: 会话级统计
   - `wordProgress`: 单词级进度（核心调度表）
   - `reviewLogs`: 明细日志（审计追踪）
2. ✅ 索引设计覆盖主要查询路径
3. ✅ 支持版本化迁移，向后兼容性好

**当前架构问题**：

1. ⚠️ `wordProgress` 表索引过多（13 个索引字段），可能影响写入性能
2. ⚠️ `wordProgress.setId` 与 `words.setId` 存在数据冗余，需要保证一致性
3. ⚠️ `reviewLogs` 表会无限增长，缺少归档策略
4. ⚠️ 缺少复习计划表（`reviewPlans`），无法支持艾宾浩斯遗忘曲线
5. ⚠️ `userSettings` 中存储 `flashcardSessionState` 可能造成数据膨胀

**技术实现要点**：

- 创建数据库性能分析工具函数：
  ```typescript
  // src/utils/dbAnalyzer.ts
  export async function analyzeDatabasePerformance() {
    // 1. 统计各表记录数
    // 2. 分析索引使用情况
    // 3. 检测数据一致性（wordProgress.setId vs words.setId）
    // 4. 评估查询性能
    // 5. 生成分析报告
  }
  ```
- 实现数据一致性检查函数：
  ```typescript
  export async function checkDataConsistency(): Promise<ConsistencyReport> {
    // 检查 wordProgress.setId 与 words.setId 是否一致
    // 检查 wordProgress.wordId 是否都在 words 中存在
    // 检查孤立记录（orphan records）
  }
  ```

**验收标准**：

- [ ] 完成数据库架构评估报告
- [ ] 识别所有潜在问题和优化点
- [ ] 提供性能基准数据
- [ ] 数据一致性检查工具可用

---

##### 任务 7.2.1：添加复习计划表（ReviewPlans）

**优先级**：P0（核心功能依赖）  
**状态**：待实施  
**预计工时**：6 小时  
**实施者**：Code Implementation Expert  
**协作角色**：高级产品经理（确认业务逻辑）、系统架构师（确认架构设计）

**需求描述**：

- 为支持艾宾浩斯遗忘曲线复习功能，需要新增 `reviewPlans` 表
- 每个单词集（wordSet）对应一个复习计划
- 支持 8 个复习阶段的进度跟踪

**数据库设计专家方案**：

**表结构设计**：

```typescript
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
```

**索引设计**：

- 主键：`++id`（自增）
- 单列索引：
  - `wordSetId`：按单词集查询（高频）- **建议添加唯一约束**
  - `nextReviewAt`：查询到期复习计划（高频）
  - `reviewStage`：按阶段筛选
  - `isCompleted`：过滤已完成计划
- 复合索引：
  - `[wordSetId+reviewStage]`：按单词集和阶段联合查询
  - `[nextReviewAt+isCompleted]`：查询未完成的到期计划（最高频）

**迁移逻辑（v4.upgrade）**：

```typescript
this.version(4)
  .stores({
    // ... 保留所有现有表
    reviewPlans:
      "++id, wordSetId, reviewStage, nextReviewAt, isCompleted, [wordSetId+reviewStage], [nextReviewAt+isCompleted]",
  })
  .upgrade(async (trans) => {
    // 1. 为所有现有单词集创建初始复习计划
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
```

**数据一致性保证**：

- 当单词集被删除时，需要级联删除对应的复习计划（在业务层实现）
- 当单词集名称更新时，复习计划无需更新（只关联 ID）
- 定期检查 `reviewPlans.wordSetId` 是否都在 `wordSets` 中存在

**技术实现要点**：

- 在 `src/db.ts` 中添加 `ReviewPlan` 接口定义
- 在 `JpLearnDB` 类中添加 `reviewPlans` 表声明
- 实现 v4 版本升级逻辑
- 添加复习计划 CRUD 辅助函数：
  ```typescript
  // src/utils/reviewPlanHelper.ts
  export async function getReviewPlanByWordSet(
    wordSetId: number
  ): Promise<ReviewPlan | undefined>;
  export async function createReviewPlan(
    wordSetId: number
  ): Promise<ReviewPlan>;
  export async function updateReviewPlanStage(
    planId: number,
    newStage: number
  ): Promise<void>;
  export async function getDueReviewPlans(): Promise<ReviewPlan[]>;
  ```

**验收标准**：

- [ ] `reviewPlans` 表成功创建并注册
- [ ] 现有单词集自动创建初始复习计划
- [ ] 索引设计合理，查询性能良好
- [ ] 数据迁移逻辑正确，无数据丢失

---

##### 任务 7.2.2：优化 userSettings 表结构

**优先级**：P1（性能优化）  
**状态**：待实施  
**预计工时**：3 小时  
**实施者**：Code Implementation Expert  
**协作角色**：系统架构师（确认状态管理方案）

**需求描述**：

- `userSettings` 表中存储 `flashcardSessionState` 可能导致数据膨胀
- 会话状态应该独立存储，避免影响用户设置的读取性能

**数据库设计专家方案**：

**问题分析**：

- `flashcardSessionState` 是一个较大的对象，频繁更新会影响 `userSettings` 的写入性能
- 会话状态是临时数据，不应该与持久化配置混在一起

**优化方案**：

1. **方案 A（推荐）**：将会话状态移至独立表

   ```typescript
   export interface StudySessionState {
     id?: number;
     userId: number; // 固定为 1（当前单用户）
     mode: StudyMode;
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
     createdAt?: string;
     updatedAt?: string;
   }
   ```

   - 表名：`studySessionStates`
   - 主键：`++id`
   - 索引：`userId, mode, [userId+mode]`
   - 优点：职责分离，性能更好，支持多会话历史

2. **方案 B（简化）**：使用 IndexedDB 的独立对象存储
   - 在 `userSettings` 中只存储会话状态的引用 ID
   - 会话状态存储在独立的键值对中

**推荐实现（方案 A）**：

```typescript
// v4 升级逻辑中添加
this.version(4)
  .stores({
    // ... 现有表
    studySessionStates: "++id, userId, mode, [userId+mode]",
  })
  .upgrade(async (trans) => {
    // 迁移现有 flashcardSessionState 到新表
    const settingsTable = trans.table("userSettings");
    const sessionStatesTable = trans.table("studySessionStates");

    const settings = await settingsTable.get(1);
    if (settings?.flashcardSessionState) {
      // 保存到新表
      await sessionStatesTable.add({
        userId: 1,
        mode: "flashcard",
        ...settings.flashcardSessionState,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as StudySessionState);

      // 从 userSettings 中移除
      delete settings.flashcardSessionState;
      await settingsTable.put(settings);
    }
  });
```

**技术实现要点**：

- 在 `src/db.ts` 中添加 `StudySessionState` 接口
- 添加 `studySessionStates` 表
- 实现数据迁移逻辑
- 更新所有使用 `flashcardSessionState` 的代码

**验收标准**：

- [ ] 会话状态成功迁移到独立表
- [ ] `userSettings` 表结构优化完成
- [ ] 现有功能不受影响
- [ ] 性能测试显示读取速度提升

---

##### 任务 7.3.1：优化 wordProgress 表索引

**优先级**：P1（性能优化）  
**状态**：待实施  
**预计工时**：4 小时  
**实施者**：Code Implementation Expert

**需求描述**：

- `wordProgress` 表当前有 13 个索引字段，可能影响写入性能
- 需要分析实际查询模式，优化索引策略

**数据库设计专家方案**：

**当前索引分析**：

```typescript
wordProgress: "wordId, setId, nextReviewAt, easeFactor, intervalDays, repetitions, lastReviewedAt, lastResult, timesSeen, timesCorrect, correctStreak, wrongStreak, difficulty, averageResponseTime";
```

**高频查询模式分析**：

1. **按单词集查询**：`where('setId').equals(setId)` - 需要 `setId` 索引 ✅
2. **查询到期复习单词**：`where('nextReviewAt').belowOrEqual(now)` - 需要 `nextReviewAt` 索引 ✅
3. **按单词 ID 查询**：`get(wordId)` - 主键查询，无需额外索引 ✅
4. **排序查询**（闪卡/复习模式）：
   - 按 `wrongStreak` 降序
   - 按 `timesCorrect` 升序
   - 按 `easeFactor` 升序
   - 这些字段**不需要单独索引**（Dexie 不支持排序索引，需要应用层排序）

**优化方案**：

```typescript
// 优化后的索引定义（只保留高频查询字段）
wordProgress: "wordId, setId, nextReviewAt, [setId+nextReviewAt], [setId+lastReviewedAt]";
```

**索引说明**：

- `wordId`：主键（必需）
- `setId`：按单词集筛选（高频）
- `nextReviewAt`：查询到期单词（最高频）
- `[setId+nextReviewAt]`：复合索引，用于"查询某单词集中到期的单词"（最高频复合查询）
- `[setId+lastReviewedAt]`：复合索引，用于"查询某单词集最近复习的单词"（统计查询）

**移除的索引**（改为应用层处理）：

- `easeFactor`, `intervalDays`, `repetitions`：很少单独查询，主要用于排序
- `lastReviewedAt`, `lastResult`：查询频率低
- `timesSeen`, `timesCorrect`, `correctStreak`, `wrongStreak`：主要用于排序，不需要索引
- `difficulty`：查询频率低
- `averageResponseTime`：主要用于统计，不需要索引

**技术实现要点**：

- 在 v4 升级中更新索引定义
- 验证所有查询逻辑仍然正常工作
- 性能测试：对比优化前后的写入和查询性能

**验收标准**：

- [ ] 索引优化完成，写入性能提升
- [ ] 所有现有查询功能正常
- [ ] 性能测试报告显示优化效果

---

##### 任务 7.3.2：优化 reviewLogs 表索引

**优先级**：P2（性能优化）  
**状态**：待实施  
**预计工时**：2 小时  
**实施者**：Code Implementation Expert

**需求描述**：

- `reviewLogs` 表会持续增长，需要优化索引以支持高效查询
- 主要查询模式：按单词 ID 查询历史记录、按时间范围查询

**数据库设计专家方案**：

**当前索引**：

```typescript
reviewLogs: "++id, wordId, timestamp, mode, result, grade, nextReviewAt, responseTime";
```

**查询模式分析**：

1. **按单词查询历史**：`where('wordId').equals(wordId).sortBy('timestamp')` - 需要 `wordId` 和 `timestamp` ✅
2. **按时间范围查询**：`where('timestamp').between(start, end)` - 需要 `timestamp` ✅
3. **按模式统计**：`where('mode').equals(mode)` - 需要 `mode` ✅
4. **复合查询**：按单词+模式查询 - 需要复合索引

**优化方案**：

```typescript
reviewLogs: "++id, wordId, timestamp, mode, [wordId+timestamp], [mode+timestamp]";
```

**索引说明**：

- `++id`：主键（必需）
- `wordId`：按单词查询历史（高频）
- `timestamp`：按时间范围查询（高频）
- `[wordId+timestamp]`：复合索引，用于"查询某单词的历史记录并按时间排序"（最高频）
- `[mode+timestamp]`：复合索引，用于"按模式统计并按时间排序"（统计查询）

**移除的索引**：

- `result`, `grade`, `nextReviewAt`, `responseTime`：查询频率低，主要用于过滤，不需要索引

**技术实现要点**：

- 在 v4 升级中更新索引定义
- 验证历史记录查询性能

**验收标准**：

- [ ] 索引优化完成
- [ ] 历史记录查询性能良好
- [ ] 数据归档功能不受影响

---

##### 任务 7.4.1：实现数据一致性检查与修复

**优先级**：P1（数据完整性）  
**状态**：待实施  
**预计工时**：6 小时  
**实施者**：Code Implementation Expert  
**协作角色**：高级产品经理（确认修复策略的用户体验）

**需求描述**：

- 确保 `wordProgress.setId` 与 `words.setId` 保持一致
- 确保 `wordProgress.wordId` 对应的单词都存在
- 确保 `reviewPlans.wordSetId` 对应的单词集都存在
- 提供自动修复功能

**数据库设计专家方案**：

**一致性规则**：

1. **外键一致性**（逻辑外键，IndexedDB 不支持真正的外键）：

   - `wordProgress.wordId` → `words.id`（必须存在）
   - `wordProgress.setId` → `wordSets.id`（必须存在）
   - `reviewPlans.wordSetId` → `wordSets.id`（必须存在）
   - `reviewLogs.wordId` → `words.id`（必须存在）
   - `studySessions` 中的 `wordSetId`（如果存在）→ `wordSets.id`

2. **数据冗余一致性**：
   - `wordProgress.setId` 必须与 `words.setId` 一致
   - `reviewPlans.totalWords` 必须与实际的单词数一致

**实现方案**：

```typescript
// src/utils/dataConsistency.ts
export interface ConsistencyCheckResult {
  isValid: boolean;
  issues: ConsistencyIssue[];
  fixedCount: number;
}

export interface ConsistencyIssue {
  type:
    | "orphan_record"
    | "mismatched_setId"
    | "missing_reference"
    | "count_mismatch";
  table: string;
  recordId: number | string;
  description: string;
  severity: "error" | "warning";
}

export async function checkDataConsistency(): Promise<ConsistencyCheckResult> {
  const issues: ConsistencyIssue[] = [];

  // 1. 检查 wordProgress 的孤立记录
  const allWordProgress = await db.wordProgress.toArray();
  const allWordIds = new Set((await db.words.toArray()).map((w) => w.id));

  for (const progress of allWordProgress) {
    // 检查 wordId 是否存在
    if (!allWordIds.has(progress.wordId)) {
      issues.push({
        type: "orphan_record",
        table: "wordProgress",
        recordId: progress.wordId,
        description: `wordProgress.wordId=${progress.wordId} 对应的单词不存在`,
        severity: "error",
      });
    }

    // 检查 setId 一致性
    const word = await db.words.get(progress.wordId);
    if (word && word.setId !== progress.setId) {
      issues.push({
        type: "mismatched_setId",
        table: "wordProgress",
        recordId: progress.wordId,
        description: `wordProgress.setId=${progress.setId} 与 words.setId=${word.setId} 不一致`,
        severity: "error",
      });
    }
  }

  // 2. 检查 reviewPlans 的孤立记录
  const allReviewPlans = await db.reviewPlans.toArray();
  const allWordSetIds = new Set(
    (await db.wordSets.toArray()).map((ws) => ws.id)
  );

  for (const plan of allReviewPlans) {
    if (!allWordSetIds.has(plan.wordSetId)) {
      issues.push({
        type: "orphan_record",
        table: "reviewPlans",
        recordId: plan.id!,
        description: `reviewPlans.wordSetId=${plan.wordSetId} 对应的单词集不存在`,
        severity: "error",
      });
    }

    // 检查 totalWords 一致性
    const actualCount = await db.words
      .where("setId")
      .equals(plan.wordSetId)
      .count();
    if (plan.totalWords !== actualCount) {
      issues.push({
        type: "count_mismatch",
        table: "reviewPlans",
        recordId: plan.id!,
        description: `reviewPlans.totalWords=${plan.totalWords} 与实际单词数=${actualCount} 不一致`,
        severity: "warning",
      });
    }
  }

  // 3. 检查 reviewLogs 的孤立记录
  const allReviewLogs = await db.reviewLogs.toArray();
  for (const log of allReviewLogs) {
    if (!allWordIds.has(log.wordId)) {
      issues.push({
        type: "orphan_record",
        table: "reviewLogs",
        recordId: log.id!,
        description: `reviewLogs.wordId=${log.wordId} 对应的单词不存在`,
        severity: "error",
      });
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    fixedCount: 0,
  };
}

export async function fixDataConsistency(): Promise<ConsistencyCheckResult> {
  const checkResult = await checkDataConsistency();
  let fixedCount = 0;

  // 自动修复逻辑
  for (const issue of checkResult.issues) {
    if (issue.type === "mismatched_setId" && issue.table === "wordProgress") {
      // 修复 setId 不一致
      const word = await db.words.get(issue.recordId as number);
      if (word) {
        await db.wordProgress.update(issue.recordId as number, {
          setId: word.setId,
        });
        fixedCount++;
      }
    } else if (
      issue.type === "count_mismatch" &&
      issue.table === "reviewPlans"
    ) {
      // 修复 totalWords 不一致
      const plan = await db.reviewPlans.get(issue.recordId as number);
      if (plan) {
        const actualCount = await db.words
          .where("setId")
          .equals(plan.wordSetId)
          .count();
        await db.reviewPlans.update(issue.recordId as number, {
          totalWords: actualCount,
        });
        fixedCount++;
      }
    }
    // 注意：孤立记录（orphan_record）需要用户确认后删除，不自动修复
  }

  return {
    ...checkResult,
    fixedCount,
  };
}
```

**技术实现要点**：

- 创建 `src/utils/dataConsistency.ts` 文件
- 实现一致性检查函数
- 实现自动修复函数（仅修复安全的问题）
- 在设置页面添加"数据完整性检查"功能
- 定期（如应用启动时）执行轻量级检查

**验收标准**：

- [ ] 一致性检查工具可用
- [ ] 能够检测所有类型的数据不一致问题
- [ ] 自动修复功能安全可靠
- [ ] 用户界面友好，支持手动触发检查

---

##### 任务 7.5.1：实现 reviewLogs 数据归档

**优先级**：P2（长期优化）  
**状态**：待实施  
**预计工时**：8 小时  
**实施者**：Code Implementation Expert  
**协作角色**：高级产品经理（确认归档策略的用户体验）

**需求描述**：

- `reviewLogs` 表会无限增长，需要实现归档策略
- 保留最近 N 天的详细日志，更早的数据归档或删除
- 支持按需导出历史数据

**数据库设计专家方案**：

**归档策略**：

1. **保留策略**：

   - 最近 90 天：完整保留
   - 90-365 天：按天聚合（只保留统计信息）
   - 365 天以上：可选删除或导出后删除

2. **聚合数据表**：
   ```typescript
   export interface ReviewLogSummary {
     date: string; // YYYY-MM-DD
     wordId: number;
     totalReviews: number; // 当日总复习次数
     correctCount: number; // 当日答对次数
     wrongCount: number; // 当日答错次数
     averageResponseTime?: number; // 平均答题时间
     lastReviewAt: string; // 最后一次复习时间
     createdAt?: string;
   }
   ```

**实现方案**：

```typescript
// src/utils/dataArchiver.ts
export async function archiveReviewLogs(
  olderThanDays: number = 90
): Promise<ArchiveResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffISO = cutoffDate.toISOString();

  // 1. 查询需要归档的记录
  const logsToArchive = await db.reviewLogs
    .where("timestamp")
    .below(cutoffISO)
    .toArray();

  if (logsToArchive.length === 0) {
    return { archivedCount: 0, deletedCount: 0 };
  }

  // 2. 按日期和单词ID聚合
  const summaryMap = new Map<string, ReviewLogSummary>();

  for (const log of logsToArchive) {
    const date = log.timestamp.split("T")[0]; // YYYY-MM-DD
    const key = `${date}_${log.wordId}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        date,
        wordId: log.wordId,
        totalReviews: 0,
        correctCount: 0,
        wrongCount: 0,
        lastReviewAt: log.timestamp,
        createdAt: new Date().toISOString(),
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalReviews++;
    if (log.result === "correct") summary.correctCount++;
    if (log.result === "wrong") summary.wrongCount++;
    if (log.responseTime) {
      // 计算平均答题时间（简化版）
      summary.averageResponseTime = summary.averageResponseTime
        ? (summary.averageResponseTime + log.responseTime) / 2
        : log.responseTime;
    }
    if (log.timestamp > summary.lastReviewAt) {
      summary.lastReviewAt = log.timestamp;
    }
  }

  // 3. 保存聚合数据到新表（如果存在）或导出
  const summaries = Array.from(summaryMap.values());

  // 4. 删除原始日志记录
  const idsToDelete = logsToArchive
    .map((log) => log.id!)
    .filter((id) => id !== undefined);
  await db.reviewLogs.bulkDelete(idsToDelete);

  return {
    archivedCount: summaries.length,
    deletedCount: logsToArchive.length,
    summaries, // 返回聚合数据，可用于导出
  };
}
```

**技术实现要点**：

- 创建 `src/utils/dataArchiver.ts` 文件
- 实现归档函数
- 在设置页面添加"数据归档"功能（用户手动触发）
- 可选：实现自动归档（应用启动时检查）
- 支持导出归档数据为 JSON/CSV

**验收标准**：

- [ ] 归档功能可用
- [ ] 归档后数据正确聚合
- [ ] 原始日志正确删除
- [ ] 支持数据导出
- [ ] 性能测试：归档大量数据时不影响用户体验

---

##### 任务 7.6.1：实现查询缓存机制

**优先级**：P2（性能优化）  
**状态**：待实施  
**预计工时**：6 小时  
**实施者**：Code Implementation Expert  
**协作角色**：系统架构师（确认缓存策略）

**需求描述**：

- 对于频繁查询的数据（如用户设置、单词集列表），实现内存缓存
- 减少数据库读取次数，提升响应速度

**数据库设计专家方案**：

**缓存策略**：

1. **缓存对象**：

   - `userSettings`（单行，变更频率低）
   - `wordSets` 列表（变更频率低）
   - 当前单词集的 `words` 列表（会话期间）

2. **缓存失效机制**：
   - 写入时自动失效
   - 手动刷新接口
   - 应用启动时清空缓存

**实现方案**：

```typescript
// src/utils/queryCache.ts
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟过期

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

// 缓存装饰器函数
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const cached = queryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await queryFn();
  queryCache.set(key, data);
  return data;
}

// 使用示例
export async function getCachedUserSettings(): Promise<UserSettings> {
  return cachedQuery("userSettings", async () => {
    return (await db.userSettings.get(1)) || createDefaultSettings();
  });
}
```

**技术实现要点**：

- 创建 `src/utils/queryCache.ts` 文件
- 实现缓存类
- 在数据写入操作后自动失效相关缓存
- 在关键查询函数中使用缓存

**验收标准**：

- [ ] 缓存机制可用
- [ ] 缓存失效逻辑正确
- [ ] 性能测试显示查询速度提升
- [ ] 内存使用合理

---

##### 任务 7.7.1：实现数据导出/导入功能

**优先级**：P1（数据安全）  
**状态**：待实施  
**预计工时**：8 小时  
**实施者**：Code Implementation Expert  
**协作角色**：高级产品经理（确认导入/导出功能的用户体验）

**需求描述**：

- 支持导出所有数据为 JSON 文件
- 支持从 JSON 文件导入数据
- 支持选择性导入（如只导入单词，不导入进度）

**数据库设计专家方案**：

**导出格式**：

```typescript
export interface DatabaseExport {
  version: string; // 数据库版本
  exportDate: string; // ISO 格式
  data: {
    wordSets: WordSet[];
    words: Word[];
    userSettings: UserSettings;
    wordProgress: WordProgress[];
    dailyStats: DailyStat[];
    studySessions: StudySession[];
    reviewLogs: ReviewLog[];
    reviewPlans: ReviewPlan[];
  };
}
```

**实现方案**：

```typescript
// src/utils/dbExportImport.ts
export async function exportDatabase(): Promise<string> {
  const data: DatabaseExport = {
    version: "4",
    exportDate: new Date().toISOString(),
    data: {
      wordSets: await db.wordSets.toArray(),
      words: await db.words.toArray(),
      userSettings: await db.userSettings.toArray(),
      wordProgress: await db.wordProgress.toArray(),
      dailyStats: await db.dailyStats.toArray(),
      studySessions: await db.studySessions.toArray(),
      reviewLogs: await db.reviewLogs.toArray(),
      reviewPlans: await db.reviewPlans.toArray(),
    },
  };

  return JSON.stringify(data, null, 2);
}

export async function importDatabase(
  jsonData: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const exportData: DatabaseExport = JSON.parse(jsonData);
  const result: ImportResult = {
    imported: { wordSets: 0, words: 0 /* ... */ },
    errors: [],
  };

  // 根据选项选择性导入
  if (options.importWordSets !== false) {
    await db.wordSets.bulkPut(exportData.data.wordSets);
    result.imported.wordSets = exportData.data.wordSets.length;
  }

  // ... 其他表的导入逻辑

  return result;
}
```

**技术实现要点**：

- 创建 `src/utils/dbExportImport.ts` 文件
- 实现导出函数
- 实现导入函数（支持选择性导入）
- 在设置页面添加"导出数据"和"导入数据"功能
- 添加数据验证和错误处理

**验收标准**：

- [ ] 导出功能可用，生成正确的 JSON 文件
- [ ] 导入功能可用，数据正确恢复
- [ ] 支持选择性导入
- [ ] 错误处理完善
- [ ] 支持大文件导入（分块处理）

---

### 2024-12-19 15:00 - 数据库设计专家 - 方案总结

#### 📋 数据库设计方案总结

**实施优先级**：

**P0（必须实施）**：

- 任务 7.2.1：添加复习计划表（ReviewPlans）- 核心功能依赖
- 任务 7.1.1：数据库架构全面评估 - 基础评估

**P1（重要优化）**：

- 任务 7.2.2：优化 userSettings 表结构
- 任务 7.3.1：优化 wordProgress 表索引
- 任务 7.4.1：实现数据一致性检查与修复
- 任务 7.7.1：实现数据导出/导入功能

**P2（性能优化）**：

- 任务 7.3.2：优化 reviewLogs 表索引
- 任务 7.5.1：实现 reviewLogs 数据归档
- 任务 7.6.1：实现查询缓存机制

**实施建议**：

1. **第一阶段**：实施 P0 任务，确保核心功能所需的数据结构就绪
2. **第二阶段**：实施 P1 任务，优化性能和保证数据完整性
3. **第三阶段**：实施 P2 任务，进一步提升性能和用户体验

**注意事项**：

1. **数据迁移**：所有 Schema 变更都需要完整的迁移逻辑，确保现有用户数据不丢失
2. **向后兼容**：新版本数据库应该能够兼容旧版本的数据结构
3. **性能测试**：每次优化后都需要进行性能测试，确保优化有效
4. **错误处理**：所有数据库操作都需要完善的错误处理和用户提示
5. **文档更新**：Schema 变更后需要更新 `dbIntruduce.md` 文档

---

### 2024-12-19 15:00 - 数据库设计专家 - 协作请求

#### 📝 给 Code Implementation Expert 的说明

**亲爱的 Code Implementation Expert：**

本章节（第七章）包含了数据库设计专家提供的完整数据库设计方案。请按照以下步骤实施：

1. **优先实施 P0 任务**：

   - 任务 7.2.1（添加复习计划表）是核心功能依赖，必须优先实施
   - 任务 7.1.1（数据库架构评估）可以帮助你了解当前数据库状态

2. **协作沟通**：

   - 如果任务中标注了需要其他角色协助（如系统架构师、高级产品经理），请先与他们确认相关细节
   - 如有任何疑问，可以在协作记录中提出

3. **实施顺序**：

   - 建议按照优先级（P0 → P1 → P2）逐步实施
   - 每个任务完成后，请更新状态为"已完成"

4. **代码规范**：

   - 遵循项目现有的代码规范
   - 所有新增函数都需要添加 TypeScript 类型定义
   - 添加必要的注释（中文）

5. **测试验证**：
   - 每个任务完成后，请进行充分测试
   - 确保数据迁移逻辑正确，不会丢失用户数据

**祝你实施顺利！** 🚀

---

#### 📝 给其他角色的协作请求

**给系统架构师的请求**：

- **任务 7.1.1**：需要您协助设计数据库性能分析工具的整体架构
- **任务 7.2.2**：需要您确认会话状态管理的架构方案（独立表 vs 现有方案）
- **任务 7.6.1**：需要您确认查询缓存策略是否符合整体架构

**给高级产品经理的请求**：

- **任务 7.2.1**：需要您确认复习计划表的业务逻辑是否符合产品需求
- **任务 7.4.1**：需要您确认数据一致性修复的用户体验（是否自动修复，还是需要用户确认）
- **任务 7.5.1**：需要您确认数据归档策略的用户体验（归档时机、用户提示等）
- **任务 7.7.1**：需要您确认数据导入/导出功能的用户体验（界面设计、操作流程等）

---

**文档维护记录更新**：

- **2024-12-19 10:00 - 代码实现专家**：创建协作请求部分
- **2024-12-19 14:30 - 高级产品经理**：回复协作请求，分配任务给各角色
- **2024-12-19 15:00 - 数据库设计专家**：提供完整的数据库设计方案（第七章）
- **最后更新时间**：2024-12-19 15:00
- **文档维护者**：产品团队
