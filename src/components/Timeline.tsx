import { cn } from "@/lib/utils";
import { todayYm, parseYearMonth } from "@/lib/pension";

interface TimelineNode {
  label: string;
  date: string;
  /** 是否已发生（不传则按日期与今日自动判断） */
  past?: boolean;
  /** 是否为当前节点（不传则按日期与今日自动判断） */
  current?: boolean;
}

interface TimelineProps {
  nodes: TimelineNode[];
  className?: string;
}

/** "YYYY-MM" 转总月数 */
function ymToMonths(ym: string): number {
  const { year, month } = parseYearMonth(ym);
  return year * 12 + month;
}

/**
 * 退休进度轴：横向时间线，节点为邮戳样式。
 * 节点按日期升序排列；"当前"作为虚拟节点插入到正确位置（今日所在区间）。
 */
export default function Timeline({ nodes, className }: TimelineProps) {
  const nowMonths = ymToMonths(todayYm());

  // 1. 过滤掉显式的"当前"节点（date === 今日），后续统一插入
  const realNodes = nodes.filter((n) => !n.current && ymToMonths(n.date) !== nowMonths);

  // 2. 按日期升序排序
  const sorted = [...realNodes].sort((a, b) => ymToMonths(a.date) - ymToMonths(b.date));

  // 3. 插入"当前"节点到正确位置（第一个 date > 今日 的节点之前）
  let insertIdx = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    if (ymToMonths(sorted[i].date) > nowMonths) {
      insertIdx = i;
      break;
    }
  }
  const resolved = [
    ...sorted.slice(0, insertIdx),
    { label: "当前", date: todayYm(), current: true, past: true },
    ...sorted.slice(insertIdx),
  ];

  // 4. 自动推断其余节点的 past 状态
  const finalNodes = resolved.map((n) => ({
    ...n,
    past: n.past ?? ymToMonths(n.date) <= nowMonths,
    current: n.current ?? false,
  }));

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* 主轴 */}
        <div className="absolute left-0 right-0 top-[14px] h-px bg-card-edge" />
        <div
          className="absolute left-0 top-[14px] h-px bg-amber transition-all duration-700"
          style={{
            width: `${progressOfCurrent(finalNodes)}%`,
          }}
        />
        <div
          className="relative grid gap-2"
          style={{ gridTemplateColumns: `repeat(${finalNodes.length}, minmax(0, 1fr))` }}
        >
          {finalNodes.map((node) => (
            <div key={`${node.label}-${node.date}`} className="flex flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full border-2 bg-card transition-colors",
                  node.current
                    ? "border-amber bg-amber text-paper"
                    : node.past
                      ? "border-stamp text-stamp"
                      : "border-card-edge text-slate-soft",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    node.current ? "bg-paper" : node.past ? "bg-stamp" : "bg-slate-soft",
                  )}
                />
              </span>
              <div className="flex w-full flex-col items-center">
                <span
                  className={cn(
                    "whitespace-nowrap font-display text-sm font-semibold",
                    node.current ? "text-amber" : node.past ? "text-ink" : "text-slate",
                  )}
                >
                  {node.label}
                </span>
                <span className="num mt-0.5 whitespace-nowrap text-[0.7rem] text-slate">{node.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function progressOfCurrent(nodes: { current?: boolean; past?: boolean }[]): number {
  const idx = nodes.findIndex((n) => n.current);
  if (idx === -1) {
    const lastPastIdx = nodes.map((n) => n.past).lastIndexOf(true);
    if (lastPastIdx === -1) return 0;
    if (lastPastIdx === nodes.length - 1) return 100;
    return ((lastPastIdx + 0.5) / (nodes.length - 1)) * 100;
  }
  return (idx / (nodes.length - 1)) * 100;
}
