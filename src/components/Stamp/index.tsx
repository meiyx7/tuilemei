import { View, Text } from '@tarojs/components';
import { cn } from '@/lib/utils';
import './index.scss';

interface StampProps {
  /** 印章主文字，如 "已打卡" */
  label: string;
  /** 印章副文字，如日期 */
  sub?: string;
  size?: 'sm' | 'md' | 'lg';
  /** 是否播放盖章动画 */
  animate?: boolean;
  className?: string;
}

/**
 * 印章组件 —— 模拟中式印章/邮戳，圆形双环 + 衬线文字，盖在纸面上略带旋转。
 */
export default function Stamp({
  label,
  sub,
  size = 'md',
  animate = false,
  className,
}: StampProps) {
  return (
    <View
      className={cn(
        'stamp',
        `stamp--${size}`,
        animate && 'stamp--animate',
        className,
      )}
    >
      <View className="stamp__inner-ring" />
      <View className="stamp__content">
        <Text className="stamp__label">{label}</Text>
        {sub && <Text className="stamp__sub">{sub}</Text>}
      </View>
    </View>
  );
}
