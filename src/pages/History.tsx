import { useMemo, useState } from "react";
import { CalendarDays, Flame, Grid3x3, History as HistoryIcon, Stamp as StampIcon } from "lucide-react";
import { useStore } from "@/store/useStore";
import SectionHeader from "@/components/SectionHeader";
import MonthCalendar from "@/components/MonthCalendar";
import Heatmap from "@/components/Heatmap";
import { cn } from "@/lib/utils";

type View = "month" | "heatmap";

export default function HistoryPage() {
  const checkins = useStore((s) => s.checkins);
  const changelog = useStore((s) => s.changelog);
  const streak = useStore((s) => s.streak());
  const total = useStore((s) => s.totalCheckins());

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView] = useState<View>("month");

  const goPrev = () => {
    if (view === "heatmap") {
      setYear((y) => y - 1);
      return;
    }
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (view === "heatmap") {
      setYear((y) => y + 1);
      return;
    }
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const monthCheckins = useMemo(
    () =>
      Object.keys(checkins)
        .filter((d) => d.startsWith(`${year}-${String(month).padStart(2, "0")}`))
        .sort()
        .reverse(),
    [checkins, year, month],
  );

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="打卡历史 · Almanac"
        title="你的退休日历"
        desc="每一枚印章，都是离自由更近的一天。"
      />

      {/* 统计 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={<Flame size={16} />} label="连续打卡" value={`${streak}`} unit="天" accent="stamp" />
        <StatTile icon={<StampIcon size={16} />} label="累计打卡" value={`${total}`} unit="天" accent="amber" />
        <StatTile icon={<CalendarDays size={16} />} label="本月打卡" value={`${monthCheckins.length}`} unit="天" accent="ink" />
        <StatTile icon={<HistoryIcon size={16} />} label="档案变更" value={`${changelog.length}`} unit="条" accent="slate" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* 打卡日历（月历 / 热力图切换） */}
        <div className="card-paper p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">
              {view === "month" ? "打卡月历" : "年度热力图"}
            </h3>
            {/* 视图切换 */}
            <div className="flex items-center rounded-[3px] border border-card-edge">
              <button
                onClick={() => setView("month")}
                aria-label="月历视图"
                className={cn(
                  "grid h-7 w-7 place-items-center transition-colors",
                  view === "month" ? "bg-stamp text-paper" : "text-slate hover:text-ink",
                )}
              >
                <CalendarDays size={13} />
              </button>
              <button
                onClick={() => setView("heatmap")}
                aria-label="热力图视图"
                className={cn(
                  "grid h-7 w-7 place-items-center transition-colors",
                  view === "heatmap" ? "bg-stamp text-paper" : "text-slate hover:text-ink",
                )}
              >
                <Grid3x3 size={13} />
              </button>
            </div>
          </div>
          {view === "month" ? (
            <MonthCalendar year={year} month={month} onPrev={goPrev} onNext={goNext} />
          ) : (
            <Heatmap year={year} onPrev={goPrev} onNext={goNext} />
          )}
        </div>

        {/* 本月打卡寄语 */}
        <div className="card-paper flex flex-col p-6 md:p-8">
          <h3 className="mb-5 font-display text-lg font-semibold text-ink">本月寄语</h3>
          {monthCheckins.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <span className="label-eyebrow">本月尚未打卡</span>
              <p className="max-w-xs text-sm text-slate">
                前往仪表盘完成今日打卡，开始你的退休进度年鉴。
              </p>
            </div>
          ) : (
            <ul className="scroll-thin flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
              {monthCheckins.map((date) => (
                <li
                  key={date}
                  className="flex items-start gap-3 rounded-[3px] border border-card-edge bg-paper/40 p-3"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 rotate-[-11deg] place-items-center rounded-full border border-stamp/60 text-[0.6rem] font-bold text-stamp">
                    {date.slice(8)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="num text-xs text-slate">{date}</span>
                    <span className="font-body text-sm italic text-ink-soft">
                      「{checkins[date].quote}」
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 变更记录 */}
      <section className="card-paper p-6 md:p-8">
        <h3 className="mb-5 font-display text-lg font-semibold text-ink">档案变更记录</h3>
        {changelog.length === 0 ? (
          <p className="text-sm text-slate">暂无变更记录。修改个人档案后将在此显示。</p>
        ) : (
          <ol className="relative flex flex-col gap-4 border-l border-card-edge pl-5">
            {changelog.slice(0, 30).map((entry, i) => (
              <li key={`${entry.timestamp}-${entry.field}-${i}`} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-amber bg-card" />
                <div className="flex flex-col gap-0.5">
                  <span className="num text-xs text-slate-soft">
                    {new Date(entry.timestamp).toLocaleString("zh-CN")}
                  </span>
                  <span className="text-sm text-ink">
                    <span className="font-medium">{entry.field}</span>
                    <span className="mx-1.5 text-slate-soft">：</span>
                    <span className="num text-slate line-through">{entry.oldValue || "—"}</span>
                    <span className="mx-1.5 text-amber">→</span>
                    <span className="num font-semibold text-ink">{entry.newValue || "—"}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  accent: "stamp" | "amber" | "ink" | "slate";
}) {
  const accentMap = {
    stamp: "text-stamp",
    amber: "text-amber",
    ink: "text-ink",
    slate: "text-slate",
  };
  return (
    <div className="card-paper flex flex-col gap-2 p-4">
      <div className="flex items-center gap-1.5">
        <span className={accentMap[accent]}>{icon}</span>
        <span className="label-eyebrow">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("num text-3xl font-bold", accentMap[accent])}>{value}</span>
        <span className="text-xs text-slate">{unit}</span>
      </div>
    </div>
  );
}
