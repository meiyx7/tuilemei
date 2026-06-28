// 退了没 —— 构建后修复：强制注入分享配置到页面 json
//
// 背景：Taro 4.0.9 编译页面配置时会把 enableShareAppMessage / enableShareTimeline
//      过滤掉，导致微信小程序右上角菜单不出现「转发」和「分享到朋友圈」入口。
//      朋友圈分享原生要求 page.json 必须有 enableShareTimeline: true，所以这里
//      在构建完成后直接补写进产物，绕过 Taro 的字段过滤。

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const weappRoot = resolve(__dirname, '..', 'dist', 'weapp');

// 需要开启分享的页面（路径相对 dist/weapp）
const SHARE_PAGES = [
  'pages/dashboard/index',
  'pages/calc/index',
  'pages/history/index',
];

for (const page of SHARE_PAGES) {
  const jsonPath = resolve(weappRoot, `${page}.json`);
  let raw;
  try {
    raw = readFileSync(jsonPath, 'utf-8');
  } catch {
    console.warn(`[fix-share] 跳过 ${page}：json 不存在`);
    continue;
  }
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch {
    console.warn(`[fix-share] 跳过 ${page}：json 解析失败`);
    continue;
  }
  cfg.enableShareAppMessage = true;
  cfg.enableShareTimeline = true;
  writeFileSync(jsonPath, JSON.stringify(cfg));
  console.log(`[fix-share] 已注入分享配置 → ${page}.json`);
}
