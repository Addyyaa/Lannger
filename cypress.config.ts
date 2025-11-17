import { defineConfig } from "cypress";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      // 配置节点事件
      // 可以在这里添加插件配置
    },
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: async () => {
        // 强制使用标准 vite（从 vitest 的依赖中导入，避免 rolldown-vite）
        // vitest 依赖标准 vite@5.4.21，我们可以使用它的 vite 实例
        const vitestVitePath = require.resolve("vite", {
          paths: [require.resolve("vitest")],
        });
        // 使用 file:// 协议导入，确保使用正确的 vite 实例
        const viteModule = await import(
          vitestVitePath.startsWith("/") 
            ? `file://${vitestVitePath}` 
            : vitestVitePath.replace(/\\/g, "/")
        );
        
        const { defineConfig } = viteModule.default || viteModule;
        
        return defineConfig({
          plugins: [react()],
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "./src"),
            },
          },
        });
      },
    },
    specPattern: "cypress/component/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.tsx",
    indexHtmlFile: "cypress/support/component-index.html",
  },
  // 环境变量
  env: {
    // 可以在这里添加环境变量
  },
});

