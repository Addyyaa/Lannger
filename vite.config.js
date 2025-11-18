// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  return {
    plugins: [
      react({
        babel: {
          plugins: [
            [
              "babel-plugin-react-compiler",
              {
                // 排除 hooks 目录，避免编译问题
                sources: (filename) => {
                  // 排除 hooks 目录下的文件
                  return (
                    !filename.includes("/hooks/") &&
                    !filename.includes("\\hooks\\")
                  );
                },
              },
            ],
          ].filter(Boolean),
        },
      }),
    ],
    server: {
      host: true, // 允许外部设备访问，等同于 host: '0.0.0.0'
      port: 5173, // 开发服务器端口
      strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
    },
    base: isProd ? "/Lannger/" : "/",

    build: {
      minify: "esbuild",
      esbuildOptions: {
        drop: ["console", "debugger"],
      },
    },
  };
});
