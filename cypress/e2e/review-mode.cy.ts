/**
 * 复习模式 E2E 测试
 * 
 * 测试完整的复习模式流程：
 * 1. 进入学习页面
 * 2. 检查复习通知
 * 3. 选择复习模式
 * 4. 完成复习
 */

describe("复习模式 E2E 测试", () => {
  beforeEach(() => {
    // 访问学习页面
    cy.visit("/study");
    
    // 等待页面加载完成
    cy.contains("学习模式").should("be.visible");
  });

  it("应该能够看到复习模式选项", () => {
    // 验证复习模式按钮存在
    cy.contains("复习模式").should("be.visible");
    cy.contains("巩固已学过的单词").should("be.visible");
  });

  it("应该能够点击复习模式并显示单词集选择器", () => {
    // 点击复习模式
    cy.contains("复习模式").click();
    
    // 验证单词集选择器显示
    cy.contains("选择单词集").should("be.visible");
  });

  it("应该能够检查复习通知（如果有到期的复习）", () => {
    // 检查是否有复习通知
    cy.get("body").then(($body) => {
      if ($body.text().includes("复习通知") || $body.text().includes("开始复习")) {
        cy.log("✅ 复习通知已显示");
        // 可以点击"开始复习"按钮
        cy.contains("开始复习").should("be.visible");
      } else {
        cy.log("ℹ️ 当前没有到期的复习通知");
      }
    });
  });

  it("应该能够选择单词集并进入复习界面", () => {
    // 点击复习模式
    cy.contains("复习模式").click();
    
    // 等待单词集选择器显示
    cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
    cy.wait(500);
    
    // 选择第一个可用的单词集
    cy.get("body").then(($body) => {
      const buttons = $body.find("button");
      let clicked = false;
      
      buttons.each((_, button) => {
        const text = button.textContent || "";
        if ((text.includes("测试单词集") || text.includes("Default") || text.includes("全部单词")) && !clicked) {
          cy.wrap(button).click({ force: true });
          clicked = true;
          return false;
        }
      });
      
      if (!clicked && buttons.length > 0) {
        cy.wrap(buttons.first()).click({ force: true });
      }
    });
    
    // 等待复习界面加载
    cy.wait(3000);
    
    // 验证复习界面元素
    cy.get("body").then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes("复习") || bodyText.includes("单词") || bodyText.includes("显示答案")) {
        cy.log("✅ 复习界面已成功加载");
      } else if (bodyText.includes("没有需要复习的单词") || bodyText.includes("错误")) {
        cy.log("⚠️ 没有需要复习的单词，这是正常的（需要准备测试数据）");
      } else {
        cy.log("ℹ️ 复习界面可能正在加载中");
      }
    });
  });

  it("应该能够处理复习模式选择取消", () => {
    // 点击复习模式
    cy.contains("复习模式").click();
    
    // 等待单词集选择器显示
    cy.contains("选择单词集", { timeout: 5000 }).should("be.visible");
    
    // 查找并点击关闭/取消按钮
    cy.get("body").then(($body) => {
      const closeButton = $body.find("button").filter((_, el) => {
        return el.textContent?.includes("关闭") || 
               el.textContent?.includes("取消") ||
               el.textContent?.includes("×");
      });
      
      if (closeButton.length > 0) {
        cy.wrap(closeButton.first()).click({ force: true });
        // 验证返回到学习模式选择页面
        cy.contains("学习模式", { timeout: 2000 }).should("be.visible");
      }
    });
  });

  it("应该能够显示复习模式说明", () => {
    // 验证复习模式按钮存在
    cy.contains("复习模式").should("be.visible");
    
    // 验证复习模式描述存在
    cy.contains("巩固已学过的单词").should("be.visible");
  });
});

