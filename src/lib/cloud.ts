// 退了没 —— Supabase 云端同步（微信小程序版）
//
// 架构：不使用 supabase-js SDK（依赖浏览器 Headers 等 Web API，小程序环境缺失），
//      改用 Taro.request 直接调用 Supabase REST API + Edge Functions。
//
// REST API 调用格式（PostgREST）：
//   - 查询：GET /rest/v1/{table}?select=...&openid=eq.{openid}
//   - 插入：POST /rest/v1/{table}
//   - Upsert：POST /rest/v1/{table} + header Prefer: resolution=merge-duplicates
//   - Edge Function：POST /functions/v1/{name}
//   - 必需 Headers：apikey, Authorization: Bearer {anonKey}
//
// 优雅降级：未配置 URL/key 或请求失败时，所有方法 no-op，不影响本地存储。

import Taro from '@tarojs/taro';
import type { ChangelogEntry, Checkin, Profile } from './types';

const TABLE = 'userData';
const APPID = 'wx8c91ec8355347154';

let supabaseUrl = '';
let anonKey = '';
/** 当前用户 openid（wx.login 换取，用于隔离用户数据） */
let currentOpenid = '';

/** 云端登录状态 */
export type CloudStatus = 'unconfigured' | 'login' | 'online' | 'offline';
let cloudStatus: CloudStatus = 'unconfigured';

/** 获取云端状态（供 UI 展示） */
export function getCloudStatus(): CloudStatus {
  return cloudStatus;
}

/** Supabase 是否已就绪（已配置且已登录） */
export function isCloudReady(): boolean {
  return cloudStatus === 'online';
}

/**
 * 当前后端名称，用于界面展示（底部版本号旁的标注）。
 */
export function getBackendLabel(): string {
  switch (cloudStatus) {
    case 'online': return 'Supabase · Connected';
    case 'login': return 'Supabase · Connecting';
    case 'offline': return 'SupaBase · Offline 仅本地存储';
    default: return '本地存储';
  }
}

/**
 * 初始化 Supabase 配置。在 app.ts useLaunch 中调用一次。
 * 仅记录 URL/key，不创建客户端（小程序无浏览器 API）。
 */
export function initCloud(): void {
  const url = __SUPABASE_URL__;
  const key = __SUPABASE_ANON_KEY__;
  if (!url || !key) {
    console.log('[cloud] 未配置 SUPABASE_URL/KEY，跳过云同步初始化（仍使用本地存储）');
    cloudStatus = 'unconfigured';
    return;
  }
  supabaseUrl = url;
  anonKey = key;
  cloudStatus = 'login';
  console.log(`[cloud] 已配置 Supabase REST API ${url}`);
}

/** 是否为网络连接类错误（需要重试） */
function isNetworkError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('net::err') ||
    msg.includes('cronet');
}

/**
 * 封装 Taro.request 调用 Supabase REST API / Edge Functions。
 * 所有请求带上 apikey + Authorization header。
 * 网络错误（connection closed/timeout）自动重试 2 次，间隔 1s。
 */
