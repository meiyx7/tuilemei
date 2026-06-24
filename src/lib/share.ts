import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

interface ShareOptions {
  /** 截图区域内边距（px），避免内容紧贴边框 */
  padding?: number;
  filename?: string;
}

/**
 * 将目标 DOM 截图为 PNG 并分享。
 * - 原生 App（Capacitor）：写入缓存目录后调用原生分享面板（支持图片分享）。
 * - 浏览器：优先 Web Share API（带缩略图），不支持时回退为下载图片。
 *
 * 实现要点：克隆目标元素到屏幕外（fixed + 左侧负偏移）进行截图，
 * 原元素完全不修改样式，避免页面布局错乱。
 */
export async function shareElement(
  el: HTMLElement,
  opts: ShareOptions = {},
): Promise<void> {
  const {
    padding = 36,
    filename = "退了没-退休进度.png",
  } = opts;

  // 1. 克隆目标元素，在屏幕外渲染并截图，原元素不动
  const renderWidth = el.getBoundingClientRect().width;
  const clone = el.cloneNode(true) as HTMLElement;
  // 固定宽度为当前渲染宽度 + padding/边框，防止加 padding 后容器收缩导致文字换行
  clone.style.boxSizing = "border-box";
  clone.style.width = `${renderWidth + padding * 2 + 2}px`;
  clone.style.padding = `${padding}px`;
  clone.style.border = "1px solid rgba(28,26,23,0.15)";
  clone.style.borderRadius = "8px";
  clone.style.margin = "0";
  // 放到屏幕外，不可见但能正常渲染（不能用 display:none，否则无法截图）
  clone.style.position = "fixed";
  clone.style.left = "-99999px";
  clone.style.top = "0";
  clone.style.zIndex = "-1";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  try {
    // 等待一帧让克隆体渲染生效
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const dataUrl = await toPng(clone, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#f5f1e8",
      cacheBust: true,
      skipFonts: false,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    // 确保 blob 非空
    if (blob.size === 0) throw new Error("截图为空");

    // 原生 App：写入缓存目录后用原生分享面板分享图片文件
    if (Capacitor.isNativePlatform()) {
      const base64 = dataUrl.split(",")[1] ?? "";
      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      try {
        await Share.share({
          title: "退了没 · 我的退休进度",
          text: "看看我离退休还有多久",
          files: [fileResult.uri],
          dialogTitle: "分享退休进度",
        });
        return;
      } catch (err: unknown) {
        // 用户取消分享则直接返回
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("cancel") || msg.includes("Abort")) return;
        // 其他错误回退到下载
      } finally {
        // 分享完成后清理缓存文件
        Filesystem.deleteFile({
          path: filename,
          directory: Directory.Cache,
        }).catch(() => {});
      }
    }

    // 浏览器：优先原生分享（需 https 或 localhost，且支持文件分享）
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "退了没 · 我的退休进度",
          text: "看看我离退休还有多久",
        });
        return;
      } catch (err) {
        // 用户取消分享（AbortError）则直接返回，不触发下载
        if (err instanceof DOMException && err.name === "AbortError") return;
        // 其他错误回退下载
      }
    }

    // 回退：触发下载
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  } finally {
    // 2. 移除克隆体
    clone.remove();
  }
}
