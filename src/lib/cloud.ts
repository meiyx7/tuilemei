// 退了没 —— Supabase 云端同步封装（用户数据云端同步 + 小程序码生成）
//
// 架构变化（相对微信云开发版）：
//   - 微信云开发自动按 openid 隔离 → Supabase 用 openid 字段标识用户，
//     RLS 策略限制每用户只能读写自己 openid 的记录
//   - wx.cloud.database() → supabase.from('userData')
//   - wx.cloud.callFunction → fetch 调用 Supabase Edge Function
//   - wx.cloud.getTempFileURL → 小程序码直接由 Edge Function 返回 base64
//
// 优雅降级：未配置 __SUPABASE_URL__ 或初始化失败时，所有方法 no-op，
//          不影响本地存储流程。

import Taro from '@tarojs/taro';
import { createClient } from '@supabase/supabase-js';
import type { ChangelogEntry, Checkin, Profile } from './types';

const COLLECTION = 'userData';
const APPID = 'wx8c91ec8355347154';

let supabase: ReturnType<typeof createClient> | null = null;
/** 当前用户 openid（wx.login 换取，用于隔离用户数据） */
let currentOpenid = '';

/** Supabase 是否已就绪（已初始化且 URL/key 已配置） */
export function isCloudReady(): boolean {
  return supabase !== null && currentOpenid !== '';
}

/**
 * 初始化 Supabase 客户端。在 app.ts useLaunch 中调用一次。
 * URL/key 来自构建期常量 __SUPABASE_URL__ / __SUPABASE_ANON_KEY__（config/index.ts 注入）。
 */
export function initCloud(): void {
  const url = __SUPABASE_URL__;
  const anonKey = __SUPABASE_ANON_KEY__;
  if (!url || !anonKey) {
    console.log('[cloud] 未配置 SUPABASE_URL/KEY，跳过云同步初始化（仍使用本地存储）');
    return;
  }
  try {
    supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log(`[cloud] 已初始化 Supabase 客户端 ${url}`);
  } catch (e) {
    console.warn('[cloud] 初始化失败', e);
  }
}

/**
 * 用 wx.login 换取 openid。
 * 走 Supabase Edge Function（wx-login），由服务端用 AppSecret 调微信 jscode2session 接口。
 * AppSecret 不进前端，仅存于 Edge Function 环境变量。
 * 成功后缓存 openid，供后续数据隔离使用。
 */
export async function loginWithWechat(): Promise<string> {
  if (currentOpenid) return currentOpenid;
  if (!supabase) return '';
  try {
    const { code } = await Taro.login();
    if (!code) {
      console.warn('[cloud] wx.login 未返回 code');
      return '';
    }
    // 调 Edge Function 换 openid（服务端持有 AppSecret）
    const url = __SUPABASE_URL__;
    const resp = await fetch(`${url}/functions/v1/wx-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__SUPABASE_ANON_KEY__}`,
      },
      body: JSON.stringify({ appid: APPID, code }),
    });
    if (!resp.ok) {
      console.warn('[cloud] wx-login 失败', resp.status);
      return '';
    }
    const data = await resp.json();
    if (data.openid) {
      currentOpenid = data.openid;
      console.log('[cloud] 已获取 openid');
      return currentOpenid;
    }
    console.warn('[cloud] wx-login 未返回 openid', data);
    return '';
  } catch (e) {
    console.warn('[cloud] wx.login 异常', e);
    return '';
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
 * 依赖 RLS 策略：用户只能查到自己 openid 的记录。
 * 返回 null 表示云端无数据或云未就绪。
 */
export async function loadCloudData(): Promise<CloudUserData | null> {
  if (!supabase || !currentOpenid) return null;
  try {
    const { data, error } = await supabase
      .from(COLLECTION)
      .select('profile,checkins,changelog,onboarded,updatedAt')
      .eq('openid', currentOpenid)
      .limit(1);
    if (error) {
      console.warn('[cloud] 拉取数据失败', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data[0] as CloudUserData;
    }
    return null;
  } catch (e) {
    console.warn('[cloud] 拉取数据异常', e);
    return null;
  }
}

/**
 * 保存数据到云端（upsert：有则更新，无则新增）。
 * 内部自动写入 updatedAt 时间戳和 openid。
 */
export async function saveCloudData(data: CloudUserData): Promise<void> {
  if (!supabase || !currentOpenid) return;
  try {
    const payload = { ...data, openid: currentOpenid, updatedAt: Date.now() };
    // upsert: 按 openid 冲突时更新
    // 注：未引入 supabase 生成的 Database 类型，此处用 any 规避表结构推断
    const { error } = await supabase
      .from(COLLECTION)
      .upsert(payload as never, { onConflict: 'openid' });
    if (error) {
      console.warn('[cloud] 保存数据失败', error.message);
    }
  } catch (e) {
    console.warn('[cloud] 保存数据异常', e);
  }
}

/**
 * 获取小程序码图片 URL（用于分享卡片绘制）。
 * 调用 Supabase Edge Function getMiniCode 生成小程序码并上传 Supabase Storage，
 * 返回可绘制的图片 URL。
 * 失败时返回空字符串，分享卡片会跳过二维码绘制。
 */
export async function getMiniCodeImage(): Promise<string> {
  if (!supabase) return '';
  try {
    const url = __SUPABASE_URL__;
    const resp = await fetch(`${url}/functions/v1/getMiniCode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__SUPABASE_ANON_KEY__}`,
      },
      body: JSON.stringify({ scene: 'share' }),
    });
    if (!resp.ok) {
      console.warn('[cloud] getMiniCode 失败', resp.status);
      return '';
    }
    const data = await resp.json();
    if (data.url) {
      return data.url as string;
    }
    console.warn('[cloud] getMiniCode 未返回 url', data);
    return '';
  } catch (e) {
    console.warn('[cloud] 获取小程序码异常', e);
    return '';
  }
}
