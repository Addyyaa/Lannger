/**
 * 算法模块统一导出
 * 
 * 本模块提供了三种学习模式的调度算法：
 * 1. 闪卡模式（flashcard）：根据掌握程度调整单词出现顺序和频率
 * 2. 测试模式（test）：根据难度和掌握情况调整测试顺序
 * 3. 复习模式（review）：基于间隔重复算法的复习调度
 */

// 核心算法
export {
    calculateSM2,
    calculateNextReviewDate,
    isDueForReview,
    calculateUrgency,
    adjustGradeBySpeed,
    type Grade,
    type SM2Result,
} from "./spacedRepetition";

// 进度更新
export {
    updateWordProgress,
    batchUpdateWordProgress,
    ensureWordProgressExists,
    type UpdateProgressResult,
} from "./progressUpdater";

// 权重计算
export {
    calculateMastery,
    calculateDifficultyWeight,
    calculateSpeedWeight,
    calculateWordWeight,
    sortWordsByWeight,
    type WordWeight,
} from "./weightCalculator";

// 统一调度接口
export {
    scheduleWords,
    getNextWord,
    type SchedulerOptions,
    type SchedulerResult,
} from "./scheduler";

// 各模式调度器（也可单独使用）
export {
    scheduleFlashcardWords,
    getNextFlashcardWord,
    type FlashcardSchedulerOptions,
    type FlashcardSchedulerResult,
} from "./flashcardScheduler";

export {
    scheduleTestWords,
    getNextTestWord,
    adjustTestPriority,
    type TestSchedulerOptions,
    type TestSchedulerResult,
} from "./testScheduler";

export {
    scheduleReviewWords,
    getNextReviewWord,
    getReviewStatistics,
    type ReviewSchedulerOptions,
    type ReviewSchedulerResult,
} from "./reviewScheduler";

