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
 * 实现要点：截图时将元素临时 position:fixed 脱离文档流并移到屏幕左上角，
 * 加 padding/边框后截图。由于脱离文档流，元素宽度变化不会影响页面布局，
 * 配合全屏遮罩让用户看到"正在生成"提示而非样式变化。
 */
export async function shareElement(
  el: HTMLElement,
  opts: ShareOptions = {},
): Promise<void> {
  const {
    padding = 36,
    filename = "退了没-退休进度.png",
  } = opts;

  // 1. 全屏遮罩：盖住页面，显示"正在生成"提示
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position: fixed",
    "inset: 0",
    "z-index: 9999",
    "background-color: rgba(244,239,227,0.85)",
    "backdrop-filter: blur(2px)",
    "display: flex",
    "align-items: center",
    "justify-content: center",
  ].join(";");
  const hint = document.createElement("div");
  hint.textContent = "正在生成分享图片…";
  hint.style.cssText = "font-size:14px;color:#6b6358;";
  overlay.appendChild(hint);
  document.body.appendChild(overlay);

  // 2. 保存原样式，临时脱离文档流 + 加 padding/边框
  const prev = {
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    zIndex: el.style.zIndex,
    padding: el.style.padding,
    border: el.style.border,
    borderRadius: el.style.borderRadius,
    width: el.style.width,
    boxSizing: el.style.boxSizing,
    margin: el.style.margin,
  };
  const renderWidth = el.getBoundingClientRect().width;
  // 脱离文档流，移到屏幕左上角（被遮罩盖住），宽度变化不影响页面布局
  el.style.position = "fixed";
  el.style.left = "0";
  el.style.top = "0";
  el.style.zIndex = "10000";
  el.style.boxSizing = "border-box";
  el.style.width = `${renderWidth + padding * 2 + 2}px`;
  el.style.padding = `${padding}px`;
  el.style.border = "1px solid rgba(28,26,23,0.15)";
  el.style.borderRadius = "8px";
  el.style.margin = "0";

  // 等待两帧确保样式与布局完全生效
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  try {
    const dataUrl = await toPng(el, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#f5f1e8",
      cacheBust: true,
      skipFonts: false,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
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
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("cancel") || msg.includes("Abort")) return;
      } finally {
        Filesystem.deleteFile({
          path: filename,
          directory: Directory.Cache,
        }).catch(() => {});
      }
    }

    // 浏览器：优先原生分享
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
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    // 回退：触发下载
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  } finally {
    // 3. 恢复原样式并移除遮罩
    el.style.position = prev.position;
    el.style.left = prev.left;
    el.style.top = prev.top;
    el.style.zIndex = prev.zIndex;
    el.style.padding = prev.padding;
    el.style.border = prev.border;
    el.style.borderRadius = prev.borderRadius;
    el.style.width = prev.width;
    el.style.boxSizing = prev.boxSizing;
    el.style.margin = prev.margin;
    overlay.remove();
  }
}
