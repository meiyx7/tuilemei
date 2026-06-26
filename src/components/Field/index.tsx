import { View, Text, Input, Picker } from '@tarojs/components';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './index.scss';

interface FieldProps {
  label: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
}

/** 表单字段容器：衬线标签 + 输入控件 + 提示 */
export default function Field({ label, hint, children, className }: FieldProps) {
  return (
    <View className={cn('field', className)}>
      <Text className="field__label">{label}</Text>
      {children}
      {hint && <Text className="field__hint">{hint}</Text>}
    </View>
  );
}

interface TextInputProps {
  value?: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'digit' | 'idcard';
  maxlength?: number;
  onInput?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

/** 文本输入：下划线纸面风格 */
export function TextInput({
  value,
  placeholder,
  type = 'text',
  maxlength,
  onInput,
  onFocus,
  onBlur,
  className,
}: TextInputProps) {
  return (
    <Input
      className={cn('field__input', className)}
      value={value}
      placeholder={placeholder}
      placeholderClass="field__placeholder"
      type={type}
      maxlength={maxlength ?? -1}
      onInput={(e) => onInput?.(e.detail.value)}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

interface SelectInputProps {
  value?: string;
  options: string[];
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
}

/** 下拉选择：Taro Picker mode='selector' 模拟 */
export function SelectInput({
  value,
  options,
  placeholder = '请选择',
  onChange,
  className,
}: SelectInputProps) {
  const idx = Math.max(0, options.indexOf(value ?? ''));
  return (
    <Picker
      mode='selector'
      range={options}
      value={idx}
      onChange={(e) => onChange?.(options[Number(e.detail.value)])}
    >
      <View className={cn('field__input', 'field__select', className)}>
        <Text className={cn('field__select-text', !value && 'field__placeholder')}>
          {value || placeholder}
        </Text>
        <Text className="field__select-arrow">›</Text>
      </View>
    </Picker>
  );
}
