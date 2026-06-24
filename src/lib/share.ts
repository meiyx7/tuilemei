import { toPng } from "html-to-image";

interface ShareOptions {
  /** 截图前需要临时隐藏的元素（如分享按钮本身），避免状态文字被截入 */
  hideElements?: HTMLElement[];
  /** 截图区域内边距（px），避免内容紧贴边框 */
  padding?: number;
  filename?: string;
}

/**
 * 将目标 DOM 截图为 PNG 并分享。
 * 优先使用 Web Share API（移动端原生分享面板），不支持时回退为下载图片。
 */
export async function shareElement(
  el: HTMLElement,
  opts: ShareOptions = {},
): Promise<void> {
  const {
    hideElements = [],
    padding = 32,
    filename = "退了没-退休进度.png",
  } = opts;

  // 1. 临时隐藏指定元素
  const prevDisplay = hideElements.map((e) => e.style.display);
  hideElements.forEach((e) => (e.style.display = "none"));

  // 2. 临时给目标加内边距与边框样式，并固定宽度避免换行，截图后恢复
  const prevPadding = el.style.padding;
  const prevBorder = el.style.border;
  const prevBorderRadius = el.style.borderRadius;
  const prevWidth = el.style.width;
  const prevBoxSizing = el.style.boxSizing;
  el.style.padding = `${padding}px`;
  el.style.border = "1px solid rgba(28,26,23,0.15)";
  el.style.borderRadius = "8px";
  // 固定宽度为当前渲染宽度，防止加 padding 后容器收缩导致文字换行
  const renderWidth = el.getBoundingClientRect().width;
  el.style.width = `${renderWidth}px`;
  el.style.boxSizing = "border-box";

  // 等待一帧让样式生效
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  try {
    const dataUrl = await toPng(el, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#f5f1e8",
      cacheBust: true,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: "image/png" });

    // 优先原生分享（需 https 或 localhost，且支持文件分享）
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "退了没 · 我的退休进度",
          text: "看看我离退休还有多久",
        });
        return;
      } catch {
        // 用户取消或分享失败，回退下载
      }
    }

    // 回退：触发下载
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  } finally {
    // 3. 恢复样式与显示
    hideElements.forEach((e, i) => (e.style.display = prevDisplay[i]));
    el.style.padding = prevPadding;
    el.style.border = prevBorder;
    el.style.borderRadius = prevBorderRadius;
    el.style.width = prevWidth;
    el.style.boxSizing = prevBoxSizing;
  }
}
