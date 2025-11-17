#!/usr/bin/env node

/**
 * 构建后测试脚本
 * 
 * 此脚本用于在构建完成后运行测试，作为兜底方案。
 * 当 rolldown-vite 在测试环境中出现兼容性问题时，
 * 可以先构建项目，然后运行测试。
 * 
 * 使用方法：
 *   node scripts/test-after-build.mjs
 * 
 * 或者通过 npm 脚本：
 *   npm run test:unit:build
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const DIST_DIR = join(process.cwd(), "dist");

console.log("🔨 开始构建项目...");
try {
  execSync("npm run build", { stdio: "inherit" });
  console.log("✅ 构建完成");
} catch (error) {
  console.error("❌ 构建失败:", error.message);
  process.exit(1);
}

// 检查构建输出
if (!existsSync(DIST_DIR)) {
  console.error("❌ 构建输出目录不存在:", DIST_DIR);
  process.exit(1);
}

console.log("🧪 开始运行测试...");
try {
  // 使用标准配置运行测试
  execSync("vitest --config vitest.config.standard.ts --run", { stdio: "inherit" });
  console.log("✅ 测试完成");
} catch (error) {
  console.error("❌ 测试失败:", error.message);
  process.exit(1);
}

