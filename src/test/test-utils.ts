/**
 * 测试工具函数
 * 用于解决 rolldown-vite 在测试环境中的模块导入问题
 */
import { vi } from "vitest";

/**
 * 安全导入模块（解决 rolldown-vite 导出问题）
 */
export async function safeImport<T = any>(modulePath: string): Promise<T> {
  try {
    // 尝试使用 vi.importActual
    const module = await vi.importActual<T>(modulePath);
    if (module) {
      return module;
    }
  } catch (error) {
    // 忽略错误，继续尝试
  }
  
  // 如果失败，尝试直接导入
  try {
    const module = await import(modulePath);
    return module as T;
  } catch (error) {
    throw new Error(`无法导入模块 ${modulePath}: ${error}`);
  }
}

