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
export function shouldShowAnnouncement(
  config: AnnouncementConfig
): boolean {
  if (!config.enabled) {
    return false;
  }

  const record = getRecord(config.filename);
  const today = getTodayString();
  const now = getCurrentTimestamp();

  switch (config.strategy) {
    case "once_per_day":
      // 当天仅弹出一次：检查今天是否已经弹出过
      return record.lastShownDate !== today;

    case "every_launch":
      // 每次打开程序弹出一次：检查本次会话是否已弹出
      // 注意：这里使用 sessionStorage 更合适，但为了统一使用 localStorage
      // 我们通过检查时间戳来判断（如果时间戳很新，说明可能是同一次会话）
      // 更简单的方式：每次检查都返回 true，然后在显示后标记
      // 但这样会导致刷新页面就弹出，所以使用时间戳判断
      // 如果上次显示时间超过 5 分钟，认为是新的会话
      if (record.lastShownTimestamp) {
        const fiveMinutes = 5 * 60 * 1000;
        return now - record.lastShownTimestamp > fiveMinutes;
      }
      return true;

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
}

/**
 * 加载通告HTML内容
 */
export async function loadAnnouncementHTML(
  filename: string
): Promise<string> {
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
 * 可以从配置文件或环境变量读取，这里先使用默认配置
 * 未来可以扩展为从服务器或配置文件读取
 */
export function getAnnouncementConfig(): AnnouncementConfig {
  // 可以从 localStorage 读取用户配置，或从服务器获取
  // 目前使用默认配置
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}config`);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("读取通告配置失败:", error);
  }
  return DEFAULT_CONFIG;
}

/**
 * 设置通告配置
 */
export function setAnnouncementConfig(config: AnnouncementConfig): void {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}config`,
      JSON.stringify(config)
    );
  } catch (error) {
    console.error("保存通告配置失败:", error);
  }
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

