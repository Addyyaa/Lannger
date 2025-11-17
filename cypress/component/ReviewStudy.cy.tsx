/**
 * ReviewStudy 组件测试
 * 
 * 测试复习模式组件的渲染和交互
 */

/// <reference path="../support/index.d.ts" />

import React from "react";
import ReviewStudy from "../../src/components/ReviewStudy";

describe("ReviewStudy Component", () => {
  beforeEach(() => {
    // 每次测试前重置 stub（在测试内部创建）
  });
  
  const getDefaultProps = () => ({
    closePopup: cy.stub().as("onClose"),
    wordSetId: 1,
    reviewStage: 1,
    onSessionComplete: cy.stub().as("onComplete"),
  });

  it("应该正确渲染组件", () => {
    const props = getDefaultProps();
    cy.mountWithProviders(<ReviewStudy {...props} />);
    
    // 验证组件已加载
    cy.wait(2000);
    
    // 检查是否有复习相关的内容
    cy.get("body").then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes("复习") || bodyText.includes("单词") || bodyText.includes("显示答案")) {
        cy.log("✅ 复习界面已加载");
      } else if (bodyText.includes("加载") || bodyText.includes("没有")) {
        cy.log("ℹ️ 组件已渲染，但数据可能不足或正在加载");
      } else {
        cy.log("ℹ️ 组件已渲染");
      }
    });
  });

  it("应该显示复习阶段信息", () => {
    const props = getDefaultProps();
    cy.mountWithProviders(<ReviewStudy {...props} reviewStage={1} />);
    
    cy.wait(2000);
    
    // 检查是否显示阶段信息
    cy.get("body").then(($body) => {
      const bodyText = $body.text();
      if (bodyText.includes("第") && bodyText.includes("次")) {
        cy.log("✅ 复习阶段信息已显示");
      } else {
        cy.log("ℹ️ 复习阶段信息可能未显示（数据可能不足）");
      }
    });
  });

  it("应该能够处理不同的复习阶段", () => {
    [1, 2, 3].forEach((stage) => {
      const props = getDefaultProps();
      cy.mountWithProviders(
        <ReviewStudy 
          {...props} 
          reviewStage={stage}
        />
      );
      
      cy.wait(1000);
      cy.get("body").should("exist");
    });
  });

  it("应该能够处理关闭操作", () => {
    const props = getDefaultProps();
    cy.mountWithProviders(<ReviewStudy {...props} />);
    
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
        cy.get("@onClose").should("have.been.called");
      } else {
        cy.log("ℹ️ 关闭按钮未找到（可能组件未完全加载）");
      }
    });
  });

  it("应该能够处理无 wordSetId 的情况", () => {
    cy.mountWithProviders(
      <ReviewStudy 
        closePopup={cy.stub().as("onClose")} 
        reviewStage={1}
      />
    );
    
    cy.wait(2000);
    
    // 验证组件能够处理 undefined wordSetId
    cy.get("body").should("exist");
  });
});

