// 退了没小程序 —— 版本信息与更新（小程序版用 wx.getUpdateManager，无需 GitHub API）

export const APP_VERSION = '0.4.0';
export const BUILD_TIME = __BUILD_TIME__ || '';

export interface UpdateInfo {
  hasUpdate: boolean;
  version: string;
  note: string;
}

/** 将 ISO 时间字符串格式化为北京时间（东八区）年月日时分秒 */
export function formatBeijingTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // toLocaleString 指定东八区，输出 YYYY/MM/DD HH:mm:ss 格式
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/** 小程序版：检查更新由 wx.getUpdateManager 处理（已在 app.ts 中注册），此处返回无更新 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  return { hasUpdate: false, version: APP_VERSION, note: '' };
}
