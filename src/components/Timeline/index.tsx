import { View, Text } from '@tarojs/components';
import { cn } from '@/lib/utils';
import { todayYm, parseYearMonth } from '@/lib/pension';
import './index.scss';

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

/**
 * 退休进度轴：横向时间线，节点为邮戳样式。
 * "当前"作为虚拟节点插入到今日所在区间。
 */
export default function Timeline({ nodes, className }: TimelineProps) {
  const nowMonths = ymToMonths(todayYm());

  const realNodes = nodes.filter(
    (n) => !n.current && ymToMonths(n.date) !== nowMonths,
  );
  const sorted = [...realNodes].sort(
    (a, b) => ymToMonths(a.date) - ymToMonths(b.date),
  );

  let insertIdx = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    if (ymToMonths(sorted[i].date) > nowMonths) {
      insertIdx = i;
      break;
    }
  }
  const resolved = [
    ...sorted.slice(0, insertIdx),
    { label: '当前', date: todayYm(), current: true, past: true },
    ...sorted.slice(insertIdx),
  ];

  const finalNodes = resolved.map((n) => ({
    ...n,
    past: n.past ?? ymToMonths(n.date) <= nowMonths,
    current: n.current ?? false,
  }));

  const progress = progressOfCurrent(finalNodes);

  return (
    <View className={cn('timeline', className)}>
      <View className="timeline__track">
        <View className="timeline__track-bg" />
        <View
          className="timeline__track-fill"
          style={{ width: `${progress}%` }}
        />
        <View
          className="timeline__nodes"
          style={{ gridTemplateColumns: `repeat(${finalNodes.length}, 1fr)` }}
        >
          {finalNodes.map((node) => (
            <View
              key={`${node.label}-${node.date}`}
              className="timeline__node"
            >
              <View
                className={cn(
                  'timeline__dot-wrap',
                  node.current && 'timeline__dot-wrap--current',
                  !node.current && node.past && 'timeline__dot-wrap--past',
                  !node.current && !node.past && 'timeline__dot-wrap--future',
                )}
              >
                <View
                  className={cn(
                    'timeline__dot',
                    node.current && 'timeline__dot--current',
                    !node.current && node.past && 'timeline__dot--past',
                    !node.current && !node.past && 'timeline__dot--future',
                  )}
                />
              </View>
              <View className="timeline__label-wrap">
                <Text
                  className={cn(
                    'timeline__label',
                    node.current && 'timeline__label--current',
                    !node.current && node.past && 'timeline__label--past',
                    !node.current && !node.past && 'timeline__label--future',
                  )}
                >
                  {node.label}
                </Text>
                <Text className="timeline__date">{node.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
