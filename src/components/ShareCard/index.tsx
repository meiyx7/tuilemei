import { useRef, useState } from 'react';
import { View, Canvas, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { formatMoney } from '@/lib/pension';
import { getMiniCodeImage } from '@/lib/cloud';
import type { PensionResult, RetirementAgeResult } from '@/lib/types';
import './index.scss';

interface ShareCardProps {
  open: boolean;
  onClose: () => void;
  retirement: RetirementAgeResult;
  pension: PensionResult;
}

/**
 * 分享卡片：用 Canvas 2d 绘制一张同首页风格的分享图，保存到相册。
 *
 * 布局（750×1180 逻辑像素，2x 绘制避免模糊）：
 *  ┌─────────────────────────┐
 *  │  退了没 · 退休倒计时      │  ← eyebrow + 标题
 *  │                         │
 *  │      距退休还有          │  ← 标签
 *  │    18 年 6 个月          │  ← 大数字
 *  │   · 约 6750 天           │
 *  │                         │
 *  │  法定退休年龄 63 岁       │
 *  │  ─────────────           │
 *  │  [小程序码]  扫码查看你的  │  ← 底部二维码 + 引导
 *  └─────────────────────────┘
 *
 * 颜色复用 tokens.scss：paper #f4efe3 / ink #1c1a17 / stamp #b23a2e / amber #c8893b
 */
export default function ShareCard({ open, onClose, retirement, pension }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tempPath, setTempPath] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [saved, setSaved] = useState(false);

  // 卡片逻辑尺寸（rpx 转 px 时按 750 设计稿换算）
  const CARD_W = 620;
  const CARD_H = 940;

  /** 获取小程序码图片（异步，绘制时 await） */
  async function loadMiniCode(): Promise<string> {
    return await getMiniCodeImage();
  }

  /** 网络图片转临时路径（Canvas 2d 的 createImage 需要本地路径） */
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
      // 1. 获取 Canvas 节点（Taro 4 新 API：fields({ node: true })）
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

      // 2. 背景：paper 色 + 圆角 + 细边框
      ctx.fillStyle = '#f4efe3';
      roundRect(ctx, 0, 0, CARD_W, CARD_H, 16);
      ctx.fill();
      ctx.strokeStyle = '#e2d9c3';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. 右上角装饰邮戳（淡化圆环，对齐首页 deco-stamp）
      drawDecoStamp(ctx, CARD_W - 70, 70);

      // 4. 顶部 eyebrow + 标题
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8a9796';
      ctx.font = '20px "SF Mono", Menlo, monospace';
      ctx.fillText('RETIREMENT COUNTDOWN', 40, 70);

      ctx.fillStyle = '#1c1a17';
      ctx.font = 'bold 44px "Songti SC", STSong, serif';
      ctx.fillText('退了没', 40, 120);

      // 5. 分割线（年鉴风两端淡出）
      drawAlmanacRule(ctx, 40, 150, CARD_W - 80);

      // 6. 倒计时主视觉
      const retired = pension.remaining.totalDays <= 0;
      const cy = 260;
      ctx.fillStyle = '#8a9796';
      ctx.font = '26px "Songti SC", STSong, serif';
      ctx.fillText(retired ? '已到法定退休年龄' : '距离退休还有', 40, cy);

      if (retired) {
        ctx.fillStyle = '#b23a2e';
        ctx.font = 'bold 96px "Songti SC", STSong, serif';
        ctx.fillText('到点了', 40, cy + 110);
      } else {
        // 大数字：年 月
        const years = String(pension.remaining.years).padStart(2, '0');
        const months = String(pension.remaining.months).padStart(2, '0');
        ctx.fillStyle = '#1c1a17';
        ctx.font = 'bold 128px "Songti SC", STSong, serif';
        ctx.fillText(years, 40, cy + 110);
        ctx.font = '36px "Songti SC", STSong, serif';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText('年', 40 + measureWidth(ctx, years, 'bold 128px "Songti SC", STSong, serif') + 10, cy + 110);

        // 月（接在年后）
        const yearW = measureWidth(ctx, years, 'bold 128px "Songti SC", STSong, serif');
        const yearUnitW = measureWidth(ctx, '年', '36px "Songti SC", STSong, serif');
        const monthX = 40 + yearW + yearUnitW + 30;
        ctx.font = 'bold 96px "Songti SC", STSong, serif';
        ctx.fillStyle = '#1c1a17';
        ctx.fillText(months, monthX, cy + 110);
        ctx.font = '32px "Songti SC", STSong, serif';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText('月', monthX + measureWidth(ctx, months, 'bold 96px "Songti SC", STSong, serif') + 10, cy + 110);

        // 约天数
        ctx.font = '24px "SF Mono", Menlo, monospace';
        ctx.fillStyle = '#5b6b6a';
        ctx.fillText(`· 约 ${formatMoney(pension.remaining.totalDays)} 天`, 40, cy + 170);
      }

      // 7. 法定退休年龄信息
      const ageY = cy + 240;
      ctx.font = '24px "Songti SC", STSong, serif';
      ctx.fillStyle = '#5b6b6a';
      const ageText = `法定退休年龄 ${retirement.years} 岁${retirement.months > 0 ? ` ${retirement.months} 个月` : ''}`;
      ctx.fillText(ageText, 40, ageY);
      if (retirement.delayed) {
        ctx.fillStyle = '#c8893b';
        ctx.font = '22px "SF Mono", Menlo, monospace';
        ctx.fillText(`（延迟 ${retirement.delayedMonths} 个月）`, 40, ageY + 36);
      }

      // 8. 底部分割线
      drawAlmanacRule(ctx, 40, CARD_H - 200, CARD_W - 80);

      // 9. 小程序码 + 引导文案
      const codeUrl = await loadMiniCode();
      if (codeUrl) {
        const localPath = await downloadImage(codeUrl);
        if (localPath) {
          const img = canvas.createImage();
          await new Promise<void>((resolveImg) => {
            img.onload = () => {
              const codeSize = 140;
              ctx.drawImage(img, 40, CARD_H - 170, codeSize, codeSize);
              resolveImg();
            };
            img.onerror = () => resolveImg();
            img.src = localPath;
          });
        }
      }
      // 引导文案（无论二维码是否成功都画）
      ctx.fillStyle = '#1c1a17';
      ctx.font = 'bold 32px "Songti SC", STSong, serif';
      ctx.fillText('扫码查看你的', 220, CARD_H - 110);
      ctx.fillStyle = '#5b6b6a';
      ctx.font = '24px "Songti SC", STSong, serif';
      ctx.fillText('退休进度与养老金测算', 220, CARD_H - 70);

      // 10. 底部品牌签名
      ctx.fillStyle = '#b23a2e';
      ctx.font = 'bold 20px "Songti SC", STSong, serif';
      ctx.textAlign = 'right';
      ctx.fillText('退了没 · tuilemei', CARD_W - 40, CARD_H - 40);

      // 11. 导出图片
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
          fail: () => resolveExport(),
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
      // 先请求权限（首次保存会触发授权）
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

        {/* 预览图(绘制完成后显示) */}
        {tempPath ? (
          <View className="share-preview">
            <img src={tempPath} className="share-preview-img" alt="分享卡片" />
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
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#b23a2e';
  ctx.font = 'bold 18px "Songti SC", STSong, serif';
  ctx.textAlign = 'center';
  ctx.fillText('退休', 0, -4);
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText('RETIREMENT', 0, 14);
  ctx.restore();
}

/** 测量文字宽度(ctx.measureText 受字体设置影响,需先设字体) */
function measureWidth(ctx: any, text: string, font: string): number {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}
