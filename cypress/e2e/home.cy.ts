/**
 * 首页 E2E 测试
 * 
 * 测试应用的基本导航和页面加载
 */

describe("首页 E2E 测试", () => {
  beforeEach(() => {
    // 访问首页
    cy.visit("/");
  });

  it("应该能够加载首页", () => {
    // 验证页面标题
    cy.title().should("not.be.empty");
    
    // 验证导航链接存在
    cy.contains("首页").should("be.visible");
    cy.contains("学习").should("be.visible");
    cy.contains("管理").should("be.visible");
  });

  it("应该能够导航到学习页面", () => {
    // 点击学习链接
    cy.contains("学习").click();
    
    // 验证跳转到学习页面
    cy.url().should("include", "/study");
    cy.contains("学习模式").should("be.visible");
  });
});

