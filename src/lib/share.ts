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

  // 1. 全屏遮罩：盖住页面，显示"正在生成"提示卡片
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position: fixed",
    "inset: 0",
    "z-index: 9999",
    "background-color: rgba(28,26,23,0.35)",
    "backdrop-filter: blur(4px)",
    "-webkit-backdrop-filter: blur(4px)",
    "display: flex",
    "align-items: center",
    "justify-content: center",
  ].join(";");
  const card = document.createElement("div");
  card.style.cssText = [
    "display: flex",
    "align-items: center",
    "gap: 12px",
    "padding: 18px 24px",
    "background-color: #f5f1e8",
    "border: 1px solid rgba(28,26,23,0.12)",
    "border-radius: 12px",
    "box-shadow: 0 12px 32px rgba(28,26,23,0.18)",
  ].join(";");
  // 旋转加载图标（SVG，与应用印章色调一致）
  const spinner = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  spinner.setAttribute("width", "20");
  spinner.setAttribute("height", "20");
  spinner.setAttribute("viewBox", "0 0 24 24");
  spinner.setAttribute("fill", "none");
  spinner.style.cssText = "animation: tlm-spin 0.8s linear infinite;";
  spinner.innerHTML =
    '<circle cx="12" cy="12" r="9" stroke="#C8893B" stroke-opacity="0.25" stroke-width="3"/><path d="M21 12a9 9 0 0 0-9-9" stroke="#C8893B" stroke-width="3" stroke-linecap="round"/>';
  const hint = document.createElement("span");
  hint.textContent = "正在生成分享图片…";
  hint.style.cssText = "font-size:14px;color:#3c3933;font-weight:500;";
  card.appendChild(spinner);
  card.appendChild(hint);
  overlay.appendChild(card);
  // 注入旋转动画（若页面尚未定义）
  if (!document.getElementById("tlm-spin-keyframe")) {
    const style = document.createElement("style");
    style.id = "tlm-spin-keyframe";
    style.textContent = "@keyframes tlm-spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }
  document.body.appendChild(overlay);

  // 2. 保存原样式，临时脱离文档流移到屏幕外 + 加 padding/边框/背景
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
    background: el.style.background,
    backgroundColor: el.style.backgroundColor,
  };
  const renderWidth = el.getBoundingClientRect().width;
  // 脱离文档流移到屏幕外，宽度变化不影响页面布局，且不会被用户看到
  el.style.position = "fixed";
  el.style.left = "-99999px";
  el.style.top = "0";
  el.style.zIndex = "0";
  el.style.boxSizing = "border-box";
  el.style.width = `${renderWidth + padding * 2 + 2}px`;
  el.style.padding = `${padding}px`;
  el.style.border = "1px solid rgba(28,26,23,0.15)";
  el.style.borderRadius = "8px";
  el.style.margin = "0";
  // 确保背景不透明（脱离原父容器后可能丢失背景）
  el.style.backgroundColor = "#f5f1e8";

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
    el.style.background = prev.background;
    el.style.backgroundColor = prev.backgroundColor;
    overlay.remove();
  }
}
