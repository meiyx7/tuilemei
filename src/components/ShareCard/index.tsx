import { useState } from 'react';
import { View, Canvas, Text, Button, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { formatMoney, todayYm } from '@/lib/pension';
import { getMiniCodeImage } from '@/lib/cloud';
import type { PensionResult, RetirementAgeResult } from '@/lib/types';
import './index.scss';

interface ShareCardProps {
  open: boolean;
  onClose: () => void;
  retirement: RetirementAgeResult;
  pension: PensionResult;
  /** 职业生涯进度 0~1,用于圆环百分比 */
  careerProgress: number;
  /** 参加工作时间 YYYY-MM,用于时间轴起点 */
  workStartDate: string;
}

/**
 * 分享卡片:用 Canvas 2d 绘制一张与首页视觉一致的分享图,保存到相册。
 *
 * 布局(680×1240 逻辑像素,2x 绘制避免模糊):
 *  ┌──────────────────────────┐
 *  │ [邮戳] 退了没 · 退休倒计时  │  顶部标题
 *  │ ──────────                │
 *  │       ┌──────┐            │
 *  │       │ 圆环  │            │  圆环(Canvas arc 绘制)
 *  │       │ 45%  │            │
 *  │       └──────┘            │
 *  │ 距离退休还有               │
 *  │ 18 年 06 月               │  倒计时大数字
 *  │ · 约 6750 天              │
 *  │ 法定退休年龄 63 岁          │
 *  │ ──────────                │
 *  │ ●━━━━○──────────●        │  时间轴
 *  │ 参加工作 当前 法定退休      │
 *  │ ──────────                │
 *  │ [小程序码] 扫码查看你的     │  底部二维码
 *  │           退了没·tuilemei   │
 *  └──────────────────────────┘
 */
export default function ShareCard({
  open,
  onClose,
  retirement,
  pension,
  careerProgress,
  workStartDate,
}: ShareCardProps) {
  const [tempPath, setTempPath] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');

  // 卡片逻辑尺寸
  const CARD_W = 680;
  const CARD_H = 1240;

  /** 获取小程序码图片(异步) */
  async function loadMiniCode(): Promise<string> {
    setCodeStatus('loading');
    const url = await getMiniCodeImage();
    if (url) {
      setCodeStatus('ok');
      return url;
    }
    setCodeStatus('fail');
    return '';
  }

  /** 网络图片转临时路径(Canvas createImage 需要本地路径) */
  function downloadImage(url: string): Promise<string> {
    return new Promise((resolve) => {
      if (!url) { resolve(''); return; }
      Taro.downloadFile({
        url,
        success: (r) => resolve(r.tempFilePath),
        fail: () => resolve(''),
      });
    });
  }

  /** 主绘制流程 */
  async function drawCard() {
    setDrawing(true);
    setSaved(false);
    try {
      // 1. 获取 Canvas 节点(Taro 4 新 API)
      const node = await new Promise<any>((resolveNode) => {
        const query = Taro.createSelectorQuery();
        query.select('#share-canvas').fields({ node: true, size: true }).exec((res) => {
          resolveNode(res?.[0]);
        });
      });
      if (!node?.node) {
        console.warn('[share] Canvas 节点未就绪');
        setDrawing(false);
        return;
      }
      const canvas = node.node;
      const ctx = canvas.getContext('2d');
      const dpr = Taro.getWindowInfo?.().pixelRatio || Taro.getSystemInfoSync().pixelRatio || 2;
      canvas.width = CARD_W * dpr;
      canvas.height = CARD_H * dpr;
      ctx.scale(dpr, dpr);

      const retired = pension.remaining.totalDays <= 0;
      const pct = Math.round(careerProgress * 100);

      // 2. 背景:paper 色 + 圆角 + 细边框
      ctx.fillStyle = '#f4efe3';
      roundRect(ctx, 0, 0, CARD_W, CARD_H, 16);
      ctx.fill();
      ctx.strokeStyle = '#e2d9c3';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. 右上角装饰邮戳
      drawDecoStamp(ctx, CARD_W - 70, 70);

      // 4. 顶部标题区(对齐首页:退休进度 · Countdown + 今天您退了没)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8a9796';
      ctx.font = '18px monospace';
      ctx.fillText('退休进度 · Countdown', 40, 65);

      ctx.fillStyle = '#1c1a17';
      ctx.font = 'bold 42px serif';
      ctx.fillText('今天您退了没', 40, 110);

      drawAlmanacRule(ctx, 40, 140, CARD_W - 80);

      // 5. 圆环(Canvas arc 直接绘制,与首页 SVG 视觉一致)
      const ringCx = CARD_W / 2;
      const ringCy = 300;
      const ringR = 120;
      const ringStroke = 16;
      // 底环
      ctx.strokeStyle = '#E2D9C3';
      ctx.lineWidth = ringStroke;
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      // 进度环(从顶部顺时针,lineCap=round 双端圆角)
      if (pct > 0) {
        ctx.strokeStyle = '#C8893B';
        ctx.lineWidth = ringStroke;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const startA = -Math.PI / 2;
        const endA = startA + (Math.PI * 2 * pct) / 100;
        ctx.arc(ringCx, ringCy, ringR, startA, endA);
        ctx.stroke();
      }
      // 圆环内文字
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8a9796';
      ctx.font = '20px serif';
      ctx.fillText('已过', ringCx, ringCy - 30);
      ctx.fillStyle = '#1c1a17';
      ctx.font = 'bold 64px serif';
      ctx.fillText(`${pct}`, ringCx, ringCy + 20);
      ctx.font = '24px serif';
      ctx.fillStyle = '#1c1a17';
      ctx.fillText('%', ringCx + 35, ringCy + 20);
      ctx.font = '20px serif';
      ctx.fillStyle = '#8a9796';
      ctx.fillText('职业生涯', ringCx, ringCy + 55);

      // 6. 倒计时数字区(固定坐标,不依赖 measureText 避免字体加载导致重叠)
      ctx.textAlign = 'left';
      const cdY = 510;
      // 今日日期 + 标签
      const d = new Date();
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const todayLabel = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} 周${weekdays[d.getDay()]}`;
      ctx.fillStyle = '#8a9796';
      ctx.font = '22px serif';
      ctx.fillText(`${todayLabel} · ${retired ? '已到法定退休年龄' : '距离退休还有'}`, 40, cdY);

      if (retired) {
        ctx.fillStyle = '#b23a2e';
        ctx.font = 'bold 88px serif';
        ctx.fillText('到点了', 40, cdY + 90);
      } else {
        // 大数字:年 月(缩小字号确保年月+约天数一行内放下)
        const years = String(pension.remaining.years).padStart(2, '0');
        const months = String(pension.remaining.months).padStart(2, '0');
        // 年(大)
        ctx.fillStyle = '#1c1a17';
        ctx.font = 'bold 96px serif';
        ctx.fillText(years, 40, cdY + 85);
        ctx.font = '28px serif';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText('年', 155, cdY + 85);
        // 月(小)
        ctx.font = 'bold 64px serif';
        ctx.fillStyle = '#1c1a17';
        ctx.fillText(months, 205, cdY + 85);
        ctx.font = '24px serif';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText('月', 285, cdY + 85);
        // 约天数(同一行,接在月后面)
        ctx.font = '22px monospace';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText(`· 约 ${formatMoney(pension.remaining.totalDays)} 天`, 330, cdY + 85);
      }

      // 法定退休年龄 + 延迟信息(同一行,对齐首页 age-line 布局)
      const ageY = cdY + 175;
      ctx.font = '22px serif';
      ctx.fillStyle = '#5b6b6a';
      const ageText = `法定退休年龄 ${retirement.years} 岁${retirement.months > 0 ? ` ${retirement.months} 个月` : ''}`;
      ctx.fillText(ageText, 40, ageY);
      if (retirement.delayed) {
        // 延迟信息接在年龄后面同一行(对齐首页 age-line 的 flex-wrap 布局)
        const ageW = ctx.measureText(ageText).width;
        ctx.fillStyle = '#c8893b';
        ctx.font = '20px monospace';
        ctx.fillText(`(延迟 ${retirement.delayedMonths} 个月)`, 40 + ageW + 8, ageY);
      }

      // 7. 分割线
      drawAlmanacRule(ctx, 40, 740, CARD_W - 80);

      // 8. 时间轴(四个节点:参加工作、缴满15年、当前、法定退休,对齐首页)
      const minContribDate = minContributionDate(workStartDate, 15);
      drawTimeline(ctx, 40, 780, CARD_W - 80, workStartDate, minContribDate, retirement.retirementDate);

      // 9. 底部分割线
      drawAlmanacRule(ctx, 40, 880, CARD_W - 80);

      // 10. 小程序码 + 引导文案
      const codeUrl = await loadMiniCode();
      let codeDrawn = false;
      if (codeUrl) {
        const localPath = await downloadImage(codeUrl);
        if (localPath) {
          const img = canvas.createImage();
          await new Promise<void>((resolveImg) => {
            img.onload = () => {
              const codeSize = 130;
              ctx.drawImage(img, 40, 920, codeSize, codeSize);
              codeDrawn = true;
              resolveImg();
            };
            img.onerror = () => resolveImg();
            img.src = localPath;
          });
        }
      }

      // 引导文案(二维码右侧)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1c1a17';
      ctx.font = 'bold 28px serif';
      ctx.fillText('扫码查看你的', 200, 960);
      ctx.fillStyle = '#5b6b6a';
      ctx.font = '22px serif';
      ctx.fillText('退休进度与养老金测算', 200, 995);

      // 二维码加载失败提示
      if (!codeDrawn) {
        ctx.fillStyle = '#e2d9c3';
        ctx.strokeStyle = '#e2d9c3';
        ctx.lineWidth = 1;
        roundRect(ctx, 40, 920, 130, 130, 8);
        ctx.stroke();
        ctx.fillStyle = '#8a9796';
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('小程序码', 105, 980);
        ctx.fillText('加载失败', 105, 1005);
      }

      // 11. 底部品牌签名
      ctx.textAlign = 'right';
      ctx.fillStyle = '#b23a2e';
      ctx.font = 'bold 20px serif';
      ctx.fillText('退了没 · tuilemei', CARD_W - 40, CARD_H - 40);

      // 12. 导出图片
      await new Promise<void>((resolveExport) => {
        Taro.canvasToTempFilePath({
          canvas,
          x: 0, y: 0,
          width: CARD_W, height: CARD_H,
          destWidth: CARD_W * dpr, destHeight: CARD_H * dpr,
          fileType: 'png',
          quality: 1,
          success: (r) => {
            setTempPath(r.tempFilePath);
            resolveExport();
          },
          fail: (e) => {
            console.warn('[share] 导出失败', e);
            resolveExport();
          },
        });
      });
    } catch (e) {
      console.error('[share] 绘制失败', e);
      Taro.showToast({ title: '生成失败,请重试', icon: 'none' });
    } finally {
      setDrawing(false);
    }
  }

  /** 保存到相册 */
  async function handleSave() {
    if (!tempPath) return;
    try {
      await Taro.saveImageToPhotosAlbum({ filePath: tempPath });
      setSaved(true);
      Taro.showToast({ title: '已保存到相册', icon: 'success' });
    } catch (e: any) {
      if (e?.errMsg?.includes('auth deny') || e?.errMsg?.includes('authorize')) {
        Taro.showModal({
          title: '需要相册权限',
          content: '保存图片需要相册权限,请在设置中开启',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm) Taro.openSetting();
          },
        });
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' });
      }
    }
  }

  if (!open) return null;

  return (
    <View className="share-overlay" catchMove onClick={onClose}>
      <View className="share-card" onClick={(e) => e.stopPropagation()}>
        <View className="share-card-title">
          <Text className="share-card-title-text">分享给朋友</Text>
          <Text className="share-card-close" onClick={onClose}>×</Text>
        </View>

        {/* Canvas 隐藏在屏幕外,仅用于绘制导出 */}
        <View className="share-canvas-wrap">
          <Canvas
            type="2d"
            id="share-canvas"
            style={{ width: `${CARD_W}px`, height: `${CARD_H}px` }}
          />
        </View>

        {/* 预览图(用 Taro Image 组件,不用 img 标签) */}
        {tempPath ? (
          <View className="share-preview">
            <Image src={tempPath} className="share-preview-img" mode="widthFix" />
          </View>
        ) : (
          <View className="share-placeholder">
            <Text className="share-placeholder-text">
              {drawing ? '正在生成分享图...' : '点击下方按钮生成分享图'}
            </Text>
          </View>
        )}

        <View className="share-actions">
          <Button
            className="share-btn share-btn-primary"
            loading={drawing}
            disabled={drawing}
            onClick={drawCard}
          >
            {tempPath ? '重新生成' : '生成分享图'}
          </Button>
          <Button
            className="share-btn"
            disabled={!tempPath || drawing}
            onClick={handleSave}
          >
            {saved ? '已保存' : '保存到相册'}
          </Button>
        </View>

        <Text className="share-tip">
          保存后可发朋友圈或微信群,长按图片可识别小程序码
        </Text>
      </View>
    </View>
  );
}

/* ---------- 绘制辅助函数 ---------- */

/** 圆角矩形路径 */
function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 年鉴式分割线(两端淡出) */
function drawAlmanacRule(ctx: any, x: number, y: number, w: number) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(226, 217, 195, 0)');
  grad.addColorStop(0.15, 'rgba(226, 217, 195, 1)');
  grad.addColorStop(0.85, 'rgba(226, 217, 195, 1)');
  grad.addColorStop(1, 'rgba(226, 217, 195, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, 1);
}

/** 右上角装饰邮戳(淡化圆环,对齐首页 deco-stamp) */
function drawDecoStamp(ctx: any, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-11 * Math.PI / 180);
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#b23a2e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#b23a2e';
  ctx.font = 'bold 16px serif';
  ctx.textAlign = 'center';
  ctx.fillText('退休', 0, -2);
  ctx.font = '9px monospace';
  ctx.fillText('RETIREMENT', 0, 13);
  ctx.restore();
}

/**
 * 绘制时间轴(四个节点:参加工作、缴满15年、当前、法定退休)
 * 节点样式对齐首页:外圆(边框)+ 内圆点,过去=印章红,当前=琥珀金,未来=灰。
 * 横线穿过外圆中心。
 */
function drawTimeline(
  ctx: any,
  x: number,
  y: number,
  w: number,
  workStartDate: string,
  minContribDate: string,
  retirementDate: string,
) {
  const nowYm = todayYm();
  const nowMonths = ymToMonths(nowYm);
  const nodes = [
    { label: '参加工作', date: workStartDate },
    { label: '缴满 15 年', date: minContribDate },
    { label: '当前', date: nowYm, current: true },
    { label: '法定退休', date: retirementDate },
  ].map((n) => ({
    ...n,
    past: ymToMonths(n.date) <= nowMonths,
    current: n.current ?? false,
  }));

  // 四个节点均匀分布
  const count = nodes.length;
  const positions = nodes.map((_, i) => x + (w * (i + 0.5)) / count);
  const dotY = y + 24; // 外圆中心(外圆半径 24,从 y 开始)

  // 横线(穿过外圆中心)
  ctx.strokeStyle = '#e2d9c3';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(positions[0], dotY);
  ctx.lineTo(positions[count - 1], dotY);
  ctx.stroke();

  // 进度线(到当前节点为止用琥珀色)
  const currentIdx = nodes.findIndex((n) => n.current);
  if (currentIdx > 0) {
    ctx.strokeStyle = '#c8893b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(positions[0], dotY);
    ctx.lineTo(positions[currentIdx], dotY);
    ctx.stroke();
  }

  // 节点:外圆(边框) + 内圆点(对齐首页 tl-dot-wrap + tl-dot 结构)
  const outerR = 24;  // 外圆半径(对应首页 56rpx)
  const innerR = 8;   // 内圆点半径(对应首页 16rpx)
  nodes.forEach((node, i) => {
    const cx = positions[i];

    // 外圆
    if (node.current) {
      ctx.fillStyle = '#c8893b'; // 琥珀金填充(tl-dot-current)
      ctx.strokeStyle = '#c8893b';
    } else if (node.past) {
      ctx.fillStyle = '#fbf8f0'; // 卡片底色(tl-dot-past 只改边框)
      ctx.strokeStyle = '#b23a2e'; // 印章红边框
    } else {
      ctx.fillStyle = '#fbf8f0'; // 卡片底色
      ctx.strokeStyle = '#e2d9c3'; // 灰边框
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, dotY, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 内圆点
    if (node.current) {
      ctx.fillStyle = '#f4efe3'; // paper(tl-dot-in-current)
    } else if (node.past) {
      ctx.fillStyle = '#b23a2e'; // 印章红(tl-dot-in-past)
    } else {
      ctx.fillStyle = '#8a9796'; // 灰(tl-dot-in-future)
    }
    ctx.beginPath();
    ctx.arc(cx, dotY, innerR, 0, Math.PI * 2);
    ctx.fill();

    // 标签(对齐首页:当前琥珀金/过去墨黑/未来灰)
    ctx.textAlign = 'center';
    ctx.font = '600 20px serif';
    ctx.fillStyle = node.current ? '#c8893b' : node.past ? '#1c1a17' : '#5b6b6a';
    ctx.fillText(node.label, cx, dotY + outerR + 24);

    // 日期
    ctx.font = '16px monospace';
    ctx.fillStyle = '#5b6b6a';
    ctx.fillText(node.date, cx, dotY + outerR + 46);
  });
}

/** 年月转月数(与首页 ymToMonths 一致) */
function ymToMonths(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + m;
}

/** 缴满 N 年的月份(与首页 minContributionDate 一致) */
function minContributionDate(workStart: string, years: number): string {
  const [y, m] = workStart.split('-').map(Number);
  const total = y * 12 + (m - 1) + years * 12;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}
