import { View, Text } from '@tarojs/components';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './index.scss';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  accent?: 'ink' | 'amber' | 'stamp' | 'slate';
  className?: string;
  children?: ReactNode;
}

/** 关键指标卡：米白纸卡 + 等宽大数字 + 底部细分割线 */
export default function MetricCard({
  label,
  value,
  unit,
  hint,
  accent = 'ink',
  className,
  children,
}: MetricCardProps) {
  return (
    <View className={cn('metric-card', `metric-card--${accent}`, className)}>
      <Text className="metric-card__eyebrow">{label}</Text>
      <View className="metric-card__value-row">
        <Text className="metric-card__value">{value}</Text>
        {unit && <Text className="metric-card__unit">{unit}</Text>}
      </View>
      {hint && <Text className="metric-card__hint">{hint}</Text>}
      {children}
      <View className="metric-card__rule" />
    </View>
  );
}
