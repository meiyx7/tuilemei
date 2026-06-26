// 退了没小程序 —— 分享卡片生成（Canvas 2D 绘制 + 保存相册）
// 小程序无法截图 DOM，改用 Canvas 手绘退休进度卡片
// 内容与首页 dashboard 布局严格一致：标题→圆环→倒计时→进度轴→声明

import Taro from '@tarojs/taro';
import type { PensionResult, RetirementAgeResult } from './types';
import { formatMoney, parseYearMonth, todayYm } from './pension';

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

/** 年月转月数（与 dashboard 的 ymToMonths 保持一致） */
function ymToMonths(ym: string): number {
  const { year, month } = parseYearMonth(ym);
  return year * 12 + month;
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
  const H = rpx2px(1280);
  // 高清渲染：按设备像素比放大绘制缓冲区，ctx.scale 后绘制代码仍用逻辑 px，
  // 导出的图片为 dpr 倍分辨率，消除马赛克/锯齿
  const sys = Taro.getWindowInfo?.() || Taro.getSystemInfoSync();
  const dpr = sys.pixelRatio || 2;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.scale(dpr, dpr);
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
  const r = px(170);
  const ringW = px(22);
  const pct = Math.round(careerProgress * 100);

  // 底环
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#E2D9C3';
  ctx.lineWidth = ringW;
  ctx.stroke();

  // 进度环（从顶部顺时针，lineCap=round 自然得到圆角端点，与首页 ring-cap 一致）
  if (pct > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pct / 100));
    ctx.strokeStyle = '#C8893B';
    ctx.lineWidth = ringW;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt'; // 复位，避免影响后续线段
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
  const countdownY = pad + px(620);

  if (retired) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b23a2e';
    ctx.font = `bold ${px(96)}px serif`;
    ctx.fillText('到点了', cx, countdownY);
  } else {
    // 用 measureText 精确测量各部分宽度，整体居中后左对齐依次绘制，
    // 避免大号字体居中定位时相邻文字重叠
    const parts = [
      { text: String(remaining.years).padStart(2, '0'), font: `bold ${px(96)}px monospace`, color: '#1c1a17' },
      { text: '年', font: `${px(36)}px serif`, color: '#5b6b6a' },
      { text: String(remaining.months).padStart(2, '0'), font: `bold ${px(64)}px monospace`, color: '#1c1a17' },
      { text: '月', font: `${px(28)}px serif`, color: '#5b6b6a' },
    ];
    let totalW = 0;
    for (const p of parts) {
      ctx.font = p.font;
      totalW += ctx.measureText(p.text).width;
    }
    let drawX = cx - totalW / 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const p of parts) {
      ctx.font = p.font;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, drawX, countdownY);
      drawX += ctx.measureText(p.text).width;
    }

    // 约天数
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5b6b6a';
    ctx.font = `${px(26)}px serif`;
    ctx.fillText(`· 约 ${formatMoney(remaining.totalDays)} 天`, cx, countdownY + px(40));
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

  // ========== 6. 时间轴（与首页 Timeline 组件逻辑严格一致） ==========
  const tlY = pad + px(980);
  const tlStartX = innerX + px(40);
  const tlEndX = innerX + innerW - px(40);
  const tlW = tlEndX - tlStartX;

  // 节点列表：与 dashboard Timeline 入参一致
  const nowMonths = ymToMonths(todayYm());
  interface TlNode { label: string; date: string; current?: boolean; past?: boolean }
  const baseNodes: TlNode[] = [
    { label: '参加工作', date: workStartDate },
    { label: '缴满 15 年', date: minContributionDate(workStartDate, 15) },
    { label: '法定退休', date: retirement.retirementDate },
  ];
  // 过滤掉日期等于当前月的节点（与 Timeline.realNodes 一致）
  const realNodes = baseNodes.filter((n) => ymToMonths(n.date) !== nowMonths);
  const sorted = [...realNodes].sort((a, b) => ymToMonths(a.date) - ymToMonths(b.date));
  // 找到当前节点应插入的位置（第一个 date > nowMonths 的索引）
  let insertIdx = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    if (ymToMonths(sorted[i].date) > nowMonths) {
      insertIdx = i;
      break;
    }
  }
  // 插入"当前"节点
  const resolved: TlNode[] = [
    ...sorted.slice(0, insertIdx),
    { label: '当前', date: todayYm(), current: true },
    ...sorted.slice(insertIdx),
  ];
  const finalNodes = resolved.map((n) => ({
    ...n,
    past: n.current ? true : ymToMonths(n.date) <= nowMonths,
  }));

  // 进度计算（与 dashboard progressOfCurrent 一致）
  let progress: number;
  const currentIdx = finalNodes.findIndex((n) => n.current);
  if (currentIdx === -1) {
    const lastPastIdx = finalNodes.map((n) => n.past).lastIndexOf(true);
    if (lastPastIdx === -1) progress = 0;
    else if (lastPastIdx === finalNodes.length - 1) progress = 100;
    else progress = ((lastPastIdx + 0.5) / (finalNodes.length - 1)) * 100;
  } else {
    progress = (currentIdx / (finalNodes.length - 1)) * 100;
  }

  // 底线
  ctx.strokeStyle = '#e2d9c3';
  ctx.lineWidth = px(3);
  ctx.beginPath();
  ctx.moveTo(tlStartX, tlY);
  ctx.lineTo(tlEndX, tlY);
  ctx.stroke();

  // 进度线
  if (progress > 0) {
    ctx.strokeStyle = '#c8893b';
    ctx.lineWidth = px(3);
    ctx.beginPath();
    ctx.moveTo(tlStartX, tlY);
    ctx.lineTo(tlStartX + (tlW * progress) / 100, tlY);
    ctx.stroke();
  }

  // 节点（等距分布）
  finalNodes.forEach((node, i) => {
    const x = tlStartX + (tlW / (finalNodes.length - 1)) * i;
    const isCurrent = !!node.current;
    const isPast = !!node.past;

    // 圆点
    ctx.beginPath();
    ctx.arc(x, tlY, px(14), 0, Math.PI * 2);
    ctx.fillStyle = isCurrent ? '#c8893b' : '#fbf8f0';
    ctx.fill();
    ctx.strokeStyle = isCurrent ? '#c8893b' : isPast ? '#b23a2e' : '#c8893b';
    ctx.lineWidth = px(3);
    ctx.stroke();

    // 标签
    ctx.fillStyle = isCurrent ? '#c8893b' : isPast ? '#1c1a17' : '#5b6b6a';
    ctx.font = `${px(24)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(node.label, x, tlY + px(44));

    // 日期
    ctx.fillStyle = '#5b6b6a';
    ctx.font = `${px(20)}px monospace`;
    ctx.fillText(node.date, x, tlY + px(72));
  });

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
