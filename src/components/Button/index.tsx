import { View } from '@tarojs/components';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './index.scss';

type Variant = 'stamp' | 'outline' | 'ghost' | 'amber';

interface ButtonProps {
  variant?: Variant;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

/** 按钮：方形微圆角，印章式按压反馈 */
export default function Button({
  variant = 'outline',
  className,
  children,
  onClick,
  disabled = false,
}: ButtonProps) {
  return (
    <View
      className={cn('btn', `btn--${variant}`, disabled && 'btn--disabled', className)}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </View>
  );
}
