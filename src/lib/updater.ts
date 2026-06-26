// 退了没小程序 —— 版本信息与更新（小程序版用 wx.getUpdateManager，无需 GitHub API）

export const APP_VERSION = '0.3.3';
export const BUILD_TIME = __BUILD_TIME__ || '';

export interface UpdateInfo {
  hasUpdate: boolean;
  version: string;
  note: string;
}

/** 小程序版：检查更新由 wx.getUpdateManager 处理（已在 app.ts 中注册），此处返回无更新 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  return { hasUpdate: false, version: APP_VERSION, note: '' };
}
