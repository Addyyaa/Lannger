/**
 * 通告服务
 * 负责读取通告HTML文件、管理弹出逻辑
 */

/**
 * 弹出策略类型
 */
export type AnnouncementStrategy =
  | "once_per_day" // 当天仅弹出一次
  | "every_launch" // 每次打开程序弹出一次
  | "interval_minutes"; // 间隔xx分钟弹出一次

/**
 * 通告配置接口
 */
export interface AnnouncementConfig {
  /**
   * 通告文件名（位于 public/announcements/ 目录下）
   * 例如: "announcement.html"
   */
  filename: string;
  /**
   * 弹出策略
   */
  strategy: AnnouncementStrategy;
  /**
   * 间隔时间（分钟），仅当 strategy 为 "interval_minutes" 时有效
   * 默认: 60
   */
  intervalMinutes?: number;
  /**
   * 是否启用此通告
   * 默认: true
   */
  enabled?: boolean;
  /**
   * 生效开始时间（ISO 8601 格式，可选）
   * 如果设置，通告只在此时间之后生效
   * 例如: "2024-01-01T00:00:00.000Z"
   */
  startTime?: string;
  /**
   * 生效结束时间（ISO 8601 格式，可选）
   * 如果设置，通告只在此时间之前生效
   * 例如: "2024-12-31T23:59:59.999Z"
   */
  endTime?: string;
}

/**
 * 通告数据接口
 */
export interface AnnouncementData {
  /**
   * HTML内容
   */
  html: string;
  /**
   * 配置信息
   */
  config: AnnouncementConfig;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AnnouncementConfig = {
  filename: "announcement.html",
  strategy: "once_per_day",
  intervalMinutes: 60,
  enabled: true,
};

/**
 * localStorage 键名前缀
 */
const STORAGE_PREFIX = "lannger_announcement_";

/**
 * 获取存储键名
 */
function getStorageKey(filename: string): string {
  return `${STORAGE_PREFIX}${filename}`;
}

/**
 * 获取当天日期字符串 (YYYY-MM-DD)
 */
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * 获取当前时间戳（毫秒）
 */
function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 存储弹出记录
 */
interface AnnouncementRecord {
  /**
   * 最后弹出日期 (YYYY-MM-DD)
   */
  lastShownDate?: string;
  /**
   * 最后弹出时间戳（毫秒）
   */
  lastShownTimestamp?: number;
  /**
   * 是否已显示过（用于 every_launch 策略）
   */
  shownInSession?: boolean;
}

/**
 * 读取存储的弹出记录
 */
function getRecord(filename: string): AnnouncementRecord {
  try {
    const key = getStorageKey(filename);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as AnnouncementRecord;
    }
  } catch (error) {
    console.error(`读取通告记录失败 [${filename}]:`, error);
  }
  return {};
}

/**
 * 保存弹出记录
 */
function saveRecord(filename: string, record: AnnouncementRecord): void {
  try {
    const key = getStorageKey(filename);
    localStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    console.error(`保存通告记录失败 [${filename}]:`, error);
  }
}

/**
 * 检查是否应该弹出通告
 */
