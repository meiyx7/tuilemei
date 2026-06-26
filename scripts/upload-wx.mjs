// 退了没小程序 —— 微信小程序代码上传脚本（miniprogram-ci）
//
// 用法：
//   真实上传：WX_APPID=wx你的AppId WX_PRIVATE_KEY_PATH=./private.key pnpm run upload:wx
//   模拟上传：MOCK_UPLOAD=true pnpm run upload:wx
//
// 在 CI 中：private key 从 GitHub Secret 注入，见 .github/workflows/miniprogram.yml

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ci from 'miniprogram-ci';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

const APPID = process.env.WX_APPID || 'wx0000000000000000';
const VERSION = pkg.version || '0.0.1';
const PROJECT_PATH = resolve(root, 'dist/weapp');
const PRIVATE_KEY_PATH = process.env.WX_PRIVATE_KEY_PATH || resolve(root, 'private.key');
const MOCK = process.env.MOCK_UPLOAD === 'true' || !APPID.startsWith('wx') || APPID === 'wx0000000000000000';

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  退了没 · 微信小程序上传');
  console.log('═══════════════════════════════════════════');
  console.log(`  版本号:  ${VERSION}`);
  console.log(`  AppID:   ${APPID}`);
  console.log(`  构建产物: ${PROJECT_PATH}`);
  console.log(`  模式:    ${MOCK ? '模拟（MOCK）' : '真实上传'}`);
  console.log('───────────────────────────────────────────');

  if (MOCK) {
    // 模拟模式：不调用真实 API，打印模拟上传信息
    console.log('\n[MOCK] 模拟上传流程：');
    console.log('  1. ✓ 创建 Project 对象');
    console.log(`     - appid: ${APPID}`);
    console.log(`     - type: miniProgram`);
    console.log(`     - projectPath: ${PROJECT_PATH}`);
    console.log('  2. ✓ 调用 ci.upload()');
    console.log(`     - version: ${VERSION}`);
    console.log('     - desc: 退了没 v' + VERSION + ' 小程序版');
    console.log('     - setting: { es6: true, minify: true }');
    console.log('  3. ✓ 上传完成（模拟）');
    console.log('\n[MOCK] 如需真实上传，请：');
    console.log('  1. 在微信公众平台注册小程序，获取真实 AppID');
    console.log('  2. 在「开发管理 → 开发设置」下载代码上传密钥（private.key）');
    console.log('  3. 设置环境变量：WX_APPID=wx真实AppId WX_PRIVATE_KEY_PATH=./private.key');
    console.log('  4. 重新运行：pnpm run upload:wx');
    console.log('\n═══════════════════════════════════════════');
    console.log('  模拟上传完成 ✓');
    console.log('═══════════════════════════════════════════\n');
    return;
  }

  // 真实上传前：校验构建产物完整性
  const requiredFiles = ['app.json', 'app.js', 'app.wxss'];
  for (const f of requiredFiles) {
    if (!existsSync(resolve(PROJECT_PATH, f))) {
      console.error(`\n构建产物缺失：${resolve(PROJECT_PATH, f)}`);
      console.error('请先运行 pnpm run build:wx');
      process.exit(1);
    }
  }
  console.log('✓ 构建产物完整性校验通过');

  // 真实上传模式
  try {
    const project = new ci.Project({
      appid: APPID,
      type: 'miniProgram',
      projectPath: PROJECT_PATH,
      privateKeyPath: PRIVATE_KEY_PATH,
      ignores: ['node_modules/**/*'],
    });

    console.log('\n正在上传代码到微信后台...');
    const uploadResult = await ci.upload({
      project,
      version: VERSION,
      desc: `退了没 v${VERSION} 小程序版`,
      setting: {
        es6: true,
        es7: true,
        minify: true,
        autoPrefixWXSS: true,
      },
      onProgressUpdate: (info) => {
        if (info.message) console.log(`  ${info.message}`);
      },
    });

    console.log('\n═══════════════════════════════════════════');
    console.log('  上传成功 ✓');
    console.log(`  版本: ${VERSION}`);
    console.log(`  大小: ${(uploadResult.subPackageInfo?.[0]?.size / 1024).toFixed(1)} KB`);
    console.log('  请前往微信公众平台「版本管理」查看');
    console.log('═══════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n上传失败：', err.message || err);
    process.exit(1);
  }
}

main();
