// 退了没小程序 —— 版本信息与更新（小程序版用 wx.getUpdateManager，无需 GitHub API）

export const APP_VERSION = '0.6.3';
export const BUILD_TIME = __BUILD_TIME__ || '';

export interface UpdateInfo {
  hasUpdate: boolean;
  version: string;
  note: string;
}

/**
 * 将 ISO 时间字符串格式化为北京时间（东八区）年月日时分秒。
 * 不使用 Intl.DateTimeFormat.formatToParts——该 API 在部分安卓微信
 * X5/TBS 内核上支持不全，会抛错导致页面白屏。改为纯 Date 手动计算：
 * UTC 时间 + 8 小时偏移，再用 getUTC* 取值，兼容所有环境。
 */
export function formatBeijingTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const beijing = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const Y = beijing.getUTCFullYear();
  const M = String(beijing.getUTCMonth() + 1).padStart(2, '0');
  const D = String(beijing.getUTCDate()).padStart(2, '0');
  const h = String(beijing.getUTCHours()).padStart(2, '0');
  const m = String(beijing.getUTCMinutes()).padStart(2, '0');
  const s = String(beijing.getUTCSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

/** 小程序版：检查更新由 wx.getUpdateManager 处理（已在 app.ts 中注册），此处返回无更新 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  return { hasUpdate: false, version: APP_VERSION, note: '' };
}
