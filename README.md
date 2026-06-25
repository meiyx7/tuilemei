# 退了没 · 退休进度年鉴

> 每日打卡，测算你的退休时间与养老金。

一个面向中国城镇职工的退休进度追踪与养老金测算 PWA / 混合 App。基于 2025 年《渐进式延迟法定退休年龄办法》和城镇职工基本养老保险计发办法的简化模型，给你一个专属的退休倒计时和每日打卡仪式感。

## ✨ 功能特性

- **退休年龄测算**：根据性别、身份、出生年月，按 2025 渐进式延迟政策算出法定退休年龄与退休日期
- **养老金计发测算**：基础养老金 + 个人账户养老金 + 过渡性养老金 三部分构成可视化
- **每日打卡**：印章风格打卡动画，连续打卡天数追踪，每日寄语
- **打卡年鉴**：月历视图 + GitHub 风格年度热力图，记录每一步
- **进度分享**：一键生成退休进度截图，分享到微信/朋友圈/任何支持图片的渠道
- **离线可用**：PWA + Service Worker，断网也能查看进度
- **自动更新**：通过 GitHub Releases 检测新版本并提示更新
- **数据本地化**：所有档案数据仅保存在浏览器 localStorage，不上传任何服务器

## 🎨 设计风格

年鉴 + 印章 + 衬线字体的中式复古风格。米白纸色背景、印章红主色、琥珀色点缀，刻意远离 Material Design / iOS 默认样式，追求独立的视觉识别。

## 📐 测算口径

### 法定退休年龄

依据 2025 年《渐进式延迟法定退休年龄办法》：

| 身份 | 原法定年龄 | 目标年龄 | 步长 | 起始队列 |
|------|-----------|---------|------|---------|
| 男职工 | 60 岁 | 63 岁 | 每 4 个月 +1 月 | 1965-01 |
| 女工人 | 50 岁 | 55 岁 | 每 2 个月 +1 月 | 1975-01 |
| 女干部 | 55 岁 | 58 岁 | 每 4 个月 +1 月 | 1970-01 |

### 养老金计发

城镇职工基本养老保险三部分：

- **基础养老金** = (社平工资 + 指数化月平均缴费工资) ÷ 2 × 缴费年限 × 1%
- **个人账户养老金** = 退休时个人账户累计余额 ÷ 计发月数
- **过渡性养老金** = 视同缴费年限 × 社平工资 × 平均缴费指数 × 1.3%

简化假设：

- 个人账户记账利率按 4% 年化复利推算
- 个人账户继续按工资 8% 缴费至退休，按年金终值计算
- 视同缴费年限按 1996-01 前工龄简化计算（各地实际建立时间略有差异）
- 过渡性养老金计发系数取 1.3%，部分地区为 1.0%~1.4%

> ⚠️ **重要声明**：本应用为简化测算模型，**结果仅供参考，不构成任何官方承诺或法律依据**。实际退休年龄与待遇以参保地社保经办机构核定为准。

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript 5 (strict mode) |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 |
| 状态 | Zustand 5 + localStorage 持久化 |
| 路由 | React Router 7 (HashRouter) |
| 跨端 | Capacitor 8 (Android / iOS / PWA) |
| 包管理 | pnpm 10+ |
| 字体 | Fraunces / Spectral / JetBrains Mono (Google Fonts) |

## 🚀 快速开始

### 环境要求

- Node.js 22+
- pnpm 10+

### 本地开发

```bash
git clone https://github.com/meiyx7/tuilemei.git
cd tuilemei
pnpm install
pnpm dev
```

浏览器打开 http://localhost:5173 即可。

### 构建生产版本

```bash
pnpm build       # 输出到 dist/
pnpm preview     # 本地预览生产构建
```

### 类型检查

```bash
pnpm check       # tsc -b --noEmit
```

### 代码检查

```bash
pnpm lint
```

## 📱 移动端构建

Android 和 iOS 工程默认不在仓库中（被 `.gitignore` 忽略），首次构建需手动添加：

### Android

```bash
pnpm cap:add:android   # 添加 Android 工程（首次）
pnpm cap:sync          # 同步 web 资源到原生工程
pnpm cap:open:android  # 在 Android Studio 中打开
```

### iOS（仅 macOS）

```bash
pnpm cap:add:ios       # 添加 iOS 工程（首次）
pnpm cap:sync
pnpm cap:open:ios      # 在 Xcode 中打开
```

## 🔒 隐私说明

- **档案数据**：出生年月、工资、缴费指数等所有个人档案信息仅保存在你本机的浏览器 localStorage 中，**不会上传到任何服务器**。
- **自动定位**：如果你点击"自动定位"按钮，App 会调用浏览器 Geolocation API 获取经纬度，并通过 OpenStreetMap Nominatim 服务进行逆向地理编码以识别所在省份。该请求会发送至 OpenStreetMap 服务器。如不愿被定位，可手动选择省份。
- **更新检查**：App 会定期访问 GitHub API 查询最新 Release 版本号，不涉及任何个人信息。
- **分享截图**：仅在主动点击分享按钮时生成图片，由你决定分享给谁。

## 🏗 CI/CD

仓库内置 GitHub Actions 流水线 (`.github/workflows/build.yml`)：

- **推送到 main**：并行触发
  - Web 构建 + 部署到 GitHub Pages
  - Android Debug APK 构建（产物上传到 Artifacts）
  - iOS 模拟器构建验证（产物上传到 Artifacts）
- **打 tag `v*`**：额外触发
  - Android Release AAB 签名构建（需配置 secrets）
  - Android Release APK 上传到 GitHub Release（供应用内检测更新）
  - iOS TestFlight 上传（需配置 Apple 凭证 secrets）

## 📁 项目结构

```
tuilemei/
├── src/
│   ├── lib/
│   │   ├── pension.ts      # 测算引擎：退休年龄 + 养老金 + 校验工具
│   │   ├── quotes.ts       # 每日寄语库
│   │   ├── share.ts        # 截图分享（html-to-image + Capacitor Share）
│   │   ├── updater.ts      # GitHub Releases 自动更新
│   │   ├── types.ts        # 类型定义
│   │   └── utils.ts        # cn() 工具
│   ├── store/
│   │   └── useStore.ts     # Zustand store + 持久化 + 打卡逻辑
│   ├── components/         # UI 组件（ProgressRing / Heatmap / Timeline 等）
│   └── pages/              # 三个页面：Dashboard / Calculator / History
├── public/
│   ├── sw.js               # Service Worker
│   └── manifest.webmanifest
├── capacitor.config.ts
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## 🤝 贡献

欢迎通过 Issue 反馈 bug 或提出功能建议，也欢迎 PR。提交前请确保：

1. `pnpm check` 通过
2. `pnpm lint` 无新增 warning
3. `pnpm build` 成功

## 📄 License

[MIT](./LICENSE)
