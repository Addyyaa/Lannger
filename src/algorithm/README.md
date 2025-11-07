# 学习算法模块

本模块提供了三种学习模式的智能调度算法，能够根据用户的学习情况和掌握程度自动调整单词出现顺序和频率。

## 模块结构

```
algorithm/
├── spacedRepetition.ts      # SM-2 间隔重复算法核心
├── progressUpdater.ts        # 单词进度更新工具
├── weightCalculator.ts       # 单词权重计算
├── flashcardScheduler.ts     # 闪卡模式调度算法
├── testScheduler.ts          # 测试模式调度算法
├── reviewScheduler.ts         # 复习模式调度算法
├── scheduler.ts              # 统一调度接口
├── index.ts                  # 统一导出
└── README.md                 # 本文档
```

## 核心功能

### 1. 间隔重复算法（SM-2）

基于 SuperMemo 2 算法，根据用户评分（0-5）动态调整复习间隔：

- **评分 0-2**：重置重复次数，缩短间隔
- **评分 3-5**：增加重复次数，延长间隔
- **易度因子（EF）**：根据答题情况自动调整
- **答题速度优化**：根据答题速度自动调整评分
  - 快速答对（< 3秒）：评分 +1（最高到 5）
  - 慢速答对（> 10秒）：评分 -1（最低到 3）
  - 慢速答错（> 10秒）：评分 -1（最低到 0）

### 2. 权重计算

根据多个因素计算单词的学习优先级：

- **紧急程度**：距离复习时间越近，权重越高
- **掌握程度**：掌握程度越低，权重越高（现在考虑了答题速度）
- **难度系数**：难度越高，权重越高
- **答题速度**：答题速度慢的单词权重更高，需要更多练习
  - 快速答题（< 3秒）：掌握程度加分，权重降低
  - 慢速答题（> 10秒）：掌握程度减分，权重提高
- **连续答错**：连续答错次数越多，权重越高
- **新单词**：从未见过的单词优先显示

### 3. 三种学习模式

#### 闪卡模式（Flashcard）

**策略**：

- 优先显示掌握程度低的单词
- 优先显示新单词（从未见过的）
- 优先显示连续答错次数多的单词
- 根据用户的学习情况动态调整出现频率

**使用示例**：

```typescript
import { scheduleFlashcardWords } from './algorithm';

const result = await scheduleFlashcardWords({
  wordSetId: 1,           // 可选：指定单词集
  limit: 50,              // 可选：返回的最大数量
  includeNewWords: true,  // 是否包含新单词
  includeReviewWords: true, // 是否包含需要复习的单词
  masteryThreshold: 0.7,  // 掌握程度阈值
});

console.log(result.wordIds); // 排序后的单词ID列表
```

#### 测试模式（Test）

**策略**：

- 优先测试掌握程度中等的单词（0.3-0.7）
- 优先测试难度较高的单词（难度 4-5）
- 根据用户的答题情况动态调整测试顺序
- 避免测试太简单或太难的单词（除非用户指定）

**使用示例**：

```typescript
import { scheduleTestWords } from './algorithm';

const result = await scheduleTestWords({
  wordSetId: 1,
  limit: 30,
  difficultyRange: [1, 5],  // 难度范围
  masteryRange: [0, 1],      // 掌握程度范围
  excludeTooEasy: true,      // 排除太简单的单词
  excludeTooHard: false,      // 是否排除太难的单词
});

console.log(result.wordIds);
console.log(result.averageDifficulty); // 平均难度
console.log(result.averageMastery);    // 平均掌握程度
```

#### 复习模式（Review）

**策略**：

- 优先复习到期的单词（nextReviewAt <= 当前时间）
- 优先复习紧急程度高的单词
- 优先复习掌握程度低的单词
- 优先复习连续答错次数多的单词
- 基于间隔重复算法（SM-2）的复习时间安排

**使用示例**：

```typescript
import { scheduleReviewWords } from './algorithm';

const result = await scheduleReviewWords({
  wordSetId: 1,
  limit: 50,
  onlyDue: true,           // 是否只返回到期的单词
  urgencyThreshold: 0.5,   // 紧急程度阈值
});

console.log(result.wordIds);
console.log(result.dueCount);    // 到期的单词数量
console.log(result.urgentCount);  // 紧急的单词数量
```

## 统一调度接口

使用统一接口，根据模式自动调用对应的调度算法：

```typescript
import { scheduleWords, getNextWord } from './algorithm';

// 调度单词
const result = await scheduleWords({
  mode: 'flashcard',  // 'flashcard' | 'test' | 'review'
  wordSetId: 1,
  limit: 50,
  flashcard: {        // 闪卡模式特定选项
    includeNewWords: true,
  },
});

// 获取下一个单词
const nextWordId = await getNextWord('flashcard', currentWordId, {
  wordSetId: 1,
  limit: 50,
});
```

## 更新单词进度

当用户完成学习后，更新单词进度：

```typescript
import { updateWordProgress } from './algorithm';

// 更新单个单词进度（包含答题速度）
const startTime = Date.now();
// ... 用户答题 ...
const responseTime = Date.now() - startTime; // 毫秒

const result = await updateWordProgress(
  wordId,
  'correct',  // 'correct' | 'wrong' | 'skip'
  'flashcard', // 学习模式
  4,          // 可选：评分 0-5（会根据答题速度自动调整）
  responseTime // 可选：答题时间（毫秒）
);

if (result.success) {
  console.log('进度已更新', result.updatedProgress);
  console.log('平均答题时间:', result.updatedProgress?.averageResponseTime, 'ms');
}
```

## 算法特点

1. **自适应学习**：根据用户的学习情况自动调整单词出现顺序和频率
2. **间隔重复**：基于 SM-2 算法，科学安排复习时间
3. **答题速度优化**：根据答题速度自动调整评分和权重，更准确地反映掌握程度
   - 快速答题表示熟悉，提高评分和掌握程度
   - 慢速答题表示需要思考，降低评分和掌握程度
4. **多维度权重**：综合考虑紧急程度、掌握程度、难度、答题速度等多个因素
5. **模式定制**：不同学习模式采用不同的调度策略
6. **可扩展性**：模块化设计，易于扩展和定制

## 注意事项

1. 所有算法函数都是异步的，需要使用 `await` 调用
2. 单词进度会在首次使用时自动创建
3. 建议在用户完成学习后及时更新进度，以获得最佳的学习效果
4. 算法会根据数据库中的 `WordProgress` 表进行计算，确保数据已正确迁移
