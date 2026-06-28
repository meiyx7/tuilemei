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

      // 4. 顶部标题区
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8a9796';
      ctx.font = '18px monospace';
      ctx.fillText('RETIREMENT COUNTDOWN', 40, 65);

      ctx.fillStyle = '#1c1a17';
      ctx.font = 'bold 42px serif';
      ctx.fillText('退了没', 40, 110);

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
        // 大数字:年 月(固定坐标排列,避免重叠)
        const years = String(pension.remaining.years).padStart(2, '0');
        const months = String(pension.remaining.months).padStart(2, '0');
        // 年
        ctx.fillStyle = '#1c1a17';
        ctx.font = 'bold 110px serif';
        ctx.fillText(years, 40, cdY + 95);
        ctx.font = '32px serif';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText('年', 175, cdY + 95);
        // 月
        ctx.font = 'bold 80px serif';
        ctx.fillStyle = '#1c1a17';
        ctx.fillText(months, 230, cdY + 95);
        ctx.font = '28px serif';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText('月', 320, cdY + 95);
        // 约天数
        ctx.font = '22px monospace';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText(`· 约 ${formatMoney(pension.remaining.totalDays)} 天`, 40, cdY + 130);
      }

      // 法定退休年龄
      const ageY = cdY + 175;
      ctx.font = '22px serif';
      ctx.fillStyle = '#5b6b6a';
      const ageText = `法定退休年龄 ${retirement.years} 岁${retirement.months > 0 ? ` ${retirement.months} 个月` : ''}`;
      ctx.fillText(ageText, 40, ageY);
      if (retirement.delayed) {
        ctx.fillStyle = '#c8893b';
        ctx.font = '20px monospace';
        ctx.fillText(`(延迟 ${retirement.delayedMonths} 个月)`, 40, ageY + 30);
      }

      // 7. 分割线
      drawAlmanacRule(ctx, 40, 740, CARD_W - 80);

      // 8. 时间轴(三个节点:参加工作、当前、法定退休)
      drawTimeline(ctx, 40, 780, CARD_W - 80, workStartDate, retirement.retirementDate);

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
 * 绘制时间轴(三个节点:参加工作、当前、法定退休)
 * 横线穿过节点圆点中心,与首页时间轴视觉一致。
 */
function drawTimeline(
  ctx: any,
  x: number,
  y: number,
  w: number,
  workStartDate: string,
  retirementDate: string,
) {
  const nowYm = todayYm();
  const nodes = [
    { label: '参加工作', date: workStartDate, past: true, current: false },
    { label: '当前', date: nowYm, past: true, current: true },
    { label: '法定退休', date: retirementDate, past: false, current: false },
  ];

  // 三个节点的 x 坐标(均匀分布)
  const positions = [x + 20, x + w / 2, x + w - 20];
  const dotY = y + 10;

  // 横线(穿过圆点中心)
  ctx.strokeStyle = '#e2d9c3';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(positions[0], dotY);
  ctx.lineTo(positions[2], dotY);
  ctx.stroke();

  // 进度线(当前节点之前的部分用琥珀色)
  ctx.strokeStyle = '#c8893b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(positions[0], dotY);
  ctx.lineTo(positions[1], dotY);
  ctx.stroke();

  // 节点圆点
  nodes.forEach((node, i) => {
    const cx = positions[i];
    if (node.current) {
      // 当前:印章红实心 + 外环
      ctx.fillStyle = '#b23a2e';
      ctx.beginPath();
      ctx.arc(cx, dotY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b23a2e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, dotY, 12, 0, Math.PI * 2);
      ctx.stroke();
    } else if (node.past) {
      // 过去:琥珀金实心
      ctx.fillStyle = '#c8893b';
      ctx.beginPath();
      ctx.arc(cx, dotY, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 未来:空心
      ctx.fillStyle = '#f4efe3';
      ctx.strokeStyle = '#c8893b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, dotY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 标签
    ctx.textAlign = 'center';
    ctx.font = '20px serif';
    ctx.fillStyle = node.current ? '#b23a2e' : node.past ? '#1c1a17' : '#8a9796';
    ctx.fillText(node.label, cx, dotY + 28);

    // 日期
    ctx.font = '16px monospace';
    ctx.fillStyle = '#8a9796';
    ctx.fillText(node.date, cx, dotY + 50);
  });
}
