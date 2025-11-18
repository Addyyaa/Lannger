# 测试架构实施方案

**设计日期**：2024-12-19  
**设计者**：高级架构师 + 测试专家  
**任务 ID**：A5  
**优先级**：P1  
**预计工时**：24 小时（设计 8 小时 + 实施 16 小时）

---

## 📋 一、实施摘要

基于架构设计文档（`docs/architecture-design.md`）中的测试架构设计，本文档提供详细的实施方案，包括：

1. **Vitest 配置**：完善测试环境配置
2. **单元测试**：为核心算法和工具函数编写测试
3. **集成测试**：为 Store + Service 集成编写测试
4. **E2E 测试**：配置 Cypress，编写关键用户流程测试
5. **CI/CD 配置**：设置 GitHub Actions 自动化测试

---

## 🛠️ 二、详细实施步骤

### 2.1 阶段 1：完善 Vitest 配置（2 小时）

#### 2.1.1 创建 vitest.config.ts

**文件**：`vitest.config.ts`（新建或更新）

**配置内容**：

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/**",
        "**/__tests__/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

#### 2.1.2 创建测试设置文件

**文件**：`src/test/setup.ts`（新建）

**配置内容**：

```typescript
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// 清理测试环境
afterEach(() => {
  cleanup();
});

// Mock IndexedDB
import { IDBFactory } from "fake-indexeddb";
global.indexedDB = new IDBFactory();

// Mock Dexie（可选，根据需要）
vi.mock("../db", async () => {
  const actual = await vi.importActual("../db");
  return {
    ...actual,
    // 可以在这里添加 Mock 实现
  };
});
```

#### 2.1.3 安装测试依赖

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom fake-indexeddb
```

### 2.2 阶段 2：编写单元测试（12 小时）

#### 2.2.1 算法模块测试

**文件**：`src/algorithm/__tests__/weightCalculator.test.ts`

**测试内容**：

- 权重计算函数
- 不同学习模式的权重策略
- 边界情况处理

**文件**：`src/algorithm/__tests__/spacedRepetition.test.ts`

**测试内容**：

- SM-2 算法计算
- 间隔时间计算
- 易度因子调整

#### 2.2.2 工具函数测试

**文件**：`src/utils/__tests__/errorHandler.test.ts`

**测试内容**：

- AppError 类
- handleError 函数
- 错误分类和严重程度

**文件**：`src/utils/__tests__/dataIntegrity.test.ts`

**测试内容**：

- 数据验证函数
- 自动修复函数
- 数据一致性检查

#### 2.2.3 Store 测试

**文件**：`src/store/__tests__/wordStore.test.ts`

**测试内容**：

- Store Actions
- 数据查询和更新
- 错误处理

### 2.3 阶段 3：编写集成测试（6 小时）

#### 2.3.1 Store + Service 集成测试

**文件**：`src/store/__tests__/wordStore.integration.test.ts`

**测试内容**：

- Store 与数据库交互
- 批量操作
- 事务处理

#### 2.3.2 数据库操作集成测试

**文件**：`src/db/__tests__/migration.test.ts`

**测试内容**：

- 数据库迁移
- 数据完整性
- 版本升级

### 2.4 阶段 4：配置 E2E 测试（4 小时）

#### 2.4.1 安装 Cypress

```bash
npm install -D cypress
```

#### 2.4.2 配置 Cypress

**文件**：`cypress.config.ts`

**配置内容**：

```typescript
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      // 配置插件
    },
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
```

#### 2.4.3 编写 E2E 测试

**文件**：`cypress/e2e/study.cy.ts`

**测试内容**：

- 闪卡学习流程
- 测试模式流程
- 复习模式流程

### 2.5 阶段 5：配置 CI/CD（2 小时）

#### 2.5.1 GitHub Actions 工作流

**文件**：`.github/workflows/test.yml`

**配置内容**：

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        run: npm run test:e2e
```

#### 2.5.2 更新 package.json

添加测试脚本：

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "cypress run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 📊 三、测试覆盖率目标

### 3.1 覆盖率要求

- **总体覆盖率**：> 80%
- **核心算法**：> 90%
- **工具函数**：> 85%
- **Store**：> 80%
- **组件**：> 70%

### 3.2 优先级

1. **P0**：核心算法（权重计算、调度算法、间隔重复）
2. **P1**：工具函数（错误处理、数据验证）
3. **P2**：Store 和组件

---

## ✅ 四、验收标准

1. ✅ Vitest 配置完成，测试环境正常
2. ✅ 单元测试覆盖率 > 80%
3. ✅ 集成测试覆盖关键流程
4. ✅ E2E 测试覆盖主要用户流程
5. ✅ CI/CD 配置完成，自动化测试通过

---

**实施完成时间**：预计 2024-12-26  
**下一步行动**：编程专家和测试专家协作实施
