// 退了没 —— 微信云开发封装（用户数据云端同步）
//
// 设计：纯客户端直连云数据库（无云函数），每用户一条记录在 `userData` 集合中，
//      靠数据库的"仅创建者可读写"权限隔离。简单 LWW（Last-Write-Wins）合并策略。
//
// 优雅降级：未配置 __CLOUD_ENV_ID__ 或初始化失败时，所有方法 no-op，
//          不影响本地存储流程。用户开通云开发并填入 envId 后即自动启用。

import type { ChangelogEntry, Checkin, Profile } from './types';

const COLLECTION = 'userData';

let cloudReady = false;

/** 云开发是否已就绪（已初始化且 envId 已配置） */
export function isCloudReady(): boolean {
  return cloudReady;
}

/**
 * 初始化云开发。在 app.ts useLaunch 中调用一次。
 * envId 来自构建期常量 __CLOUD_ENV_ID__（config/index.ts 注入）。
 */
export function initCloud(): void {
  const envId = __CLOUD_ENV_ID__;
  if (!envId) {
    console.log('[cloud] 未配置 CLOUD_ENV_ID，跳过云开发初始化（仍使用本地存储）');
    return;
  }
  try {
    const cloud = (wx as any).cloud;
    if (!cloud) {
      console.warn('[cloud] wx.cloud 不可用（非小程序环境或基础库版本过低）');
      return;
    }
    cloud.init({ env: envId, traceUser: true });
    cloudReady = true;
    console.log(`[cloud] 已初始化云开发环境 ${envId}`);
  } catch (e) {
    console.warn('[cloud] 初始化失败', e);
  }
}

/** 云端用户数据结构 */
export interface CloudUserData {
  profile?: Profile;
  checkins?: Record<string, Checkin>;
  changelog?: ChangelogEntry[];
  onboarded?: boolean;
  /** 云端最后更新时间戳（ms） */
  updatedAt?: number;
}

/**
 * 拉取当前用户的云端数据。
 * 依赖数据库"仅创建者可读写"权限：每个 openid 只能查到自己创建的记录。
 * 返回 null 表示云端无数据或云未就绪。
 */
export async function loadCloudData(): Promise<CloudUserData | null> {
  if (!cloudReady) return null;
  try {
    const db = (wx as any).cloud.database();
    const res = await db.collection(COLLECTION).limit(1).get();
    if (res.data && res.data.length > 0) {
      return res.data[0] as CloudUserData;
    }
    return null;
  } catch (e) {
    console.warn('[cloud] 拉取数据失败', e);
    return null;
  }
}

/**
 * 保存数据到云端（upsert：有则更新，无则新增）。
 * 内部自动写入 updatedAt 时间戳。
 */
export async function saveCloudData(data: CloudUserData): Promise<void> {
  if (!cloudReady) return;
  try {
    const db = (wx as any).cloud.database();
    const payload = { ...data, updatedAt: Date.now() };
    const res = await db.collection(COLLECTION).limit(1).get();
    if (res.data && res.data.length > 0) {
      await db.collection(COLLECTION).doc(res.data[0]._id).update({ data: payload });
    } else {
      await db.collection(COLLECTION).add({ data: payload });
    }
  } catch (e) {
    console.warn('[cloud] 保存数据失败', e);
  }
}

/**
 * 获取小程序码图片临时路径（用于分享卡片绘制）。
 * 调用 getMiniCode 云函数生成小程序码并上传云存储，返回 fileID；
 * 再用 wx.cloud.getTempFileURL 换成可绘制的临时路径。
 * 失败时返回空字符串，分享卡片会跳过二维码绘制。
 *
 * 常见失败原因：
 * - FUNCTION_NOT_FOUND (-501000)：云函数未部署，需在开发者工具右键
 *   cloudfunctions/getMiniCode → 「上传并部署:云端安装依赖」
 */
export async function getMiniCodeImage(): Promise<string> {
  if (!cloudReady) return '';
  try {
    const res = await (wx as any).cloud.callFunction({
      name: 'getMiniCode',
      data: { scene: 'share' },
    });
    const fileID = res?.result?.fileID;
    if (!fileID) {
      console.warn('[cloud] 小程序码生成失败', res?.result);
      return '';
    }
    const urlRes = await (wx as any).cloud.getTempFileURL({ fileList: [fileID] });
    const url = urlRes?.fileList?.[0]?.tempFileURL;
    return url || '';
  } catch (e: any) {
    const errMsg = String(e?.errMsg || e?.message || e);
    if (errMsg.includes('FUNCTION_NOT_FOUND') || errMsg.includes('-501000')) {
      console.error('[cloud] 云函数 getMiniCode 未部署!请在微信开发者工具右键 cloudfunctions/getMiniCode → 上传并部署:云端安装依赖');
    } else {
      console.warn('[cloud] 获取小程序码失败', e);
    }
    return '';
  }
}
