import { View, Text } from '@tarojs/components';
import { cn } from '@/lib/utils';
import './index.scss';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  desc?: string;
  align?: 'left' | 'center';
  className?: string;
}

/** 章节标题：等宽小标签 + 衬线大标题 + 细分割线 */
export default function SectionHeader({
  eyebrow,
  title,
  desc,
  align = 'left',
  className,
}: SectionHeaderProps) {
  return (
    <View
      className={cn(
        'section-header',
        align === 'center' && 'section-header--center',
        className,
      )}
    >
      {eyebrow && <Text className="section-header__eyebrow">{eyebrow}</Text>}
      <Text className="section-header__title">{title}</Text>
      {desc && <Text className="section-header__desc">{desc}</Text>}
      <View className="section-header__rule" />
    </View>
  );
}
