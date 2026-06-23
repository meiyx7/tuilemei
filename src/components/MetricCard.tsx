import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  accent?: "ink" | "amber" | "stamp" | "slate";
  className?: string;
  children?: React.ReactNode;
}

const accentMap = {
  ink: "text-ink",
  amber: "text-amber",
  stamp: "text-stamp",
  slate: "text-slate",
};

/** 关键指标卡：米白纸卡 + 等宽大数字 + 底部细分割线 */
export default function MetricCard({
  label,
  value,
  unit,
  hint,
  accent = "ink",
  className,
  children,
}: MetricCardProps) {
  return (
    <div className={cn("card-paper relative flex flex-col gap-3 p-5", className)}>
      <span className="label-eyebrow">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("num text-3xl font-semibold leading-none md:text-4xl", accentMap[accent])}>
          {value}
        </span>
        {unit && <span className="text-sm text-slate">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-slate">{hint}</p>}
      {children}
      <div className="almanac-rule mt-auto" />
    </div>
  );
}
