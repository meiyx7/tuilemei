// 退了没小程序 —— 分享卡片生成（Canvas 2D 绘制 + 保存相册）
// 小程序无法截图 DOM，改用 Canvas 手绘退休进度卡片
// 内容与首页 dashboard 布局严格一致：标题→圆环→倒计时→进度轴→声明

import Taro from '@tarojs/taro';
import type { PensionResult, RetirementAgeResult } from './types';
import { formatMoney, parseYearMonth } from './pension';

interface ShareData {
  retirement: RetirementAgeResult;
  pension: PensionResult;
  careerProgress: number;
  streak: number;
  workStartDate: string;
  checked: boolean;
}

/** rpx 转 px（用于 Canvas 绘图，Canvas 以 px 为单位） */
function rpx2px(rpx: number): number {
  const sys = Taro.getWindowInfo?.() || Taro.getSystemInfoSync();
  return (rpx / 750) * sys.windowWidth;
}

/** 缴满 N 年的月份 */
function minContributionDate(workStart: string, years: number): string {
  const { year, month } = parseYearMonth(workStart);
  const total = year * 12 + (month - 1) + years * 12;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * 在 Canvas 2D 上下文上绘制分享卡片（与首页布局一致）。
 * 调用方需先创建 Canvas 并获取 2d 上下文，传入 canvas 节点用于尺寸设置。
 */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  data: ShareData,
): void {
  const { retirement, pension, careerProgress, streak, workStartDate, checked } = data;
  const W = rpx2px(680);
  const H = rpx2px(1520);
  canvas.width = W;
  canvas.height = H;
  const px = rpx2px;

  // ---- 背景 ----
  ctx.fillStyle = '#f4efe3';
  ctx.fillRect(0, 0, W, H);

  // 背景点阵纹理
  ctx.fillStyle = 'rgba(28,26,23,0.04)';
  for (let x = 0; x < W; x += px(44)) {
    for (let y = 0; y < H; y += px(44)) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const pad = px(48);
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;

  // 卡片底
  ctx.fillStyle = '#fbf8f0';
  ctx.strokeStyle = '#e2d9c3';
  ctx.lineWidth = 1;
  roundRect(ctx, pad, pad, cardW, cardH, px(8));
  ctx.fill();
  ctx.stroke();

  const innerX = pad + px(32);
  const innerW = cardW - px(64);

  // ========== 1. 章节标题：退休进度 ==========
  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${px(22)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('退休进度 · COUNTDOWN', innerX, pad + px(56));

  ctx.fillStyle = '#1c1a17';
  ctx.font = `bold ${px(48)}px serif`;
  ctx.fillText('今天您退了没', innerX, pad + px(110));

  drawRule(ctx, innerX, pad + px(140), innerW);

  // ========== 2. 圆环进度 ==========
  const cx = pad + cardW / 2;
  const cy = pad + px(380);
  const r = px(140);
  const ringW = px(28);
  const pct = Math.round(careerProgress * 100);

  // 底环
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#E2D9C3';
  ctx.lineWidth = ringW;
  ctx.stroke();

  // 进度环（从顶部顺时针）
  if (pct > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pct / 100));
    ctx.strokeStyle = '#C8893B';
    ctx.lineWidth = ringW;
    ctx.stroke();
  }

  // 中心遮罩圆
  ctx.beginPath();
  ctx.arc(cx, cy, r - ringW / 2 - px(4), 0, Math.PI * 2);
  ctx.fillStyle = '#f4efe3';
  ctx.fill();

  // 中心文字
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${px(22)}px serif`;
  ctx.fillText('已过', cx, cy - px(58));

  ctx.fillStyle = '#1c1a17';
  ctx.font = `bold ${px(72)}px monospace`;
  ctx.fillText(`${pct}%`, cx, cy + px(8));

  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${px(22)}px serif`;
  ctx.fillText('职业生涯', cx, cy + px(48));

  // 打卡状态徽章
  ctx.fillStyle = '#b23a2e';
  ctx.font = `${px(20)}px monospace`;
  ctx.fillText(checked ? `✓ 连续 ${streak} 天` : '点击 -1', cx, cy + px(88));

  // 装饰邮戳（右上角淡化圆形印章）
  ctx.save();
  ctx.translate(pad + cardW - px(76), pad + px(76));
  ctx.rotate(-0.19);
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#b23a2e';
  ctx.lineWidth = px(3);
  ctx.beginPath();
  ctx.arc(0, 0, px(60), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#b23a2e';
  ctx.font = `bold ${px(28)}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('退休', 0, px(4));
  ctx.font = `${px(14)}px monospace`;
  ctx.fillText('RETIREMENT', 0, px(24));
  ctx.restore();

  // ========== 3. 倒计时数字 ==========
  const { remaining } = pension;
  const retired = remaining.totalDays <= 0;

  ctx.textAlign = 'center';
  if (retired) {
    ctx.fillStyle = '#b23a2e';
    ctx.font = `bold ${px(96)}px serif`;
    ctx.fillText('到点了', cx, pad + px(620));
  } else {
    // 年（大号）
    const yearsStr = String(remaining.years).padStart(2, '0');
    ctx.fillStyle = '#1c1a17';
    ctx.font = `bold ${px(96)}px monospace`;
    ctx.fillText(yearsStr, cx - px(110), pad + px(620));

    ctx.fillStyle = '#5b6b6a';
    ctx.font = `${px(36)}px serif`;
    ctx.fillText('年', cx - px(50), pad + px(620));

    // 月（中号）
    const monthsStr = String(remaining.months).padStart(2, '0');
    ctx.fillStyle = '#1c1a17';
    ctx.font = `bold ${px(64)}px monospace`;
    ctx.fillText(monthsStr, cx + px(20), pad + px(620));

    ctx.fillStyle = '#5b6b6a';
    ctx.font = `${px(28)}px serif`;
    ctx.fillText('月', cx + px(70), pad + px(620));

    // 约天数
    ctx.fillStyle = '#5b6b6a';
    ctx.font = `${px(26)}px serif`;
    ctx.fillText(`· 约 ${formatMoney(remaining.totalDays)} 天`, cx, pad + px(660));
  }

  // ========== 4. 退休年龄信息 ==========
  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${px(28)}px serif`;
  ctx.textAlign = 'center';
  const ageText = `法定退休年龄 ${retirement.years} 岁${retirement.months > 0 ? ` ${retirement.months} 个月` : ''}`;
  ctx.fillText(ageText, cx, pad + px(720));

  if (retirement.delayed) {
    ctx.fillStyle = '#c8893b';
    ctx.font = `${px(24)}px serif`;
    ctx.fillText(`（延迟 ${retirement.delayedMonths} 个月）`, cx, pad + px(752));
  }

  // ========== 5. 章节标题：进度轴 ==========
  drawRule(ctx, innerX, pad + px(800), innerW);

  ctx.fillStyle = '#5b6b6a';
  ctx.font = `${px(22)}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('进度轴 · TIMELINE', innerX, pad + px(840));

  ctx.fillStyle = '#1c1a17';
  ctx.font = `bold ${px(36)}px serif`;
  ctx.fillText('从入职到退休', innerX, pad + px(884));

  drawRule(ctx, innerX, pad + px(910), innerW);

  // ========== 6. 时间轴 ==========
  const tlY = pad + px(980);
  const tlStartX = innerX + px(40);
  const tlEndX = innerX + innerW - px(40);
  const tlW = tlEndX - tlStartX;

  // 底线
  ctx.strokeStyle = '#e2d9c3';
  ctx.lineWidth = px(3);
  ctx.beginPath();
  ctx.moveTo(tlStartX, tlY);
  ctx.lineTo(tlEndX, tlY);
  ctx.stroke();

  // 进度线
  if (careerProgress > 0) {
    ctx.strokeStyle = '#c8893b';
    ctx.lineWidth = px(3);
    ctx.beginPath();
    ctx.moveTo(tlStartX, tlY);
    ctx.lineTo(tlStartX + tlW * careerProgress, tlY);
    ctx.stroke();
  }

  // 三个节点
  const nodes = [
    { label: '参加工作', date: workStartDate },
    { label: '缴满 15 年', date: minContributionDate(workStartDate, 15) },
    { label: '法定退休', date: retirement.retirementDate },
  ];

  nodes.forEach((node, i) => {
    const x = tlStartX + (tlW / (nodes.length - 1)) * i;

    // 圆点
    ctx.beginPath();
    ctx.arc(x, tlY, px(14), 0, Math.PI * 2);
    ctx.fillStyle = '#fbf8f0';
    ctx.fill();
    ctx.strokeStyle = '#c8893b';
    ctx.lineWidth = px(3);
    ctx.stroke();

    // 标签
    ctx.fillStyle = '#1c1a17';
    ctx.font = `${px(24)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(node.label, x, tlY + px(44));

    // 日期
    ctx.fillStyle = '#5b6b6a';
    ctx.font = `${px(20)}px monospace`;
    ctx.fillText(node.date, x, tlY + px(72));
  });

  // 当前位置标记（在进度线末端）
  if (careerProgress > 0 && careerProgress < 1) {
    const nowX = tlStartX + tlW * careerProgress;
    ctx.fillStyle = '#b23a2e';
    ctx.beginPath();
    ctx.arc(nowX, tlY, px(8), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b23a2e';
    ctx.font = `${px(20)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('当前', nowX, tlY - px(20));
  }

  // ========== 7. 底部声明 ==========
  drawRule(ctx, innerX, pad + px(1180), innerW);

  ctx.fillStyle = '#8a9796';
  ctx.font = `${px(20)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`退了没 · 连续打卡 ${streak} 天 · 结果仅供参考`, W / 2, H - pad - px(28));

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
