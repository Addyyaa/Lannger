/**
 * 测试数据准备脚本
 * 用于创建测试所需的单词、单词集和复习计划
 */

import { db, ensureDBOpen, WordProgress } from "../src/db";
import { createWordSet, createWord } from "../src/store/wordStore";
import { createReviewPlan } from "../src/utils/ebbinghausCurve";

/**
 * 创建测试数据
 */
async function prepareTestData() {
  try {
    await ensureDBOpen();
    console.log("开始准备测试数据...");

    // 1. 创建测试单词集
    const testWordSetId = await createWordSet({
      name: "测试单词集",
      mark: "用于测试的单词集",
    });
    console.log(`✅ 创建测试单词集: ID ${testWordSetId}`);

    // 2. 创建测试单词
    const testWords = [
      {
        kanji: "テスト",
        kana: "てすと",
        meaning: "测试",
        type: "n5",
        setId: testWordSetId,
      },
      {
        kanji: "学習",
        kana: "がくしゅう",
        meaning: "学习",
        type: "n4",
        setId: testWordSetId,
      },
      {
        kanji: "復習",
        kana: "ふくしゅう",
        meaning: "复习",
        type: "n3",
        setId: testWordSetId,
      },
      {
        kanji: "練習",
        kana: "れんしゅう",
        meaning: "练习",
        type: "n4",
        setId: testWordSetId,
      },
      {
        kanji: "試験",
        kana: "しけん",
        meaning: "考试",
        type: "n3",
        setId: testWordSetId,
      },
    ];

    const createdWordIds: number[] = [];
    for (const word of testWords) {
      const wordId = await createWord(word);
      createdWordIds.push(wordId);
    }
    console.log(`✅ 创建 ${testWords.length} 个测试单词`);

    // 2.1 为测试单词创建 wordProgress 记录（用于测试模式）
    const now = new Date();
    for (let i = 0; i < createdWordIds.length; i++) {
      const wordId = createdWordIds[i];
      const progress: WordProgress = {
        wordId,
        setId: testWordSetId,
        easeFactor: 2.5,
        intervalDays: i % 3, // 不同的间隔天数
        repetitions: i % 2, // 不同的重复次数
        timesSeen: i + 1, // 已看过次数
        timesCorrect: Math.floor(i / 2), // 答对次数
        correctStreak: i % 3, // 连续答对次数
        wrongStreak: 0,
        fastResponseCount: 0,
        slowResponseCount: 0,
        lastResult: i % 2 === 0 ? "correct" : "wrong",
        lastMode: "flashcard",
        lastReviewedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(), // 不同的最后复习时间
        nextReviewAt: new Date(now.getTime() + i * 12 * 60 * 60 * 1000).toISOString(), // 不同的下次复习时间
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await db.wordProgress.put(progress);
    }
    console.log(`✅ 为 ${createdWordIds.length} 个单词创建了 wordProgress 记录`);

    // 3. 创建复习计划（立即到期，用于测试通知）
    const dueTime = new Date(now.getTime() - 1000); // 1秒前，确保到期

    const reviewPlan = createReviewPlan(testWordSetId, testWords.length, dueTime);
    reviewPlan.nextReviewAt = dueTime.toISOString();
    
    await db.reviewPlans.add(reviewPlan);
    console.log(`✅ 创建复习计划: 单词集 ${testWordSetId}, 阶段 ${reviewPlan.reviewStage}`);

    // 4. 创建另一个复习计划（未到期，用于测试队列）
    const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1天后
    const futureReviewPlan = createReviewPlan(testWordSetId + 1, 10, now);
    futureReviewPlan.nextReviewAt = futureTime.toISOString();
    
    // 确保单词集存在
    try {
      await db.wordSets.get(testWordSetId + 1);
    } catch {
      await createWordSet({
        name: "测试单词集2",
        mark: "第二个测试单词集",
      });
    }
    
    await db.reviewPlans.add(futureReviewPlan);
    console.log(`✅ 创建未来复习计划: 单词集 ${testWordSetId + 1}`);

    console.log("\n✅ 测试数据准备完成！");
    console.log("\n测试数据概览:");
    console.log(`- 测试单词集 ID: ${testWordSetId}`);
    console.log(`- 测试单词数量: ${testWords.length}`);
    console.log(`- 到期复习计划: 1 个`);
    console.log(`- 未来复习计划: 1 个`);

    return {
      testWordSetId,
      wordCount: testWords.length,
      reviewPlans: 2,
    };
  } catch (error) {
    console.error("❌ 准备测试数据失败:", error);
    throw error;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  prepareTestData()
    .then(() => {
      console.log("\n✅ 脚本执行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 脚本执行失败:", error);
      process.exit(1);
    });
}

export { prepareTestData };

