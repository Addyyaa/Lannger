/**
 * 颜色对比度工具
 * 用于检查颜色对比度是否符合 WCAG AA 标准
 */

/**
 * 将十六进制颜色转换为 RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * 计算相对亮度（根据 WCAG 标准）
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 计算两个颜色之间的对比度
 * @param color1 第一个颜色（十六进制，如 "#ffffff"）
 * @param color2 第二个颜色（十六进制，如 "#000000"）
 * @returns 对比度比值（1-21）
 */
export function getContrastRatio(
  color1: string,
  color2: string
): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return 0;
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 检查对比度是否符合 WCAG AA 标准
 * @param color1 第一个颜色
 * @param color2 第二个颜色
 * @param isLargeText 是否为大文本（18pt 或更大，或 14pt 粗体或更大）
 * @returns 是否符合标准
 */
export function meetsWCAGAA(
  color1: string,
  color2: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(color1, color2);
  // 大文本需要 3:1，正常文本需要 4.5:1
  return ratio >= (isLargeText ? 3 : 4.5);
}

/**
 * 检查对比度是否符合 WCAG AAA 标准
 * @param color1 第一个颜色
 * @param color2 第二个颜色
 * @param isLargeText 是否为大文本
 * @returns 是否符合标准
 */
export function meetsWCAGAAA(
  color1: string,
  color2: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(color1, color2);
  // 大文本需要 4.5:1，正常文本需要 7:1
  return ratio >= (isLargeText ? 4.5 : 7);
}

/**
 * 获取对比度等级描述
 */
export function getContrastLevel(ratio: number): {
  level: "fail" | "AA Large" | "AA" | "AAA Large" | "AAA";
  description: string;
} {
  if (ratio < 3) {
    return { level: "fail", description: "不符合任何标准" };
  } else if (ratio < 4.5) {
    return { level: "AA Large", description: "符合 AA 标准（仅大文本）" };
  } else if (ratio < 7) {
    return { level: "AA", description: "符合 AA 标准" };
  } else {
    return { level: "AAA", description: "符合 AAA 标准" };
  }
}

/**
 * 检查主要颜色组合的对比度
 * 用于开发时验证
 */
export function checkCommonColorCombinations(): Array<{
  name: string;
  foreground: string;
  background: string;
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
}> {
  const combinations = [
    // 暗色主题
    { name: "暗色主题 - 主文本", foreground: "#ffffff", background: "#1a1a1a" },
    { name: "暗色主题 - 次要文本", foreground: "#cccccc", background: "#1a1a1a" },
    { name: "暗色主题 - 按钮文本（绿色）", foreground: "#ffffff", background: "#4caf50" },
    { name: "暗色主题 - 按钮文本（红色）", foreground: "#ffffff", background: "#f44336" },
    { name: "暗色主题 - 按钮文本（蓝色）", foreground: "#ffffff", background: "#00b4ff" },
    { name: "暗色主题 - 按钮文本（灰色）", foreground: "#ffffff", background: "#666666" },
    
    // 亮色主题
    { name: "亮色主题 - 主文本", foreground: "#333333", background: "#ffffff" },
    { name: "亮色主题 - 次要文本", foreground: "#666666", background: "#ffffff" },
    { name: "亮色主题 - 按钮文本（绿色）", foreground: "#ffffff", background: "#2e7d32" },
    { name: "亮色主题 - 按钮文本（红色）", foreground: "#ffffff", background: "#c62828" },
    { name: "亮色主题 - 按钮文本（蓝色）", foreground: "#ffffff", background: "#007aff" },
    { name: "亮色主题 - 按钮文本（灰色）", foreground: "#ffffff", background: "#999999" },
  ];

  return combinations.map((combo) => {
    const ratio = getContrastRatio(combo.foreground, combo.background);
    return {
      name: combo.name,
      foreground: combo.foreground,
      background: combo.background,
      ratio: Math.round(ratio * 100) / 100,
      meetsAA: meetsWCAGAA(combo.foreground, combo.background),
      meetsAAA: meetsWCAGAAA(combo.foreground, combo.background),
    };
  });
}

