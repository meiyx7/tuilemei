import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { todayStr } from "@/lib/pension";

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  onPrev: () => void;
  onNext: () => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/** 打卡月历：已打卡日盖红印 */
export default function MonthCalendar({
  year,
  month,
  onPrev,
  onNext,
}: MonthCalendarProps) {
  const checkins = useStore((s) => s.checkins);

  const firstDay = new Date(year, month - 1, 1);
  // 周一为一周起始
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayStr();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="grid h-9 w-9 place-items-center rounded-[3px] border border-card-edge text-slate transition-colors hover:border-ink hover:text-ink"
          aria-label="上一月"
        >
          ‹
        </button>
        <span className="num text-lg font-semibold text-ink">
          {year} · {String(month).padStart(2, "0")}
        </span>
        <button
          onClick={onNext}
          className="grid h-9 w-9 place-items-center rounded-[3px] border border-card-edge text-slate transition-colors hover:border-ink hover:text-ink"
          aria-label="下一月"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="pb-2 text-center label-eyebrow"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const checked = Boolean(checkins[dateStr]);
          const isToday = dateStr === today;
          return (
            <div
              key={i}
              className={cn(
                "relative grid aspect-square place-items-center rounded-[3px] border text-sm",
                checked
                  ? "border-stamp/40 bg-stamp/5"
                  : "border-transparent",
                isToday && !checked && "border-amber/60 bg-amber/5",
              )}
            >
              <span
                className={cn(
                  "num",
                  checked ? "font-bold text-stamp" : "text-slate",
                )}
              >
                {day}
              </span>
              {checked && (
                <span className="pointer-events-none absolute inset-1 grid place-items-center">
                  <span className="h-7 w-7 rotate-[-11deg] rounded-full border border-stamp/70" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
