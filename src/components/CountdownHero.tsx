import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/pension";
import type { PensionResult, RetirementAgeResult } from "@/lib/types";
import ProgressRing from "./ProgressRing";

interface CountdownHeroProps {
  retirement: RetirementAgeResult;
  pension: PensionResult;
  /** 职业生涯进度 0~1（已工作年限 / 总工作年限） */
  careerProgress: number;
}

/** 退休倒计时主视觉：环形进度 + 超大衬线倒计时数字 */
export default function CountdownHero({
  retirement,
  pension,
  careerProgress,
}: CountdownHeroProps) {
  const { remaining } = pension;
  const retired = remaining.totalDays <= 0;

  return (
    <div className="card-paper relative overflow-hidden p-6 md:p-8">
      {/* 装饰：右上角邮戳 */}
      <div className="pointer-events-none absolute -right-6 -top-6 rotate-[-11deg] opacity-20">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
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

      <div className="flex flex-col gap-8 md:flex-row md:items-center">
        {/* 环形进度 */}
        <ProgressRing value={careerProgress} size={188} stroke={9}>
          <div className="flex flex-col items-center">
            <span className="label-eyebrow">已过</span>
            <span className="num text-2xl font-semibold text-ink">
              {(careerProgress * 100).toFixed(0)}
              <span className="text-sm">%</span>
            </span>
            <span className="text-[0.7rem] text-slate">职业生涯</span>
          </div>
        </ProgressRing>

        {/* 倒计时数字 */}
        <div className="flex flex-1 flex-col gap-4">
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
