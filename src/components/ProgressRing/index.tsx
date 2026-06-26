import { useEffect, useState } from 'react';
import { View } from '@tarojs/components';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './index.scss';

interface ProgressRingProps {
  /** 0 ~ 1 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** 中心内容 */
  children?: ReactNode;
  /** 轨道颜色（默认 card-edge） */
  trackColor?: string;
  /** 进度条颜色（默认 amber） */
  barColor?: string;
}

/**
 * 环形进度（CSS conic-gradient + 内圆遮罩）。
 * 入场时从 0 渐进到目标值（JS rAF 驱动，避免依赖 SVG）。
 */
export default function ProgressRing({
  value,
  size = 360,
  stroke = 20,
  className,
  children,
  trackColor = '#E2D9C3',
  barColor = '#C8893B',
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 900;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(clamped * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped]);

  const deg = shown * 360;
  const inner = size - stroke * 2;

  return (
    <View
      className={cn('progress-ring', className)}
      style={{
        width: `${size}rpx`,
        height: `${size}rpx`,
        backgroundImage: `conic-gradient(${barColor} ${deg}deg, ${trackColor} ${deg}deg)`,
      }}
    >
      <View
        className="progress-ring__inner"
        style={{ width: `${inner}rpx`, height: `${inner}rpx` }}
      >
        <View className="progress-ring__center">{children}</View>
      </View>
    </View>
  );
}
