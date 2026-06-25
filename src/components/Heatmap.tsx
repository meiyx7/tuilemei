import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { todayStr } from "@/lib/pension";

interface HeatmapProps {
  year: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * 年度打卡热力图：GitHub 草地风格。
 * 按周列排列（每列一周，7 行代表周一到周日），颜色深浅表示打卡状态。
 * 鼠标悬停显示日期与寄语。
 */
export default function Heatmap({ year, onPrev, onNext }: HeatmapProps) {
  const checkins = useStore((s) => s.checkins);
  const [hover, setHover] = useState<{ date: string; x: number; y: number } | null>(null);

  const today = todayStr();

  /** 生成该年度所有日期的网格数据：按周分组（周一为一周起始） */
  const weeks = useMemo(() => {
    const start = new Date(year, 0, 1);
    // 调整到该年第一天所在的「周的周一」
    const offset = (start.getDay() + 6) % 7;
    const gridStart = new Date(year, 0, 1 - offset);

    const result: { date: string | null; day: number | null }[][] = [];
    const cursor = new Date(gridStart);
    // 固定生成 53 周（GitHub 风格），不足的尾部留空，多出的会被自动截断
    // 修复历史 bug：原 break 条件 (cursor.getFullYear() > year && cursor.getDay() === 1)
    //   在新年第一天恰好是周一时会提前结束，导致最后一周不完整
    for (let w = 0; w < 53; w++) {
      const week: { date: string | null; day: number | null }[] = [];
      for (let d = 0; d < 7; d++) {
        const y = cursor.getFullYear();
        const m = cursor.getMonth() + 1;
        const day = cursor.getDate();
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (y === year) {
          week.push({ date: dateStr, day });
        } else {
          week.push({ date: null, day: null });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
      // 已超过该年所有日期且本周已无任何 year 内的格子，停止
      if (cursor.getFullYear() > year && week.every((c) => c.date === null)) break;
    }
    return result;
  }, [year]);

  const yearCheckinCount = useMemo(() => {
    return Object.keys(checkins).filter((d) => d.startsWith(`${year}-`)).length;
  }, [checkins, year]);

  const cellColor = (dateStr: string | null): string => {
    if (!dateStr) return "bg-transparent";
    if (dateStr > today) return "bg-card-edge/40";
    return checkins[dateStr] ? "bg-stamp" : "bg-card-edge";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 年份切换 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="grid h-9 w-9 place-items-center rounded-[3px] border border-card-edge text-slate transition-colors hover:border-ink hover:text-ink"
          aria-label="上一年"
        >
          ‹
        </button>
        <div className="flex items-baseline gap-2">
          <span className="num text-lg font-semibold text-ink">{year}</span>
          <span className="text-xs text-slate">· 打卡 {yearCheckinCount} 天</span>
        </div>
        <button
          onClick={onNext}
          className="grid h-9 w-9 place-items-center rounded-[3px] border border-card-edge text-slate transition-colors hover:border-ink hover:text-ink"
          aria-label="下一年"
        >
          ›
        </button>
      </div>

      {/* 热力图网格 */}
      <div className="relative overflow-x-auto">
        <div className="flex gap-1">
          {/* 周几标签：对齐到第 0/2/4/6 行（一/三/五/日） */}
          <div className="flex flex-col gap-1 pt-0">
            {["一", "", "三", "", "五", "", "日"].map((label, i) => (
              <div key={i} className="flex h-3 items-center">
                {label && <span className="label-eyebrow text-[0.6rem] leading-3">{label}</span>}
              </div>
            ))}
          </div>
          {/* 周列 */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell, di) => (
                <div
                  key={di}
                  className={cn(
                    "h-3 w-3 rounded-[2px] transition-colors",
                    cellColor(cell.date),
                    cell.date && checkins[cell.date] && "hover:ring-1 hover:ring-stamp/60",
                  )}
                  onMouseEnter={(e) => {
                    if (cell.date) {
                      setHover({ date: cell.date, x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 月份标签 */}
        <div className="mt-2 flex pl-5 text-[0.6rem] text-slate-soft">
          {["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map((m) => (
            <span key={m} className="num mr-3">{m}</span>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-2 text-[0.65rem] text-slate-soft">
        <span>少</span>
        <div className="h-3 w-3 rounded-[2px] bg-card-edge" />
        <div className="h-3 w-3 rounded-[2px] bg-stamp/40" />
        <div className="h-3 w-3 rounded-[2px] bg-stamp/70" />
        <div className="h-3 w-3 rounded-[2px] bg-stamp" />
        <span>多</span>
      </div>

      {/* 悬停提示 */}
      {hover && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-[3px] border border-card-edge bg-card px-3 py-2 shadow-lg"
          style={{
            left: Math.min(hover.x + 12, window.innerWidth - 200),
            top: hover.y - 60,
          }}
        >
          <div className="num text-xs text-slate">{hover.date}</div>
          {checkins[hover.date] ? (
            <div className="mt-0.5 font-body text-xs italic text-ink-soft">
              「{checkins[hover.date].quote}」
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-slate-soft">未打卡</div>
          )}
        </div>
      )}
    </div>
  );
}
