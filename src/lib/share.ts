import { toPng } from "html-to-image";

/**
 * 将目标 DOM 截图为 PNG 并分享。
 * 优先使用 Web Share API（移动端原生分享面板），不支持时回退为下载图片。
 */
export async function shareElement(
  el: HTMLElement,
  filename = "退了没-退休进度.png",
): Promise<void> {
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
}
