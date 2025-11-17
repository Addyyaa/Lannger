# Cypress 测试文档

## 📋 概述

本项目使用 Cypress 进行 E2E 测试和组件测试，以解决 `rolldown-vite` 与 Vitest 的兼容性问题。

## 🚀 快速开始

### 运行 E2E 测试

```bash
# 在浏览器中打开 Cypress（交互式）
npm run test:e2e:open

# 在命令行运行 E2E 测试（无头模式）
npm run test:e2e
```

### 运行组件测试

```bash
# 在浏览器中打开 Cypress 组件测试（交互式）
npm run test:component:open

# 在命令行运行组件测试（无头模式）
npm run test:component
```

### 运行所有测试

```bash
# 运行单元测试 + E2E 测试 + 组件测试
npm run test:all
```

## 📁 目录结构

```
cypress/
├── e2e/                    # E2E 测试文件
│   ├── test-mode.cy.ts     # 测试模式 E2E 测试
│   └── review-mode.cy.ts   # 复习模式 E2E 测试
├── component/              # 组件测试文件
│   ├── TestStudy.cy.tsx    # TestStudy 组件测试
│   └── ReviewStudy.cy.tsx  # ReviewStudy 组件测试
├── support/                # 支持文件
│   ├── e2e.ts             # E2E 测试支持文件
│   ├── component.tsx       # 组件测试支持文件
│   └── component-index.html # 组件测试 HTML 模板
└── fixtures/               # 测试数据文件
    └── example.json        # 示例数据
```

## 📝 编写测试

### E2E 测试示例

```typescript
// cypress/e2e/example.cy.ts
describe("功能测试", () => {
  beforeEach(() => {
    cy.visit("/study");
  });

  it("应该能够完成某个操作", () => {
    cy.contains("按钮文本").click();
    cy.contains("预期结果").should("be.visible");
  });
});
```

### 组件测试示例

```typescript
// cypress/component/Example.cy.tsx
import Example from "../../src/components/Example";

describe("Example Component", () => {
  it("应该正确渲染", () => {
    cy.mount(<Example prop="value" />);
    cy.contains("预期文本").should("be.visible");
  });
});
```

## ⚙️ 配置说明

### Cypress 配置文件

`cypress.config.ts` 包含以下配置：

- **E2E 测试**：
  - `baseUrl`: `http://localhost:5173`
  - `specPattern`: `cypress/e2e/**/*.cy.{js,jsx,ts,tsx}`
  - 支持视频录制和截图

- **组件测试**：
  - 使用 Vite 作为打包工具
  - 支持 React 组件测试
  - 可能受 `rolldown-vite` 影响（如果遇到问题，考虑使用 Webpack）

## ⚠️ 注意事项

### 1. 运行测试前启动开发服务器

E2E 测试需要应用运行在 `http://localhost:5173`，请先启动开发服务器：

```bash
# 终端 1：启动开发服务器
npm run dev

# 终端 2：运行 Cypress 测试
npm run test:e2e:open
```

### 2. 组件测试的兼容性

组件测试使用 Vite 作为打包工具，可能仍然受 `rolldown-vite` 影响。如果遇到问题：

- **方案 A**：在 Cypress 配置中使用标准 Vite（如果可能）
- **方案 B**：使用 Webpack 作为组件测试的打包工具
- **方案 C**：只使用 E2E 测试，组件测试等待 Vitest 修复

### 3. 测试数据准备

某些测试可能需要测试数据，请确保：

1. 运行测试数据准备脚本：`node scripts/prepare-test-data.ts`
2. 或者使用 Cypress fixtures 提供测试数据

## 🔧 故障排除

### 问题：Cypress 无法连接到应用

**解决方案**：
- 确保开发服务器运行在 `http://localhost:5173`
- 检查 `cypress.config.ts` 中的 `baseUrl` 配置

### 问题：组件测试无法加载组件

**解决方案**：
- 检查组件导入路径是否正确
- 检查 Vite 配置是否正确
- 如果使用 `rolldown-vite`，考虑切换到标准 Vite 或 Webpack

### 问题：测试超时

**解决方案**：
- 增加超时时间：`Cypress.config("defaultCommandTimeout", 20000)`
- 检查网络请求是否完成
- 使用 `cy.wait()` 等待异步操作

## 📚 参考资料

- [Cypress 官方文档](https://docs.cypress.io/)
- [Cypress Component Testing](https://docs.cypress.io/guides/component-testing)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)

