在 src/db.ts 新增并注册以下表（Dexie version(2) + 升级迁移）：
userSettings(id=1): currentMode, dailyGoal, currentStreak, longestStreak, createdAt, updatedAt
dailyStats(date=YYYY-MM-DD): learnedCount, reviewedCount, testedCount, correctCount, goal, updatedAt
studySessions(++id): date, mode, startedAt, finishedAt, studiedCount, correctCount, wrongCount, newLearnedCount
wordProgress(wordId 主键): setId, easeFactor, intervalDays, repetitions, difficulty, timesSeen, timesCorrect, correctStreak, wrongStreak, lastResult, lastMode, lastReviewedAt, nextReviewAt, createdAt, updatedAt
reviewLogs(++id): wordId, timestamp, mode, result, grade, nextReviewAt, easeFactorAfter, intervalDaysAfter
迁移逻辑（version(2).upgrade）：
自动初始化 userSettings（默认 currentMode=flashcard, dailyGoal=20, streak=0）
将现有 words 里的 review 字段迁移入 wordProgress（保留 times/difficulty/nextReview，其他参数设定为合理初始值）
今日已学习单词数量与目标/打卡
统计写入 dailyStats.learnedCount
目标存 userSettings.dailyGoal
streak 存 userSettings.currentStreak/longestStreak（按 dailyStats 达标情况更新）
当前学习模式
存 userSettings.currentMode（flashcard | test | review）
闪卡/测试/复习的“顺序与频率”动态算法
wordProgress 提供完整的间隔重复参数：easeFactor（EF）、intervalDays、repetitions、nextReviewAt、timesSeen、timesCorrect、correctStreak、wrongStreak、lastResult
reviewLogs 记录每次评分/结果，便于回放与调参
studySessions 记录每次会话总体表现，支持模式维度的统计与优化
SRP：设置、统计、调度、日志、会话分表，职责单一
DRY：单词级调度集中在 wordProgress，模式无关；日志通用表 reviewLogs
支持后续新增模式/策略，仅扩展写入点和读取索引，无需修改 words
接入建议（后续你可分阶段实现）
答题事件（任意模式）
写入 reviewLogs，并据评分/结果更新 wordProgress（EF/间隔/nextReviewAt/timesSeen/timesCorrect/streak/lastReviewedAt/lastMode）
会话开始/结束
建立/更新 studySessions，结束时汇总 studiedCount/correctCount/newLearnedCount
聚合写入 dailyStats（learnedCount/…），并根据 dailyGoal 更新 userSettings.currentStreak
取题/排序
闪卡/复习：优先 nextReviewAt 到期项，其次按 wrongStreak 高、timesCorrect 低、EF 低优先
测试：综合 difficulty、timesCorrect、correctStreak 做权重队列
说明
所有改动集中于 src/db.ts 的 schema 与类型定义；不影响现有 UI/业务调用，后续按需逐步接入这些表即可。
索引设计已覆盖高频查询（date、mode、nextReviewAt、setId 等），兼顾性能与扩展。
