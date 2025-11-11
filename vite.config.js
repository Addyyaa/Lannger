// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          "babel-plugin-react-compiler",
        ].filter(Boolean),
      },
    }),
  ],
  server: {
    host: true, // 允许外部设备访问，等同于 host: '0.0.0.0'
    port: 5173, // 开发服务器端口
    strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
  },
  base: '/Langger/',
});
