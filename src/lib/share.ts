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
 * 实现要点：通过 html-to-image 的 style 选项在内部克隆时应用 padding/边框，
 * 原元素完全不修改，避免页面布局错乱。
 */
export async function shareElement(
  el: HTMLElement,
  opts: ShareOptions = {},
): Promise<void> {
  const {
    padding = 36,
    filename = "退了没-退休进度.png",
  } = opts;

  // 固定宽度为当前渲染宽度 + padding/边框，防止加 padding 后容器收缩导致文字换行
  const renderWidth = el.getBoundingClientRect().width;

  try {
    const dataUrl = await toPng(el, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#f5f1e8",
      cacheBust: true,
      skipFonts: false,
      // style 选项由 html-to-image 在内部克隆时应用，原元素不动
      style: {
        boxSizing: "border-box",
        width: `${renderWidth + padding * 2 + 2}px`,
        // 高度自适应内容，避免固定宽度后内容重排导致截图被裁剪
        height: "auto",
        padding: `${padding}px`,
        border: "1px solid rgba(28,26,23,0.15)",
        borderRadius: "8px",
        margin: "0",
      },
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
  } catch (err) {
    console.error("截图失败", err);
    throw err;
  }
}
