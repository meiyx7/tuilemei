import { Capacitor } from "@capacitor/core";

/** GitHub 仓库（owner/repo），用于查询 Releases */
const GITHUB_REPO = "meiyx7/tuilemei";
/** GitHub API 基址 */
const API_BASE = `https://api.github.com/repos/${GITHUB_REPO}`;

/** 当前应用版本（由 Vite define 注入，取自 package.json） */
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
/** 构建时间戳（由 Vite define 注入），用于区分缓存版本 */
export const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";

export interface UpdateInfo {
  /** 是否有新版本 */
  hasUpdate: boolean;
  /** 最新版本号（不含 v 前缀） */
  latestVersion: string;
  /** 当前版本号 */
  currentVersion: string;
  /** Release 页面链接 */
  htmlUrl: string;
  /** 发行说明（markdown 原文） */
  releaseNotes: string;
  /** Android APK 下载地址（若存在） */
  apkUrl: string | null;
  /** 发布时间 ISO */
  publishedAt: string;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  content_type: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
  assets: GitHubAsset[];
  prerelease: boolean;
  draft: boolean;
}

/**
 * 比较两个语义化版本号。
 * 返回值：>0 表示 a 更新，<0 表示 b 更新，0 表示相同。
 */
function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/**
 * 查询 GitHub Releases 最新版本，与当前版本对比。
 * 网络失败、限流或无新版本时返回 hasUpdate=false。
 *
 * GitHub API 未认证请求限流：60 次/小时/IP。
 * 应用本身不会发起高频请求（24h 检查一次 + 手动触发），
 * 但若用户处于 NAT 后共 IP，可能撞限流。检测到 403 时静默降级。
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const currentVersion = APP_VERSION;
  const fallback: UpdateInfo = {
    hasUpdate: false,
    latestVersion: currentVersion,
    currentVersion,
    htmlUrl: `https://github.com/${GITHUB_REPO}/releases`,
    releaseNotes: "",
    apkUrl: null,
    publishedAt: "",
  };

  try {
    const res = await fetch(`${API_BASE}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    // 403 通常是 rate limit，404 表示无 release，二者都静默降级
    if (!res.ok) {
      if (res.status === 403) {
        console.info("[updater] GitHub API rate limited, skip update check");
      } else if (res.status === 404) {
        console.info("[updater] No release found");
      } else {
        console.warn(`[updater] GitHub API responded ${res.status}`);
      }
      return fallback;
    }
    const release: GitHubRelease = await res.json();
    if (release.draft || release.prerelease) return fallback;

    const latestVersion = release.tag_name.replace(/^v/, "");
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    // 查找 APK 资源（优先 arm64-v8a，其次通用 apk）
    const apkAsset =
      release.assets.find(
        (a) => a.name.endsWith(".apk") && a.name.includes("arm64"),
      ) ?? release.assets.find((a) => a.name.endsWith(".apk")) ?? null;

    return {
      hasUpdate,
      latestVersion,
      currentVersion,
      htmlUrl: release.html_url,
      releaseNotes: release.body || "",
      apkUrl: apkAsset?.browser_download_url ?? null,
      publishedAt: release.published_at,
    };
  } catch {
    return fallback;
  }
}

/**
 * 触发更新下载。
 *
 * 历史方案（已废弃）：fetch blob → base64 → Filesystem.writeFile → window.open(file://)
 *  问题和失败原因：
 *   1. APK 通常 10MB+，base64 编码后占内存 ~13MB+，低端 Android 直接 OOM；
 *   2. Android 7+ 打开 file:// URI 抛 FileUriExposedException，需配置 FileProvider，
 *      但 Capacitor 默认未配置 APK 共享的 FileProvider；
 *   3. 缺少 REQUEST_INSTALL_PACKAGES 权限无法触发系统安装器（CI 已注入，但本地构建不一定）。
 *
 * 当前方案：所有平台都用系统浏览器打开下载链接，由浏览器负责下载、由系统负责安装。
 *  - Android：window.open(url, "_system") 由 Capacitor 拦截转给系统浏览器，
 *    下载完成后用户点击通知栏即可触发安装。
 *  - iOS：iOS 不支持 APK，info.apkUrl 通常为 null，会回退到 Release 页面。
 *  - Web：在新标签页打开下载链接。
 */
export async function downloadAndInstallUpdate(info: UpdateInfo): Promise<void> {
  const url = info.apkUrl ?? info.htmlUrl;
  if (!url) return;

  const platform = Capacitor.getPlatform();
  // Android / iOS：用 _system target 让 Capacitor 转给系统浏览器
  if (platform === "android" || platform === "ios") {
    window.open(url, "_system");
    return;
  }
  // Web：新标签页打开
  window.open(url, "_blank");
}