async function supabaseRequest(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  data?: unknown,
  extraHeaders?: Record<string, string>,
  retryCount: number = 0,
): Promise<{ data: unknown; error?: string }> {
  if (!supabaseUrl || !anonKey) {
    return { data: null, error: 'Supabase 未配置' };
  }
  try {
    const res = await Taro.request({
      url: `${supabaseUrl}${path}`,
      method,
      header: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      data: method === 'POST' ? data : undefined,
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return { data: res.data as unknown };
    }
    console.warn(`[cloud] Supabase 请求失败 ${res.statusCode}`, res.data);
    return { data: null, error: `HTTP ${res.statusCode}` };
  } catch (e) {
    const errMsg = String(e);
    // 网络连接错误：自动重试（最多 2 次）
    if (isNetworkError(e) && retryCount < 2) {
      console.warn(`[cloud] Supabase 网络异常（将重试 ${retryCount + 1}/2）`, errMsg);
      await new Promise(r => setTimeout(r, 1000));
      return supabaseRequest(path, method, data, extraHeaders, retryCount + 1);
    }
    // 最终失败：给出明确提示
    if (isNetworkError(e)) {
      console.error(
        '[cloud] Supabase 网络连接失败（已重试），请检查：\n' +
        '  1. 微信后台 request 合法域名是否已添加 supabase.co\n' +
        '  2. 体验版需重新扫码或重启小程序\n' +
        '  3. 网络环境是否正常',
        errMsg,
      );
    } else {
      console.warn('[cloud] Supabase 请求异常', errMsg);
    }
    return { data: null, error: errMsg };
  }
}

/**
 * 调用 Supabase Edge Function。
 */
async function callEdgeFunction(name: string, body: unknown): Promise<{ data: unknown; error?: string }> {
  return supabaseRequest(`/functions/v1/${name}`, 'POST', body);
}

/** 登录结果 */
export interface LoginResult {
  success: boolean;
  openid?: string;
  /** 是否为网络类错误（可用于提示"网络恢复后自动同步"） */
  networkError?: boolean;
}

/**
 * 用 wx.login 换取 openid。
 * 调 Supabase Edge Function wx-login，服务端持有 AppSecret 微信 jscode2session。
 */
export async function loginWithWechat(): Promise<LoginResult> {
  if (currentOpenid) return { success: true, openid: currentOpenid };
  if (!supabaseUrl) return { success: false };
  try {
    const { code } = await Taro.login();
    if (!code) {
      console.warn('[cloud] wx.login 未返回 code');
      cloudStatus = 'offline';
      return { success: false };
    }
    const res = await callEdgeFunction('wx-login', { appid: APPID, code });
    if (res.data && (res.data as Record<string, unknown>).openid) {
      currentOpenid = (res.data as Record<string, string>).openid;
      cloudStatus = 'online';
      console.log('[cloud] 已获取 openid');
      return { success: true, openid: currentOpenid };
    }
    cloudStatus = 'offline';
    console.warn('[cloud] wx-login 未返回 openid', res.data || res.error);
    return { success: false };
  } catch (e) {
    cloudStatus = 'offline';
    console.warn('[cloud] wx.login 异常', e);
    return { success: false, networkError: isNetworkError(e) };
  }
}

/** 云端用户数据结构 */
export interface CloudUserData {
  profile?: Profile;
  checkins?: Record<string, Checkin>;
  changelog?: ChangelogEntry[];
  onboarded?: boolean;
  updatedAt?: number;
}

/**
 * 拉取当前用户的云端数据。
 * PostgREST 查询语法：GET /rest/v1/{table}?select=...&openid=eq.{openid}&limit=1
 */
export async function loadCloudData(): Promise<CloudUserData | null> {
  if (!supabaseUrl || !currentOpenid) return null;
  const res = await supabaseRequest(
    `/rest/v1/${TABLE}?select=profile,checkins,changelog,onboarded,updatedAt&openid=eq.${currentOpenid}&limit=1`,
    'GET',
  );
  if (res.error) return null;
  const arr = res.data as unknown[];
  if (arr && arr.length > 0) {
    return arr[0] as CloudUserData;
  }
  return null;
}

/**
 * 保存数据到云端（upsert：有则更新，无则新增）。
 * PostgREST upsert：POST + header Prefer: resolution=merge-duplicates
 */
export async function saveCloudData(data: CloudUserData): Promise<void> {
  if (!supabaseUrl || !currentOpenid) return;
  const payload = { ...data, openid: currentOpenid, updatedAt: Date.now() };
  const res = await supabaseRequest(
    `/rest/v1/${TABLE}`,
    'POST',
    payload,
    {
      // resolution=merge-duplicates: 按 primary key (openid) 冲突时合并更新
      // return=representation: 返回插入/更新后的记录（可选，这里不关心返回）
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
  );
  if (res.error) {
    console.warn('[cloud] 保存数据失败', res.error);
  }
}

/**
 * 获取小程序码图片 URL。
 *  Supabase Edge Function getMiniCode，生成小程序码并上传 Storage，返回公开 URL。
 */
export async function getMiniCodeImage(): Promise<string> {
  if (!supabaseUrl) return '';
  const res = await callEdgeFunction('getMiniCode', { scene: 'share' });
  if (res.data && (res.data as Record<string, unknown>).url) {
    return (res.data as Record<string, string>).url;
  }
  console.warn('[cloud] getMiniCode 未返回 url', res.data || res.error);
  return '';
}