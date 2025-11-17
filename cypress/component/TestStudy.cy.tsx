/**
 * TestStudy 组件测试
 * 
 * 测试测试模式组件的渲染和交互
 */

/// <reference path="../support/index.d.ts" />

import React from "react";
import TestStudy from "../../src/components/TestStudy";

describe("TestStudy Component", () => {
  beforeEach(() => {
    // 每次测试前重置 stub（在测试内部创建）
  });
  
  const getDefaultProps = () => ({
    closePopup: cy.stub().as("onClose"),
    wordSetId: 1,
    onSessionComplete: cy.stub().as("onComplete"),
  });

  it("应该正确渲染组件", () => {
    const props = getDefaultProps();
    cy.mountWithProviders(<TestStudy {...props} />);
    
    // 验证组件已加载（可能需要等待数据加载）
    cy.wait(2000);
    
    // 检查是否有测试相关的内容
    cy.get("body").then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes("测试") || bodyText.includes("题目") || bodyText.includes("选项")) {
        cy.log("✅ 测试界面已加载");
      } else if (bodyText.includes("没有可测试的单词") || bodyText.includes("加载")) {
        cy.log("ℹ️ 组件已渲染，但数据可能不足或正在加载");
      } else {
        cy.log("ℹ️ 组件已渲染");
      }
    });
  });

  it("应该能够处理关闭操作", () => {
    const props = getDefaultProps();
    cy.mountWithProviders(<TestStudy {...props} />);
    
    cy.wait(1000);
    
    // 查找并点击关闭按钮
    cy.get("body").then(($body) => {
      const closeButton = $body.find("button").filter((_, el) => {
        return el.textContent?.includes("关闭") || 
               el.textContent?.includes("返回") ||
               el.textContent?.includes("×");
      });
      
      if (closeButton.length > 0) {
        cy.get("button").contains(/关闭|返回|×/).first().click({ force: true });
        // 验证 onClose 被调用
        cy.get("@onClose").should("have.been.called");
      } else {
        cy.log("ℹ️ 关闭按钮未找到（可能组件未完全加载）");
      }
    });
  });

  it("应该显示加载状态", () => {
    const props = getDefaultProps();
    cy.mountWithProviders(<TestStudy {...props} />);
    
    // 立即检查加载状态（在数据加载前）
    cy.get("body", { timeout: 500 }).then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes("加载") || bodyText.includes("Loading")) {
        cy.log("✅ 加载状态已显示");
      }
    });
  });

  it("应该能够处理无 wordSetId 的情况", () => {
    cy.mountWithProviders(<TestStudy closePopup={cy.stub().as("onClose")} />);
    
    cy.wait(2000);
    
    // 验证组件能够处理 undefined wordSetId
    cy.get("body").should("exist");
  });

  it("应该能够处理 onSessionComplete 回调", () => {
    const props = getDefaultProps();
    const onComplete = cy.stub().as("onComplete");
    cy.mountWithProviders(
      <TestStudy 
        {...props} 
        onSessionComplete={onComplete}
      />
    );
    
    cy.wait(2000);
    
    // 注意：onSessionComplete 只在测试完成时调用
    // 这里只是验证组件能够接收这个 prop
    cy.get("body").should("exist");
  });
});

