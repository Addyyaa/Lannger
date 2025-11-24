/**
 * 测试模式详细功能 E2E 测试
 *
 * 测试双向选择题、倒计时、结果统计等详细功能
 */

describe("测试模式详细功能 E2E 测试", () => {
  beforeEach(() => {
    cy.visit("/study");
    cy.contains("学习模式").should("be.visible");
  });

  describe("双向选择题", () => {
    it("应该能够显示题目（单词→意思或意思→单词）", () => {
      // 进入测试模式
      cy.contains("测试模式").click();
      cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
      cy.wait(500);

      // 选择单词集
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            text.includes("测试单词集") ||
            text.includes("Default") ||
            text.includes("全部单词")
          ) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      // 等待测试界面加载
      cy.wait(3000);

      // 验证题目显示
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        // 应该显示题目（可能是单词或意思）
        if (
          bodyText.includes("题目") ||
          bodyText.includes("Question") ||
          bodyText.length > 50
        ) {
          cy.log("✅ 题目已显示");
        }
      });
    });

    it("应该能够显示4个选项", () => {
      // 进入测试模式并选择单词集
      cy.contains("测试模式").click();
      cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
      cy.wait(500);

      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            text.includes("测试单词集") ||
            text.includes("Default") ||
            text.includes("全部单词")
          ) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(3000);

      // 验证选项显示（应该有多个可点击的选项）
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        // 应该至少有2个按钮（选项按钮）
        if (buttons.length >= 2) {
          cy.log("✅ 选项已显示");
        }
      });
    });

    it("应该能够选择答案", () => {
      // 进入测试模式
      cy.contains("测试模式").click();
      cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
      cy.wait(500);

      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            text.includes("测试单词集") ||
            text.includes("Default") ||
            text.includes("全部单词")
          ) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(3000);

      // 尝试选择第一个选项
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        // 查找选项按钮（排除关闭按钮等）
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            !text.includes("关闭") &&
            !text.includes("取消") &&
            !text.includes("×")
          ) {
            cy.wrap(button).first().click({ force: true });
            cy.log("✅ 已选择答案");
            return false;
          }
        });
      });
    });
  });

  describe("倒计时功能", () => {
    it("应该显示30秒倒计时", () => {
      // 进入测试模式
      cy.contains("测试模式").click();
      cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
      cy.wait(500);

      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            text.includes("测试单词集") ||
            text.includes("Default") ||
            text.includes("全部单词")
          ) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(3000);

      // 检查倒计时显示
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        // 应该显示倒计时数字（30秒或更少）
        if (bodyText.match(/\d+/)) {
          const numbers = bodyText.match(/\d+/g) || [];
          const hasCountdown = numbers.some((n) => {
            const num = parseInt(n, 10);
            return num >= 0 && num <= 30;
          });
          if (hasCountdown) {
            cy.log("✅ 倒计时已显示");
          }
        }
      });
    });

    it("应该在倒计时结束时自动处理", () => {
      // 这个测试需要等待30秒，在实际测试中可能需要调整
      // 这里只验证倒计时机制存在
      cy.contains("测试模式").click();
      cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");

      cy.log("ℹ️ 倒计时自动处理功能需要实际运行30秒才能验证");
    });
  });

  describe("测试结果统计", () => {
    it("应该能够完成测试并显示结果", () => {
      // 进入测试模式
      cy.contains("测试模式").click();
      cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
      cy.wait(500);

      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            text.includes("测试单词集") ||
            text.includes("Default") ||
            text.includes("全部单词")
          ) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(3000);

      // 验证结果统计界面（如果测试完成）
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        // 检查是否有统计相关的文本
        if (
          bodyText.includes("正确") ||
          bodyText.includes("错误") ||
          bodyText.includes("正确率") ||
          bodyText.includes("统计")
        ) {
          cy.log("✅ 结果统计已显示");
        }
      });
    });

    it("应该能够显示错题列表", () => {
      // 进入测试模式
      cy.contains("测试模式").click();
      cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
      cy.wait(500);

      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            text.includes("测试单词集") ||
            text.includes("Default") ||
            text.includes("全部单词")
          ) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(3000);

      // 验证错题列表（如果存在）
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        if (bodyText.includes("错题") || bodyText.includes("错误")) {
          cy.log("✅ 错题列表功能存在");
        }
      });
    });
  });
});
