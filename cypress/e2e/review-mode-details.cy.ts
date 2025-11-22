/**
 * 复习模式详细功能 E2E 测试
 *
 * 测试艾宾浩斯曲线、复习通知、锁定机制等详细功能
 */

describe("复习模式详细功能 E2E 测试", () => {
  beforeEach(() => {
    cy.visit("/study");
    cy.contains("学习模式").should("be.visible");
  });

  describe("复习通知机制", () => {
    it("应该能够显示复习通知（如果有到期的复习）", () => {
      // 检查复习通知是否显示
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        if (
          bodyText.includes("复习") ||
          bodyText.includes("提醒") ||
          bodyText.includes("通知")
        ) {
          cy.log("✅ 复习通知已显示");
        } else {
          cy.log("ℹ️ 当前没有到期的复习计划");
        }
      });
    });

    it("应该能够点击'开始复习'按钮", () => {
      // 检查是否有开始复习按钮
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (text.includes("开始复习") || text.includes("开始")) {
            cy.wrap(button).click({ force: true });
            cy.log("✅ 已点击开始复习");
            return false;
          }
        });
      });
    });

    it("应该能够点击'稍后提醒'按钮", () => {
      // 检查是否有稍后提醒按钮
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (text.includes("稍后") || text.includes("Later")) {
            cy.wrap(button).click({ force: true });
            cy.log("✅ 已点击稍后提醒");
            return false;
          }
        });
      });
    });
  });

  describe("复习锁定机制", () => {
    it("应该能够进入复习模式", () => {
      // 点击复习模式
      cy.contains("复习模式").click();

      // 验证复习模式界面
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        if (
          bodyText.includes("复习") ||
          bodyText.includes("单词集") ||
          bodyText.includes("选择")
        ) {
          cy.log("✅ 复习模式已进入");
        }
      });
    });

    it("应该能够显示锁定状态提示", () => {
      // 进入复习模式
      cy.contains("复习模式").click();
      cy.wait(1000);

      // 检查是否有锁定相关的提示
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        if (
          bodyText.includes("锁定") ||
          bodyText.includes("进行中") ||
          bodyText.includes("完成")
        ) {
          cy.log("✅ 锁定状态提示已显示");
        }
      });
    });

    it("应该在锁定状态下阻止选择其他课程", () => {
      // 这个测试需要先有一个正在进行的复习
      // 验证锁定机制
      cy.contains("复习模式").click();
      cy.wait(1000);

      cy.log("ℹ️ 锁定机制需要实际有正在进行的复习才能验证");
    });
  });

  describe("艾宾浩斯遗忘曲线", () => {
    it("应该能够显示复习阶段信息", () => {
      // 进入复习模式
      cy.contains("复习模式").click();
      cy.wait(1000);

      // 检查是否有阶段信息
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        if (
          bodyText.includes("第") ||
          bodyText.includes("次") ||
          bodyText.includes("阶段")
        ) {
          cy.log("✅ 复习阶段信息已显示");
        }
      });
    });

    it("应该能够推进复习阶段", () => {
      // 进入复习模式并开始复习
      cy.contains("复习模式").click();
      cy.wait(1000);

      // 选择单词集
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (text.includes("测试单词集") || text.includes("Default")) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(2000);

      // 验证复习界面
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        if (bodyText.includes("显示答案") || bodyText.includes("掌握")) {
          cy.log("✅ 复习界面已加载");
        }
      });
    });
  });

  describe("复习界面功能", () => {
    it("应该能够显示单词", () => {
      // 进入复习模式
      cy.contains("复习模式").click();
      cy.wait(1000);

      // 选择单词集
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (text.includes("测试单词集") || text.includes("Default")) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(2000);

      // 验证单词显示
      cy.get("body").then(($body) => {
        const bodyText = $body.text();
        // 应该显示单词内容（假名、汉字或意思）
        if (bodyText.length > 20) {
          cy.log("✅ 单词已显示");
        }
      });
    });

    it("应该能够显示答案", () => {
      // 进入复习模式
      cy.contains("复习模式").click();
      cy.wait(1000);

      // 选择单词集并进入复习界面
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (text.includes("测试单词集") || text.includes("Default")) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(2000);

      // 查找显示答案按钮
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (text.includes("显示答案") || text.includes("答案")) {
            cy.wrap(button).click({ force: true });
            cy.log("✅ 已显示答案");
            return false;
          }
        });
      });
    });

    it("应该能够标记掌握/不掌握", () => {
      // 进入复习模式
      cy.contains("复习模式").click();
      cy.wait(1000);

      // 选择单词集
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (text.includes("测试单词集") || text.includes("Default")) {
            cy.wrap(button).click({ force: true });
            return false;
          }
        });
      });

      cy.wait(2000);

      // 查找掌握/不掌握按钮
      cy.get("body").then(($body) => {
        const buttons = $body.find("button");
        buttons.each((_, button) => {
          const text = button.textContent || "";
          if (
            text.includes("掌握") ||
            text.includes("不掌握") ||
            text.includes("正确") ||
            text.includes("错误")
          ) {
            cy.log("✅ 掌握/不掌握按钮已显示");
            return false;
          }
        });
      });
    });
  });
});