export function shouldShowAnnouncement(config: AnnouncementConfig): boolean {
  if (!config.enabled) {
    return false;
  }

  // 检查生效时间范围
  const now = getCurrentTimestamp();
  if (config.startTime) {
    const startTime = new Date(config.startTime).getTime();
    if (now < startTime) {
      // 还未到生效时间
      return false;
    }
  }
  if (config.endTime) {
    const endTime = new Date(config.endTime).getTime();
    if (now > endTime) {
      // 已过生效时间
      return false;
    }
  }

  const record = getRecord(config.filename);
  const today = getTodayString();

  switch (config.strategy) {
    case "once_per_day":
      // 当天仅弹出一次：检查今天是否已经弹出过
      return record.lastShownDate !== today;

    case "every_launch":
      // 每次打开程序弹出一次：使用 sessionStorage 检查本次会话是否已弹出
      // sessionStorage 在标签页关闭时自动清除，完美符合"每次打开程序"的需求
      try {
        const sessionKey = `session_${getStorageKey(config.filename)}`;
        const shownInSession = sessionStorage.getItem(sessionKey);
        return !shownInSession; // 如果未在本次会话中显示过，返回 true
      } catch (error) {
        console.error("读取 sessionStorage 失败:", error);
        // 降级方案：使用时间戳判断（如果上次显示时间超过 5 分钟，认为是新的会话）
        if (record.lastShownTimestamp) {
          const fiveMinutes = 5 * 60 * 1000;
          return now - record.lastShownTimestamp > fiveMinutes;
        }
        return true;
      }

    case "interval_minutes":
      // 间隔xx分钟弹出一次
      const intervalMs = (config.intervalMinutes || 60) * 60 * 1000;
      if (record.lastShownTimestamp) {
        return now - record.lastShownTimestamp >= intervalMs;
      }
      return true;

    default:
      return false;
  }
}

/**
 * 标记通告已显示
 */
export function markAnnouncementShown(config: AnnouncementConfig): void {
  const record = getRecord(config.filename);
  const today = getTodayString();
  const now = getCurrentTimestamp();

  const newRecord: AnnouncementRecord = {
    ...record,
    lastShownDate: today,
    lastShownTimestamp: now,
    shownInSession: true,
  };

  saveRecord(config.filename, newRecord);

  // 对于 every_launch 策略，同时在 sessionStorage 中标记
  if (config.strategy === "every_launch") {
    try {
      const sessionKey = `session_${getStorageKey(config.filename)}`;
      sessionStorage.setItem(sessionKey, "1");
    } catch (error) {
      console.error("保存 sessionStorage 失败:", error);
    }
  }
}

/**
 * 加载通告HTML内容
 */
export async function loadAnnouncementHTML(filename: string): Promise<string> {
  try {
    // 从 public/announcements/ 目录加载
    const url = `${import.meta.env.BASE_URL}announcements/${filename}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error(`加载通告文件失败 [${filename}]:`, error);
    throw error;
  }
}

/**
 * 获取通告配置
 * 优先从配置文件读取（发布者配置），如果没有则使用默认配置
 */
export async function getAnnouncementConfig(): Promise<AnnouncementConfig> {
  try {
    // 尝试从 public/announcements/config.json 读取发布者配置
    const configUrl = `${import.meta.env.BASE_URL}announcements/config.json`;
    const response = await fetch(configUrl, {
      // 添加时间戳防止缓存
      cache: "no-cache",
    });

    if (response.ok) {
      const config = (await response.json()) as AnnouncementConfig;
      // 验证配置格式
      if (config.filename && config.strategy) {
        return { ...DEFAULT_CONFIG, ...config };
      }
    }
  } catch (error) {
    // 配置文件不存在或读取失败，使用默认配置
    console.debug("未找到通告配置文件，使用默认配置:", error);
  }

  // 返回默认配置
  return DEFAULT_CONFIG;
}

/**
 * 设置通告配置（已废弃，配置由发布者通过 config.json 文件设置）
 * @deprecated 请使用 public/announcements/config.json 文件配置
 */
export function setAnnouncementConfig(_config: AnnouncementConfig): void {
  console.warn(
    "setAnnouncementConfig 已废弃，请使用 public/announcements/config.json 文件配置"
  );
  // 保留此函数以保持向后兼容，但不执行任何操作
}

/**
 * 清除通告记录（用于测试或重置）
 */
export function clearAnnouncementRecord(filename: string): void {
  try {
    const key = getStorageKey(filename);
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`清除通告记录失败 [${filename}]:`, error);
  }
}

/**
 * 清除所有通告记录
 */
export function clearAllAnnouncementRecords(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("清除所有通告记录失败:", error);
  }
}
