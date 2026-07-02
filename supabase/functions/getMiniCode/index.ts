// 退了没 —— Supabase Edge Function: getMiniCode
//
// 用途：生成小程序码并上传到 Supabase Storage，返回公开 URL 供前端 Canvas 绘制。
// 客户端调用：fetch(`${SUPABASE_URL}/functions/v1/getMiniCode`, { body: { scene } })
// 返回：{ url } 或 { error }
//
// 流程：
//   1. 用 AppID + AppSecret 调微信 cgi-bin/token 换 access_token（带内存缓存）
//   2. 用 access_token 调 wxa/getwxacodeunlimit 生成小程序码（返回二进制）
//   3. 上传到 Supabase Storage minicode bucket，覆盖同名文件
//   4. 返回公开 URL
//
// 环境变量（Supabase 控制台 → Edge Functions → Secrets 配置）：
//   WX_APP_SECRET —— 微信小程序 AppSecret
//   SUPABASE_URL —— Supabase 项目 URL（控制台默认注入）
//   SUPABASE_SERVICE_ROLE_KEY —— 服务端密钥（控制台默认注入，用于绕过 RLS 上传 Storage）

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const APPID = "wx8c91ec8355347154";
const BUCKET = "minicode";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// access_token 内存缓存（同一 Edge Function 实例内复用，过期前不重复请求）
interface TokenCache {
  token: string;
  expiresAt: number; // 毫秒时间戳
}
let tokenCache: TokenCache | null = null;

/** 用 AppID + AppSecret 换 access_token，带 5 分钟提前量过期判断 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 5 * 60 * 1000) {
    return tokenCache.token;
  }

  const secret = Deno.env.get("WX_APP_SECRET");
  if (!secret) throw new Error("WX_APP_SECRET 未配置");

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${secret}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.errcode) {
    throw new Error(`微信 token 接口错误: ${data.errcode} ${data.errmsg}`);
  }

  tokenCache = {
    token: data.access_token,
    // expires_in 通常 7200 秒
    expiresAt: now + (data.expires_in as number) * 1000,
  };
  return tokenCache.token;
}

/** 调 wxacode.getUnlimited 生成小程序码，返回 PNG 二进制 Uint8Array */
async function generateMiniCode(scene: string, page: string): Promise<Uint8Array> {
  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scene,
      page,
      width: 280,
      // 默认黑色，背景透明更适合叠加到分享卡片
      auto_color: false,
      is_hyaline: true,
    }),
  });

  // 微信接口成功返回 image/jpeg 二进制，失败返回 JSON
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const err = await resp.json();
    throw new Error(`微信小程序码接口错误: ${err.errcode} ${err.errmsg}`);
  }

  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

/** 上传图片到 Supabase Storage，覆盖同名文件 */
async function uploadToStorage(filename: string, bytes: Uint8Array): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置");
  }

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${filename}`;
  const resp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "image/png",
      // x-upsert: true 让同名文件覆盖，避免重复上传堆积
      "x-upsert": "true",
    },
    body: bytes,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Storage 上传失败 ${resp.status}: ${text}`);
  }
}

/** 返回 Storage 公开 URL（minicode bucket 为 public） */
function publicUrl(filename: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${filename}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const scene = (body.scene || "share").toString().slice(0, 32);
    const page = (body.page || "pages/dashboard/index").toString();

    // 文件名按 scene 区分，避免不同 scene 互相覆盖
    const filename = `${scene}.png`;

    console.log(`[getMiniCode] 生成 scene=${scene} page=${page}`);
    const bytes = await generateMiniCode(scene, page);
    await uploadToStorage(filename, bytes);
    const url = publicUrl(filename);
    console.log(`[getMiniCode] 上传成功 ${url}`);

    return new Response(
      JSON.stringify({ url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[getMiniCode] 异常", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
