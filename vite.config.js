// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  return {
    plugins: [
      react({
        // 临时禁用 React Compiler，避免 useMemoCache null 错误
        // 如果需要启用，请确保 react-compiler-runtime 正确初始化
        babel: {
          plugins: [
            [
              "babel-plugin-react-compiler",
              {
                sources: (filename) => {
                  const isHookFile =
                    filename.includes("/hooks/") ||
                    filename.includes("\\hooks\\");
                  if (isHookFile) {
                    return false;
                  }
                  return true;
                },
              },
            ],
          ],
        },
      }),
    ],
    server: {
      host: true, // 允许外部设备访问，等同于 host: '0.0.0.0'
      port: 5173, // 开发服务器端口
      strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
      // 开发环境禁用 HTTP 缓存，确保获取最新代码
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
    base: isProd ? "/Lannger/" : "/",

    build: {
      minify: "esbuild",
      esbuildOptions: {
        drop: ["console", "debugger"],
      },
      // 生成带 hash 的文件名，确保缓存更新
      rollupOptions: {
        output: {
          // 确保资源文件名包含 hash，便于缓存更新
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash].[ext]",
        },
      },
    },
  };
});
