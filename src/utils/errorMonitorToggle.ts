/**
 * 错误监控面板显示状态管理
 */

const STORAGE_KEY = "langger_error_monitor_visible";
const CLICK_COUNT_KEY = "langger_error_monitor_click_count";
const CLICK_TIMEOUT = 2000; // 2秒内连续点击才计数
const REQUIRED_CLICKS = 10; // 需要连续点击10次

/**
 * 检查错误监控面板是否应该显示
 * 支持开发环境和正式环境（通过连续点击激活）
 */
export function isErrorMonitorVisible(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "true";
}

/**
 * 设置错误监控面板的显示状态
 * 支持开发环境和正式环境
 */
export function setErrorMonitorVisible(visible: boolean): void {
  localStorage.setItem(STORAGE_KEY, visible ? "true" : "false");
}

/**
 * 处理管理标题的点击事件
 * 连续点击10次后显示错误监控面板
 * 支持开发环境和正式环境
 */
export function handleManagementTitleClick(): void {
  const now = Date.now();
  const stored = localStorage.getItem(CLICK_COUNT_KEY);
  let clickData: { count: number; lastClickTime: number } = {
    count: 0,
    lastClickTime: 0,
  };

  if (stored) {
    try {
      clickData = JSON.parse(stored);
    } catch {
      clickData = { count: 0, lastClickTime: 0 };
    }
  }

  // 如果距离上次点击超过2秒，重置计数
  if (now - clickData.lastClickTime > CLICK_TIMEOUT) {
    clickData.count = 0;
  }

  // 增加点击计数
  clickData.count += 1;
  clickData.lastClickTime = now;

  // 保存点击数据
  localStorage.setItem(CLICK_COUNT_KEY, JSON.stringify(clickData));

  // 如果达到10次，显示错误监控面板
  if (clickData.count >= REQUIRED_CLICKS) {
    setErrorMonitorVisible(true);
    // 重置计数
    clickData.count = 0;
    localStorage.setItem(CLICK_COUNT_KEY, JSON.stringify(clickData));
  }
}
