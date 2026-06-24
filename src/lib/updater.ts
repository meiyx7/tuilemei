import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

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
 * 网络失败或无新版本时返回 hasUpdate=false。
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
    if (!res.ok) return fallback;
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
 * 下载并安装更新。
 * - Android 原生：下载 APK 到缓存目录后打开触发安装；失败则回退到浏览器打开下载页。
 * - iOS / Web：在系统浏览器中打开 Release 页面。
 */
export async function downloadAndInstallUpdate(info: UpdateInfo): Promise<void> {
  const platform = Capacitor.getPlatform();

  // Android：尝试应用内下载 APK 并打开安装
  if (platform === "android" && info.apkUrl) {
    try {
      const res = await fetch(info.apkUrl);
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      // Blob → base64
      const base64 = await blobToBase64(blob);
      const filename = `tuilemei-${info.latestVersion}.apk`;
      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.External,
        recursive: true,
      });
      // 打开 APK 触发系统安装界面
      window.open(fileResult.uri, "_system");
      return;
    } catch {
      // 回退：浏览器打开下载链接
      window.open(info.apkUrl, "_system");
      return;
    }
  }

  // iOS / Web：打开 Release 页面
  const url = info.apkUrl ?? info.htmlUrl;
  window.open(url, "_blank");
}

/** Blob 转 base64 字符串（不含 data: 前缀） */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
