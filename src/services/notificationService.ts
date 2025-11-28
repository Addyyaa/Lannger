/**
 * 系统通知服务
 * 使用 Web Notifications API 在手机通知栏显示复习提醒
 */

/**
 * 检查浏览器是否支持通知功能
 */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

/**
 * 获取当前通知权限状态
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * 请求通知权限
 * @returns Promise<boolean> 是否获得权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn("浏览器不支持通知功能");
    return false;
  }

  // 如果已经有权限，直接返回
  if (Notification.permission === "granted") {
    return true;
  }

  // 如果被拒绝，无法再次请求
  if (Notification.permission === "denied") {
    console.warn("通知权限已被拒绝，请在浏览器设置中手动开启");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("请求通知权限失败:", error);
    return false;
  }
}

/**
 * 通知数据接口
 */
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // 用于替换相同 tag 的通知
  data?: {
    wordSetId?: number;
    reviewStage?: number;
    url?: string;
  };
}

/**
 * 显示系统通知
 * @param notificationData 通知数据
 * @returns Promise<void>
 */
export async function showNotification(
  notificationData: NotificationData
): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn("浏览器不支持通知功能");
    return;
  }

  // 检查权限
  if (Notification.permission !== "granted") {
    console.warn("通知权限未授予");
    return;
  }

  try {
    // 确保 Service Worker 已注册
    const registration = await navigator.serviceWorker.ready;

    // 使用 Service Worker 显示通知（这样即使应用关闭也能显示）
    const notificationOptions: NotificationOptions & {
      vibrate?: number[];
      actions?: Array<{ action: string; title: string }>;
    } = {
      body: notificationData.body,
      icon: notificationData.icon || "/icons/1.png",
      badge: notificationData.badge || "/icons/1.png",
      tag: notificationData.tag, // 相同 tag 会替换旧通知
      data: notificationData.data || {},
      requireInteraction: false, // 不需要用户交互即可自动关闭
      silent: false, // 播放通知声音
      actions: [
        {
          action: "open",
          title: "开始复习",
        },
        {
          action: "dismiss",
          title: "稍后提醒",
        },
      ],
    };

    // 添加震动模式（仅移动设备支持）
    if ("vibrate" in navigator) {
      notificationOptions.vibrate = [200, 100, 200];
    }

    await registration.showNotification(
      notificationData.title,
      notificationOptions
    );
  } catch (error) {
    console.error("显示通知失败:", error);
    // 降级到普通 Notification API（如果 Service Worker 失败）
    try {
      const notification = new Notification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon || "/icons/1.png",
        tag: notificationData.tag,
        data: notificationData.data,
      });

      // 点击通知时打开应用
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (notificationData.data?.url) {
          window.location.href = notificationData.data.url;
        }
        notification.close();
      };
    } catch (fallbackError) {
      console.error("降级通知也失败:", fallbackError);
    }
  }
}

/**
 * 关闭指定 tag 的通知
 * @param tag 通知标签
 */
export async function closeNotification(tag: string): Promise<void> {
  if (!isNotificationSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications({ tag });
    notifications.forEach((notification) => notification.close());
  } catch (error) {
    console.error("关闭通知失败:", error);
  }
}

/**
 * 关闭所有通知
 */
export async function closeAllNotifications(): Promise<void> {
  if (!isNotificationSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications();
    notifications.forEach((notification) => notification.close());
  } catch (error) {
    console.error("关闭所有通知失败:", error);
  }
}
