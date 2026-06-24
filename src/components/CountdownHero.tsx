import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney, todayStr } from "@/lib/pension";
import { useStore } from "@/store/useStore";
import type { PensionResult, RetirementAgeResult } from "@/lib/types";
import ProgressRing from "./ProgressRing";
import Stamp from "./Stamp";

interface CountdownHeroProps {
  retirement: RetirementAgeResult;
  pension: PensionResult;
  /** 职业生涯进度 0~1（已工作年限 / 总工作年限） */
  careerProgress: number;
}

/**
 * 退休倒计时主视觉：环形进度 + 超大衬线倒计时数字。
 * 圆环同时承担每日打卡功能——点击圆环即打卡，盖章动画在圆环上播放，
 * 动画结束后自动消失，圆环下方标签变为"已打卡 N 天"。
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
  const [justChecked, setJustChecked] = useState(false);

  const handleCheckin = () => {
    if (checked) return;
    checkinToday();
    setJustChecked(true);
  };

  // 盖章动画结束后（stampDown 0.55s + 缓冲）自动隐藏大邮戳
  useEffect(() => {
    if (!justChecked) return;
    const id = setTimeout(() => setJustChecked(false), 900);
    return () => clearTimeout(id);
  }, [justChecked]);

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
        <div className="relative shrink-0">
          <button
            onClick={handleCheckin}
            disabled={checked}
            className={cn(
              "group relative grid place-items-center rounded-full transition-transform duration-200",
              "active:scale-95",
              !checked && "cursor-pointer",
            )}
            aria-label={checked ? "今日已打卡" : "点击圆环打卡"}
          >
            <ProgressRing value={careerProgress} size={220} stroke={11}>
              <div className="flex flex-col items-center">
                <span className="label-eyebrow">已过</span>
                <span className="num text-3xl font-semibold text-ink">
                  {(careerProgress * 100).toFixed(0)}
                  <span className="text-base">%</span>
                </span>
                <span className="text-[0.7rem] text-slate">职业生涯</span>
              </div>
            </ProgressRing>
          </button>

          {/* 刚打卡：盖大邮戳动画（动画结束后自动消失） */}
          {checked && justChecked && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <Stamp label="已打卡" sub={todayStr().slice(5)} size="lg" animate />
            </div>
          )}
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
              <span className="num text-sm text-slate">
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
            <span className="text-sm text-slate">
              预计退休月份
              <span className="num ml-2 font-semibold text-ink">
                {retirement.retirementDate}
              </span>
            </span>
            {/* 打卡状态标签（动画结束后显示在这里） */}
            <span
              className={cn(
                "num mt-1 inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium transition-colors",
                checked
                  ? "border-stamp/40 bg-stamp/5 text-stamp"
                  : "border-stamp/50 text-stamp",
              )}
            >
              {checked
                ? `✓ 已打卡 · 连续 ${streak} 天`
                : "点击圆环打卡"}
            </span>
          </div>
        </div>
      </div>
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
