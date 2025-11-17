// ***********************************************************
// 这个文件是 Cypress 组件测试的支持文件
// 了解更多: https://on.cypress.io/component-testing
// ***********************************************************

// 导入 React 测试工具
import { mount } from "@cypress/react";
// 导入组件测试包装器
import { ComponentTestWrapper } from "./component-wrapper";

// 导入全局样式（如果需要）
// import "../../src/index.css";

// 导入 React
import React from "react";

// 声明全局 mount 命令
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
      mountWithProviders(component: React.ReactElement): Cypress.Chainable;
    }
  }
}

// 设置 mount 命令（带包装器）
Cypress.Commands.add("mount", mount);

// 设置带提供者的 mount 命令
Cypress.Commands.add("mountWithProviders", (component: React.ReactElement) => {
  return mount(<ComponentTestWrapper>{component}</ComponentTestWrapper>);
});

// 设置全局配置
Cypress.on("uncaught:exception", (err, runnable) => {
  // 忽略某些已知的错误
  if (err.message.includes("ResizeObserver loop limit exceeded")) {
    return false;
  }
  if (err.message.includes("Non-Error promise rejection captured")) {
    return false;
  }
  // 忽略 IndexedDB 相关错误（在测试环境中可能不可用）
  if (err.message.includes("IndexedDB") || err.message.includes("Dexie")) {
    return false;
  }
  return true;
});
