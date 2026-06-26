// 退了没小程序 —— 分享卡片生成（Canvas 2D 绘制 + 保存相册）
// 小程序无法截图 DOM，改用 Canvas 手绘退休进度卡片

import Taro from '@tarojs/taro';
import type { PensionResult, RetirementAgeResult } from './types';
import { formatMoney } from './pension';

interface ShareData {
  retirement: RetirementAgeResult;
  pension: PensionResult;
  careerProgress: number;
  streak: number;
}

/** rpx 转 px（用于 Canvas 绘图，Canvas 以 px 为单位） */
function rpx2px(rpx: number): number {
  const sys = Taro.getWindowInfo?.() || Taro.getSystemInfoSync();
  return (rpx / 750) * sys.windowWidth;
}

/**
 * 在 Canvas 2D 上下文上绘制分享卡片。
 * 调用方需先创建 Canvas 并获取 2d 上下文，传入 canvas 节点用于尺寸设置。
 */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: ShareData,
): void {
  const { retirement, pension, careerProgress, streak } = data;
  const W = rpx2px(680);
  const H = rpx2px(860);
  canvas.width = W;
  canvas.height = H;

  // 背景
  ctx.fillStyle = '#f4efe3';
  ctx.fillRect(0, 0, W, H);

  // 背景点阵纹理
  ctx.fillStyle = 'rgba(28,26,23,0.04)';
  for (let x = 0; x < W; x += rpx2px(44)) {
    for (let y = 0; y < H; y += rpx2px(44)) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const pad = rpx2px(48);
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;

  // 卡片底
  ctx.fillStyle = '#fbf8f0';
  ctx.strokeStyle = '#e2d9c3';
  ctx.lineWidth = 1;
  roundRect(ctx, pad, pad, cardW, cardH, rpx2px(8));
  ctx.fill();
  ctx.stroke();

  // ---- 标题 ----
  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${rpx2px(22)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('退休进度 · COUNTDOWN', pad + rpx2px(32), pad + rpx2px(56));

  ctx.fillStyle = '#1c1a17';
  ctx.font = `bold ${rpx2px(48)}px serif`;
  ctx.fillText('今天您退了没', pad + rpx2px(32), pad + rpx2px(110));

  // ---- 分割线 ----
  drawRule(ctx, pad + rpx2px(32), pad + rpx2px(140), cardW - rpx2px(64));

  const { remaining } = pension;
  const retired = remaining.totalDays <= 0;

  // ---- 倒计时数字 ----
  ctx.fillStyle = '#1c1a17';
  ctx.font = `bold ${rpx2px(120)}px monospace`;
  ctx.textAlign = 'left';
  const ymText = retired ? '到点了' : `${String(remaining.years).padStart(2, '0')}年 ${String(remaining.months).padStart(2, '0')}月`;
  ctx.fillText(ymText, pad + rpx2px(32), pad + rpx2px(280));

  if (!retired) {
    ctx.fillStyle = '#5b6b6a';
    ctx.font = `${rpx2px(26)}px serif`;
    ctx.fillText(`· 约 ${formatMoney(remaining.totalDays)} 天`, pad + rpx2px(32), pad + rpx2px(320));
  }

  // ---- 退休年龄信息 ----
  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${rpx2px(26)}px serif`;
  const ageText = `法定退休年龄 ${retirement.years} 岁${retirement.months > 0 ? ` ${retirement.months} 个月` : ''}`;
  ctx.fillText(ageText, pad + rpx2px(32), pad + rpx2px(380));

  if (retirement.delayed) {
    ctx.fillStyle = '#c8893b';
    ctx.fillText(`（延迟 ${retirement.delayedMonths} 个月）`, pad + rpx2px(32) + rpx2px(360), pad + rpx2px(380));
  }

  // ---- 进度环（简化为进度条） ----
  const barY = pad + rpx2px(440);
  const barW = cardW - rpx2px(64);
  ctx.fillStyle = '#e2d9c3';
  roundRect(ctx, pad + rpx2px(32), barY, barW, rpx2px(12), rpx2px(6));
  ctx.fill();
  ctx.fillStyle = '#b23a2e';
  roundRect(ctx, pad + rpx2px(32), barY, barW * careerProgress, rpx2px(12), rpx2px(6));
  ctx.fill();

  ctx.fillStyle = '#1c1a17';
  ctx.font = `bold ${rpx2px(36)}px monospace`;
  ctx.fillText(`${(careerProgress * 100).toFixed(0)}%`, pad + rpx2px(32), barY + rpx2px(56));
  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${rpx2px(24)}px serif`;
  ctx.fillText('职业生涯', pad + rpx2px(120), barY + rpx2px(56));

  // ---- 养老金 ----
  drawRule(ctx, pad + rpx2px(32), barY + rpx2px(90), cardW - rpx2px(64));

  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${rpx2px(22)}px monospace`;
  ctx.fillText('预计养老金 · PENSION', pad + rpx2px(32), barY + rpx2px(130));

  ctx.fillStyle = '#b23a2e';
  ctx.font = `bold ${rpx2px(72)}px monospace`;
  ctx.fillText(`${formatMoney(pension.totalMonthly)}`, pad + rpx2px(32), barY + rpx2px(195));

  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${rpx2px(26)}px serif`;
  ctx.fillText(`元/月 · 替代率 ${(pension.replacementRate * 100).toFixed(1)}%`, pad + rpx2px(32), barY + rpx2px(230));

  // ---- 底部 ----
  ctx.fillStyle = '#8a9796';
  ctx.font = `${rpx2px(20)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`退了没 · 连续打卡 ${streak} 天 · 结果仅供参考`, W / 2, H - pad - rpx2px(16));

  ctx.textAlign = 'left';
}

/** 导出 Canvas 为临时图片并保存到相册 */
export async function saveCanvasToAlbum(canvas: HTMLCanvasElement): Promise<boolean> {
  return new Promise((resolve) => {
    const query = Taro.createSelectorQuery();
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvasNode = res[0]?.node;
      if (!canvasNode) { resolve(false); return; }
      Taro.canvasToTempFilePath({
        canvas: canvasNode,
        success: async (tmpRes) => {
          try {
            await Taro.saveImageToPhotosAlbum({ filePath: tmpRes.tempFilePath });
            Taro.showToast({ title: '已保存到相册', icon: 'success' });
            resolve(true);
          } catch {
            Taro.showToast({ title: '保存失败，请授权相册权限', icon: 'none' });
            resolve(false);
          }
        },
        fail: () => { resolve(false); },
      });
    });
  });
}

// ---- 工具 ----
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawRule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.18, 'rgba(28,26,23,0.25)');
  grad.addColorStop(0.82, 'rgba(28,26,23,0.25)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, 1);
}
