import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/pension";
import { useStore } from "@/store/useStore";
import type { PensionResult, RetirementAgeResult } from "@/lib/types";
import ProgressRing from "./ProgressRing";

interface CountdownHeroProps {
  retirement: RetirementAgeResult;
  pension: PensionResult;
  /** 职业生涯进度 0~1（已工作年限 / 总工作年限） */
  careerProgress: number;
}

interface FlyStamp {
  id: number;
  fromX: number;
  fromY: number;
  rotate: number;
}

/**
 * 退休倒计时主视觉：环形进度 + 超大衬线倒计时数字。
 * 圆环承担每日打卡——点击圆环触发"-1"飞印动画：从屏幕随机位置飞出
 * 印章红"-1"飞向圆环并盖上去，可多次点击产生重叠效果，提供情绪价值。
 */
export default function CountdownHero({
  retirement,
  pension,
  careerProgress,
}: CountdownHeroProps) {
  const { remaining } = pension;
  const retired = remaining.totalDays <= 0;

  const checked = useStore((s) => s.isCheckedInToday());
  const checkinToday = useStore((s) => s.checkinToday);
  const streak = useStore((s) => s.streak());
  const [flyStamps, setFlyStamps] = useState<FlyStamp[]>([]);
  const idRef = useRef(0);
  const ringRef = useRef<HTMLDivElement>(null);

  const handleCheckin = useCallback(() => {
    // 首次点击正式打卡
    if (!checked) checkinToday();

    // 生成一个从屏幕随机位置飞向圆环的"-1"印章
    const ring = ringRef.current?.getBoundingClientRect();
    if (!ring) return;
    const cx = ring.left + ring.width / 2;
    const cy = ring.top + ring.height / 2;

    // 随机起点：屏幕四周边缘的随机位置
    const edge = Math.floor(Math.random() * 4);
    const margin = 40;
    let fromX: number, fromY: number;
    if (edge === 0) { // 上边
      fromX = Math.random() * window.innerWidth;
      fromY = margin;
    } else if (edge === 1) { // 右边
      fromX = window.innerWidth - margin;
      fromY = Math.random() * window.innerHeight;
    } else if (edge === 2) { // 下边
      fromX = Math.random() * window.innerWidth;
      fromY = window.innerHeight - margin;
    } else { // 左边
      fromX = margin;
      fromY = Math.random() * window.innerHeight;
    }

    const dx = cx - fromX;
    const dy = cy - fromY;
    const stamp: FlyStamp = {
      id: idRef.current++,
      fromX: dx,
      fromY: dy,
      rotate: -8 + Math.random() * 16,
    };
    setFlyStamps((prev) => [...prev, stamp]);
    // 1.1s 后移除
    setTimeout(() => {
      setFlyStamps((prev) => prev.filter((s) => s.id !== stamp.id));
    }, 1200);
  }, [checked, checkinToday]);

  return (
    <div className="relative overflow-hidden">
      {/* 装饰：右上角邮戳（缩小、淡化，避免喧宾夺主） */}
      <div className="pointer-events-none absolute -right-8 -top-8 rotate-[-11deg] opacity-[0.12]">
        <svg width="76" height="76" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="54" stroke="#B23A2E" strokeWidth="2" />
          <circle cx="60" cy="60" r="46" stroke="#B23A2E" strokeWidth="1" />
          <text
            x="60"
            y="56"
            textAnchor="middle"
            fontFamily="Fraunces, serif"
            fontSize="16"
            fontWeight="700"
            fill="#B23A2E"
          >
            退休
          </text>
          <text
            x="60"
            y="76"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
            fill="#B23A2E"
          >
            RETIREMENT
          </text>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
        {/* 环形进度 —— 同时是打卡按钮 */}
        <div ref={ringRef} className="relative shrink-0">
          <button
            onClick={handleCheckin}
            className={cn(
              "group relative grid place-items-center rounded-full transition-transform duration-150",
              "active:scale-95 cursor-pointer",
            )}
            aria-label="点击圆环，离退休再近一天"
          >
            <ProgressRing value={careerProgress} size={220} stroke={11}>
              <div className="flex flex-col items-center">
                <span className="label-eyebrow">已过</span>
                <span className="num text-3xl font-semibold text-ink">
                  {(careerProgress * 100).toFixed(0)}
                  <span className="text-base">%</span>
                </span>
                <span className="text-[0.7rem] text-slate">职业生涯</span>
                {/* 打卡状态标签（圆环内部） */}
                <span
                  className={cn(
                    "num mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-medium transition-colors",
                    checked
                      ? "border-stamp/40 bg-stamp/5 text-stamp"
                      : "border-stamp/50 text-stamp group-hover:bg-stamp group-hover:text-paper",
                  )}
                >
                  {checked ? `✓ 连续 ${streak} 天` : "点击 -1"}
                </span>
              </div>
            </ProgressRing>
          </button>
        </div>

        {/* 倒计时数字 */}
        <div className="flex w-full flex-1 flex-col gap-4">
          <span className="label-eyebrow">
            {retired ? "已到法定退休年龄" : "距离退休还有"}
          </span>
          {retired ? (
            <div className="font-display text-5xl font-black text-stamp md:text-6xl">
              到点了
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <CountPart n={remaining.years} unit="年" big />
              <CountPart n={remaining.months} unit="月" />
              <span className="num whitespace-nowrap text-sm text-slate">
                · 约 {formatMoney(remaining.totalDays)} 天
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-sm text-slate">
              法定退休年龄
              <span className="num ml-2 font-semibold text-ink">
                {retirement.years} 岁{retirement.months > 0 ? ` ${retirement.months} 个月` : ""}
              </span>
              {retirement.delayed && (
                <span className="num ml-2 text-xs text-amber">
                  （延迟 {retirement.delayedMonths} 个月）
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 飞行"-1"印章层：fixed 定位覆盖全屏，从随机位置飞向圆环 */}
      {flyStamps.map((s) => (
        <div
          key={s.id}
          className="animate-stampFly pointer-events-none fixed left-1/2 top-1/2 z-50"
          style={
            {
              "--fly-from": `translate(${s.fromX}px, ${s.fromY}px)`,
              "--fly-to": "translate(0, 0)",
              transform: `translate(${s.fromX}px, ${s.fromY}px)`,
            } as React.CSSProperties
          }
        >
          <div
            className="grid h-20 w-20 place-items-center rounded-full border-2 border-stamp bg-stamp/10"
            style={{
              rotate: `${s.rotate}deg`,
              boxShadow: "inset 0 0 0 1px rgba(178,58,46,0.4)",
            }}
          >
            <div className="absolute inset-[5px] rounded-full border border-stamp/50" />
            <span className="num relative z-10 font-display text-2xl font-black text-stamp">
              -1
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CountPart({ n, unit, big }: { n: number; unit: string; big?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span
        className={cn(
          "num font-black leading-none text-ink",
          big ? "text-6xl md:text-7xl" : "text-4xl md:text-5xl",
        )}
      >
        {String(n).padStart(2, "0")}
      </span>
      <span className={cn("font-display text-slate", big ? "text-xl" : "text-base")}>{unit}</span>
    </span>
  );
}
