import { cn } from "@/lib/utils";

interface TimelineNode {
  label: string;
  date: string;
  /** 是否已发生 */
  past?: boolean;
  /** 是否为当前节点 */
  current?: boolean;
}

interface TimelineProps {
  nodes: TimelineNode[];
  className?: string;
}

/** 退休进度轴：横向时间线，节点为邮戳样式 */
export default function Timeline({ nodes, className }: TimelineProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* 主轴 */}
        <div className="absolute left-0 right-0 top-[14px] h-px bg-card-edge" />
        <div
          className="absolute left-0 top-[14px] h-px bg-amber transition-all duration-700"
          style={{
            width: `${progressOfCurrent(nodes)}%`,
          }}
        />
        <div className="relative grid grid-cols-4 gap-2">
          {nodes.map((node) => (
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

function progressOfCurrent(nodes: TimelineNode[]): number {
  const idx = nodes.findIndex((n) => n.current);
  if (idx === -1) {
    const allPast = nodes.every((n) => n.past);
    return allPast ? 100 : 0;
  }
  return (idx / (nodes.length - 1)) * 100;
}
