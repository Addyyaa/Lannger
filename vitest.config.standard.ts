/**
 * 构建后测试配置（兜底方案）
 * 
 * 当 rolldown-vite 在测试环境中出现兼容性问题时，
 * 可以先构建项目，然后使用此配置运行测试。
 * 
 * 此方案的思路：
 * 1. 先运行 `npm run build` 确保代码可以正常编译
 * 2. 然后使用此配置运行测试，此时代码已经经过构建处理
 * 
 * 使用方法：
 *   npm run build
 *   vitest --config vitest.config.standard.ts
 * 
 * 或者使用便捷命令：
 *   npm run test:unit:build
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // @ts-expect-error - Vitest 和 Vite 版本不兼容的类型问题，但不影响运行时
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // 使用标准 Vite 的依赖处理
    server: {
      deps: {
        inline: ["dexie", "fake-indexeddb"],
        external: [],
      },
    },
    // 使用单线程模式以确保稳定性
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/",
        "**/build/",
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
  // 不使用 SSR，避免兼容性问题
  // 注意：构建后的代码已经编译，不需要 SSR 处理
  ssr: {
    noExternal: ["dexie", "fake-indexeddb"],
  },
  // 定义全局变量
  define: {
    "import.meta.vitest": "undefined",
    // 为 fake-indexeddb 提供 SSR polyfill
    "__vite_ssr_exportName__": "(name) => name",
  },
  // 优化依赖
  optimizeDeps: {
    include: ["dexie"],
    exclude: [],
  },
});

