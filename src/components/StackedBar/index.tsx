import { View, Text } from '@tarojs/components';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/pension';
import './index.scss';

interface Segment {
  label: string;
  value: number;
  /** 段颜色（hex 字符串，由调用方传入） */
  color: string;
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
    <View className={cn('stacked-bar', className)}>
      <View className="stacked-bar__bar">
        {segments.map((seg) => {
          const pct = (seg.value / sum) * 100;
          if (pct <= 0) return null;
          return (
            <View
              key={seg.label}
              className="stacked-bar__seg"
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
            />
          );
        })}
      </View>
      <View className="stacked-bar__legend">
        {segments.map((seg) => {
          const pct = sum > 0 ? (seg.value / sum) * 100 : 0;
          return (
            <View key={seg.label} className="stacked-bar__legend-item">
              <View
                className="stacked-bar__swatch"
                style={{ backgroundColor: seg.color }}
              />
              <View className="stacked-bar__legend-text">
                <Text className="stacked-bar__legend-label">{seg.label}</Text>
                <Text className="stacked-bar__legend-value">
                  {formatMoney(seg.value)}
                  <Text className="stacked-bar__legend-unit"> 元/月</Text>
                </Text>
                <Text className="stacked-bar__legend-pct">{pct.toFixed(1)}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
