import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from '@tarojs/components';
import type { ITouchEvent } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/pension';
import { useStore } from '@/store/useStore';
import type { PensionResult, RetirementAgeResult } from '@/lib/types';
import './index.scss';

interface CountdownHeroProps {
  retirement: RetirementAgeResult;
  pension: PensionResult;
  /** 职业生涯进度 0~1（已工作年限 / 总工作年限） */
  careerProgress: number;
}

interface FlyStamp {
  id: number;
  /** 飞行起点相对圆环中心的偏移（rpx） */
  fromX: string;
  fromY: string;
  /** 落地位置相对圆环中心的偏移（rpx），跟随点击位置 */
  toX: string;
  toY: string;
  /** 旋转角度 */
  rot: string;
}

/** 缓存圆环在视口中的位置与尺寸，用于触摸时换算落地偏移 */
interface RingRect { left: number; top: number; width: number; height: number }

/**
 * 退休倒计时主视觉：环形进度（conic-gradient）+ 超大衬线倒计时数字。
 * 圆环承担每日打卡——点击圆环触发"-1"飞印动画：从随机边缘飞向触摸点并淡出。
 */
export default function CountdownHero({
  retirement,
  pension,
  careerProgress,
}: CountdownHeroProps) {
  const { remaining } = pension;
  const retired = remaining.totalDays <= 0;

  /** 今日日期标签 */
  const todayLabel = (() => {
    const d = new Date();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} 周${weekdays[d.getDay()]}`;
  })();

  const checked = useStore((s) => s.isCheckedInToday());
  const checkinToday = useStore((s) => s.checkinToday);
  const streak = useStore((s) => s.streak());
  const [flyStamps, setFlyStamps] = useState<FlyStamp[]>([]);
  const idRef = useRef(0);
  // 圆环 rect 缓存：挂载时 + 页面滚动后刷新（触摸时直接读取，避免异步等待）
  const ringRectRef = useRef<RingRect | null>(null);

  // 挂载时测量圆环位置，用于触摸坐标换算
  useEffect(() => {
    const measure = () => {
      const query = Taro.createSelectorQuery();
      query.select('.ring-btn').boundingClientRect();
      query.exec((res) => {
        const rect = res?.[0];
        if (rect) {
          ringRectRef.current = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
        }
      });
    };
    // 延迟一帧，确保渲染完成
    const timer = setTimeout(measure, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCheckin = useCallback((clientX?: number, clientY?: number) => {
    // 首次点击正式打卡
    if (!checked) checkinToday();

    // 落地位置：跟随触摸点，相对圆环中心换算成 rpx
    let toXrpx = 0;
    let toYrpx = 0;
    const rect = ringRectRef.current;
    if (clientX != null && clientY != null && rect) {
      const sys = Taro.getWindowInfo?.() || Taro.getSystemInfoSync();
      const px2rpx = 750 / (sys.windowWidth || 375);
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      toXrpx = Math.round((clientX - centerX) * px2rpx);
      toYrpx = Math.round((clientY - centerY) * px2rpx);
    }

    // 随机起点偏移：从屏幕边缘飞向落地点（路径要长，视觉冲击力强）
    const edge = Math.floor(Math.random() * 4);
    const dist = 480 + Math.floor(Math.random() * 200); // 480~680rpx，接近屏幕边缘
    let fromX = 0;
    let fromY = 0;
    if (edge === 0) { fromX = Math.floor(Math.random() * 300 - 150); fromY = -dist; }
    else if (edge === 1) { fromX = dist; fromY = Math.floor(Math.random() * 300 - 150); }
    else if (edge === 2) { fromX = Math.floor(Math.random() * 300 - 150); fromY = dist; }
    else { fromX = -dist; fromY = Math.floor(Math.random() * 300 - 150); }

    const stamp: FlyStamp = {
      id: idRef.current++,
      fromX: `${fromX}rpx`,
      fromY: `${fromY}rpx`,
      toX: `${toXrpx}rpx`,
      toY: `${toYrpx}rpx`,
      rot: `${-8 + Math.floor(Math.random() * 16)}deg`,
    };
    setFlyStamps((prev) => [...prev, stamp]);
    setTimeout(() => {
      setFlyStamps((prev) => prev.filter((s) => s.id !== stamp.id));
    }, 1200);

    // 触摸后刷新一次 rect（页面可能滚动），下次点击位置更准
    const query = Taro.createSelectorQuery();
    query.select('.ring-btn').boundingClientRect();
    query.exec((res) => {
      const r = res?.[0];
      if (r) ringRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    });
  }, [checked, checkinToday]);

  const pct = Math.round(careerProgress * 100);

  return (
    <View className="hero">
      {/* 装饰：右上角邮戳（淡化） */}
      <View className="deco-stamp">
        <View className="deco-stamp-inner">
          <Text className="deco-stamp-main">退休</Text>
          <Text className="deco-stamp-sub">RETIREMENT</Text>
        </View>
      </View>

      <View className="hero-row">
        {/* 环形进度 —— 同时是打卡按钮 */}
        <View className="ring-wrap">
          <View
            className="ring-btn"
            onTouchStart={(e: ITouchEvent) => {
              // 用 clientX/clientY（相对视口）配合缓存的圆环 rect 计算落地偏移
              const t = e.touches?.[0] || (e as any).detail?.touches?.[0];
              handleCheckin(t?.clientX, t?.clientY);
            }}
          >
            <View
              className="ring"
              style={{ background: `conic-gradient(#C8893B 0% ${pct}%, #E2D9C3 ${pct}% 100%)` }}
            />
            {/* 进度环圆角端点：起点（顶部）+ 终点（随进度旋转），用小圆点模拟 linecap:round */}
            {pct > 0 && (
              <>
                <View className="ring-cap ring-cap-start" />
                {pct < 100 && (
                  <View
                    className="ring-cap ring-cap-end"
                    style={{ transform: `rotate(${pct * 3.6}deg) translateY(-199rpx)` }}
                  />
                )}
              </>
            )}
            <View className="ring-mask">
              <Text className="eyebrow">已过</Text>
              <Text className="ring-pct">
                {pct}
                <Text className="ring-pct-unit">%</Text>
              </Text>
              <Text className="ring-sub">职业生涯</Text>
              <Text className={cn('ring-badge', checked && 'ring-badge-checked')}>
                {checked ? `✓ 连续 ${streak} 天` : '点击 -1'}
              </Text>
            </View>
          </View>

          {/* 飞行"-1"印章层：落点跟随触摸位置 */}
          <View className="fly-layer">
            {flyStamps.map((s) => (
              <View
                key={s.id}
                className="fly-stamp"
                style={
                  {
                    '--from-x': s.fromX,
                    '--from-y': s.fromY,
                    '--to-x': s.toX,
                    '--to-y': s.toY,
                    '--rot': s.rot,
                  } as React.CSSProperties
                }
              >
                <View className="fly-stamp-inner" />
                <Text className="fly-stamp-text">-1</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 倒计时数字 */}
        <View className="countdown">
          <View className="countdown-eyebrow">
            <Text className="num today-label">{todayLabel}</Text>
            <Text className="dot">·</Text>
            <Text>{retired ? '已到法定退休年龄' : '距离退休还有'}</Text>
          </View>

          {retired ? (
            <Text className="retired-title">到点了</Text>
          ) : (
            <View className="count-row">
              <CountPart n={remaining.years} unit="年" big />
              <CountPart n={remaining.months} unit="月" />
              <Text className="num days-approx">· 约 {formatMoney(remaining.totalDays)} 天</Text>
            </View>
          )}

          <View className="age-line">
            <Text className="age-text">
              法定退休年龄
              <Text className="num age-value">
                {' '}{retirement.years} 岁{retirement.months > 0 ? ` ${retirement.months} 个月` : ''}
              </Text>
            </Text>
            {retirement.delayed && (
              <Text className="num delay-text"> （延迟 {retirement.delayedMonths} 个月）</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function CountPart({ n, unit, big }: { n: number; unit: string; big?: boolean }) {
  return (
    <View className={cn('count-part', big && 'count-part-big')}>
      <Text className={cn('num count-num', big ? 'count-num-big' : 'count-num-small')}>
        {String(n).padStart(2, '0')}
      </Text>
      <Text className={cn('count-unit', big ? 'count-unit-big' : 'count-unit-small')}>{unit}</Text>
    </View>
  );
}
