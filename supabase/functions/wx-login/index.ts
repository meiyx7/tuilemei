// 退了没 —— Supabase Edge Function: wx-login
//
// 用途：用 wx.login 返回的 code 换取 openid（服务端持有 AppSecret）。
// 客户端调用：fetch(`${SUPABASE_URL}/functions/v1/wx-login`, { body: { appid, code } })
// 返回：{ openid } 或 { error }
//
// 环境变量（Supabase 控制台 → Edge Functions → Secrets 配置）：
//   WX_APP_SECRET —— 微信小程序 AppSecret

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // CORS 预检
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { appid, code } = await req.json();
    if (!appid || !code) {
      return new Response(
        JSON.stringify({ error: "missing appid or code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const secret = Deno.env.get("WX_APP_SECRET");
    if (!secret) {
      console.error("[wx-login] WX_APP_SECRET 未配置");
      return new Response(
        JSON.stringify({ error: "server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 调微信 jscode2session 接口换 openid
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const wxResp = await fetch(url);
    const wxData = await wxResp.json();

    if (wxData.errcode) {
      console.warn("[wx-login] 微信接口返回错误", wxData);
      return new Response(
        JSON.stringify({ error: wxData.errmsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ openid: wxData.openid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[wx-login] 异常", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
