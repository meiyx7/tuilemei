import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/pension";

interface Segment {
  label: string;
  value: number;
  color: string; // tailwind bg class
}

interface StackedBarProps {
  segments: Segment[];
  total: number;
  className?: string;
}

/** 横向堆叠条形图：用于养老金三部分构成 */
export default function StackedBar({ segments, total, className }: StackedBarProps) {
  const sum = total || segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex h-9 w-full overflow-hidden rounded-[3px] border border-card-edge bg-paper-2">
        {segments.map((seg) => {
          const pct = (seg.value / sum) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.label}
              className={cn("h-full transition-all duration-700", seg.color)}
              style={{ width: `${pct}%` }}
              title={`${seg.label}：${formatMoney(seg.value)} 元`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {segments.map((seg) => {
          const pct = sum > 0 ? (seg.value / sum) * 100 : 0;
          return (
            <div key={seg.label} className="flex items-start gap-2">
              <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-[2px]", seg.color)} />
              <div className="flex flex-col">
                <span className="text-xs text-slate">{seg.label}</span>
                <span className="num text-base font-semibold text-ink">
                  {formatMoney(seg.value)}
                  <span className="ml-1 text-xs font-normal text-slate">元/月</span>
                </span>
                <span className="num text-[0.7rem] text-slate-soft">{pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
