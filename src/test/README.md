# 测试文档

## 测试环境设置

本项目使用以下测试框架和工具：

- **Vitest**: 快速、现代的测试框架
- **React Testing Library**: React 组件测试工具
- **jsdom**: 浏览器环境模拟

## 安装依赖

在运行测试之前，请先安装测试依赖：

```bash
npm install
```

如果遇到 npm 权限问题，请运行：

```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行测试（监听模式）

```bash
npm test
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 运行测试 UI（可视化界面）

```bash
npm run test:ui
```

### 运行测试（单次执行，不监听）

```bash
npm run test:run
```

## 测试覆盖率目标

- **行覆盖率**: ≥ 80%
- **函数覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 80%
- **语句覆盖率**: ≥ 80%

## 测试文件结构

```
src/
├── algorithm/
│   ├── __tests__/
│   │   └── spacedRepetition.test.ts      # SM-2 算法测试
│   └── spacedRepetition.ts
├── utils/
│   ├── __tests__/
│   │   ├── ebbinghausCurve.test.ts       # 艾宾浩斯曲线测试
│   │   ├── dataVerify.test.ts            # 数据验证测试
│   │   ├── errorHandler.test.ts          # 错误处理测试
│   │   └── dbWrapper.test.ts             # 数据库包装测试
│   └── ...
├── store/
│   ├── __tests__/
│   │   └── reviewStore.test.ts           # 复习计划数据操作测试
│   └── ...
└── test/
    ├── setup.ts                           # 测试环境设置
    └── README.md                          # 本文档
```

## 编写测试

### 单元测试示例

```typescript
import { describe, it, expect } from "vitest";
import { calculateSM2 } from "./spacedRepetition";

describe("calculateSM2", () => {
  it("应该正确处理首次学习", () => {
    const progress = {
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
    };

    const result = calculateSM2(progress, 3);

    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
  });
});
```

### 组件测试示例

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("应该渲染组件", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

## 测试最佳实践

1. **测试命名**: 使用描述性的测试名称，说明测试的内容
2. **测试隔离**: 每个测试应该独立运行，不依赖其他测试
3. **清理**: 使用 `beforeEach` 和 `afterEach` 清理测试环境
4. **Mock**: 适当使用 Mock 来隔离被测试的代码
5. **覆盖率**: 确保核心功能达到 80% 以上的覆盖率

## 持续集成

测试应该在 CI/CD 流程中自动运行。确保在提交代码前运行测试：

```bash
npm run test:run
```

## 故障排除

### 问题：找不到模块 'vitest'

**解决方案**: 确保已安装所有依赖：
```bash
npm install
```

### 问题：测试运行缓慢

**解决方案**: 
- 使用 `vitest` 的并行执行功能
- 检查是否有不必要的 Mock 或异步操作

### 问题：覆盖率不达标

**解决方案**:
- 检查未覆盖的代码行
- 添加更多测试用例
- 确保测试覆盖边界情况

