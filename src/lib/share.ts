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
 * 实现要点：克隆目标元素到屏幕外可见区域（top:0, left:0, opacity:0 被遮罩盖住），
 * 给克隆体加 padding/边框后截图。原元素完全不动，页面布局无任何变化。
 * 克隆体保留在可视渲染区（不能 display:none 或负坐标），确保 html-to-image 能正确截图。
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
    "z-index: 99990",
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

  // 2. 克隆目标元素到屏幕外可见区域（被遮罩盖住，用户看不到）
  const renderWidth = el.getBoundingClientRect().width;
  const clone = el.cloneNode(true) as HTMLElement;
  // 克隆体定位到屏幕左上角（fixed），z-index 低于遮罩，被遮罩盖住
  // 必须保留在可视渲染区（不能用 display:none 或负坐标），否则 html-to-image 截图为空
  clone.style.cssText = [
    "position: fixed",
    "left: 0",
    "top: 0",
    "z-index: 99980",
    "box-sizing: border-box",
    `width: ${renderWidth + padding * 2 + 2}px`,
    `padding: ${padding}px`,
    "border: 1px solid rgba(28,26,23,0.15)",
    "border-radius: 8px",
    "margin: 0",
    "background-color: #f5f1e8",
  ].join(";");
  document.body.appendChild(clone);

  // 等待两帧确保克隆体渲染完成
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  try {
    const dataUrl = await toPng(clone, {
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
    // 3. 移除克隆体和遮罩，原元素完全未动
    clone.remove();
    overlay.remove();
  }
}
