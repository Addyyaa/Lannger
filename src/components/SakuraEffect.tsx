import { useMemo } from "react";
import { useTheme, useOrientation } from "../main";

/**
 * 樱花花瓣的属性
 */
interface SakuraPetalProps {
  left: number; // 水平位置百分比
  duration: number; // 动画持续时间（秒）
  delay: number; // 动画延迟（秒）
  size: number; // 花瓣大小（像素）
  color: string; // 花瓣颜色
}

/**
 * 单个樱花花瓣组件
 */
function SakuraPetal({ left, duration, delay, size, color }: SakuraPetalProps) {
  const petalStyle: React.CSSProperties = {
    position: "absolute",
    left: `${left}vw`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    transition: "background-color 0.5s ease", // 主题切换时平滑过渡
    willChange: "transform, opacity", // 优化动画性能
  };

  return <div className="sakura-petal" style={petalStyle} />;
}

/**
 * 樱花飘落特效组件
 * - 适配暗黑模式颜色
 * - 支持横屏和竖屏模式
 */
export default function SakuraEffect() {
  const { isDark } = useTheme();
  const { isPortrait } = useOrientation();

  // 樱花数量（竖屏时减少数量，避免过于密集）
  const sakuraCount = isPortrait ? 12 : 20;

  // 根据主题选择颜色
  // 亮色模式：粉色系 (#ffd7e6)
  // 暗色模式：深紫色系，更柔和 (#a67fa8)
  const sakuraColor = isDark ? "#a67fa8" : "#ffd7e6";

  // 生成樱花花瓣配置（只在首次渲染时生成，位置和大小保持不变）
  const sakuraPetals = useMemo(() => {
    const petals: Omit<SakuraPetalProps, "color">[] = [];
    // 竖屏时使用稍小的尺寸
    const minSize = isPortrait ? 12 : 15;
    const maxSize = isPortrait ? 22 : 30;
    for (let i = 0; i < sakuraCount; i++) {
      petals.push({
        left: Math.random() * 100, // 随机水平位置 (0-100vw)
        duration: Math.random() * 5 + 5, // 随机下落时间 (5-10秒)
        delay: Math.random() * 5, // 随机延迟 (0-5秒)
        size: Math.random() * (maxSize - minSize) + minSize, // 随机大小
      });
    }
    return petals;
  }, [isPortrait, sakuraCount]); // 依赖屏幕方向，以便调整参数

  // 容器样式 - 使用固定定位，确保覆盖整个视口
  // z-index 设置在侧边栏(1000)和头部(999)之下，但在主要内容之上
  // 使用 pointer-events: none 确保不阻挡交互
  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    pointerEvents: "none", // 关键：不阻挡任何交互
    zIndex: 500, // 设置在主要内容之上，但低于侧边栏(1000)和头部(999)
    overflow: "hidden",
  };

  // 调试信息（开发环境）
  if (process.env.NODE_ENV === "development") {
    console.log("樱花特效渲染:", {
      isPortrait,
      isDark,
      sakuraColor,
      petalCount: sakuraPetals.length,
    });
  }

  return (
    <div style={containerStyle}>
      {sakuraPetals.map((petal, index) => (
        <SakuraPetal key={index} {...petal} color={sakuraColor} />
      ))}
    </div>
  );
}
