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

/** 比较 "YYYY-MM" 与今日，返回 -1/0/1 */
function compareYmWithToday(ym: string): number {
  const node = parseYearMonth(ym);
  const now = parseYearMonth(todayYm());
  const nodeTotal = node.year * 12 + node.month;
  const nowTotal = now.year * 12 + now.month;
  return nodeTotal < nowTotal ? -1 : nodeTotal > nowTotal ? 1 : 0;
}

/** 退休进度轴：横向时间线，节点为邮戳样式。past/current 自动按日期推断。 */
export default function Timeline({ nodes, className }: TimelineProps) {
  // 自动推断每个节点的 past / current 状态
  const resolved = nodes.map((n) => {
    const cmp = compareYmWithToday(n.date);
    return {
      ...n,
      past: n.past ?? cmp <= 0,
      current: n.current ?? cmp === 0,
    };
  });

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* 主轴 */}
        <div className="absolute left-0 right-0 top-[14px] h-px bg-card-edge" />
        <div
          className="absolute left-0 top-[14px] h-px bg-amber transition-all duration-700"
          style={{
            width: `${progressOfCurrent(resolved)}%`,
          }}
        />
        <div className="relative grid grid-cols-4 gap-2">
          {resolved.map((node) => (
            <div key={node.label} className="flex flex-col items-center gap-2 text-center">
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
              <div className="flex flex-col">
                <span
                  className={cn(
                    "font-display text-sm font-semibold",
                    node.current ? "text-amber" : node.past ? "text-ink" : "text-slate",
                  )}
                >
                  {node.label}
                </span>
                <span className="num text-[0.7rem] text-slate">{node.date}</span>
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
    // 没有当前节点：若全部已过则满进度，否则按最后一个已过节点计算
    const lastPastIdx = nodes.map((n) => n.past).lastIndexOf(true);
    if (lastPastIdx === -1) return 0;
    if (lastPastIdx === nodes.length - 1) return 100;
    return ((lastPastIdx + 0.5) / (nodes.length - 1)) * 100;
  }
  return (idx / (nodes.length - 1)) * 100;
}
