import { View, Text } from '@tarojs/components';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { todayStr } from '@/lib/pension';
import './index.scss';

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  onPrev: () => void;
  onNext: () => void;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/** 打卡月历：已打卡日盖红印 */
export default function MonthCalendar({
  year,
  month,
  onPrev,
  onNext,
}: MonthCalendarProps) {
  const checkins = useStore((s) => s.checkins);

  const firstDay = new Date(year, month - 1, 1);
  // 周一为一周起始
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayStr();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View className="month-calendar">
      <View className="month-calendar__header">
        <View className="month-calendar__nav" onClick={onPrev}>‹</View>
        <Text className="month-calendar__title">
          {year} · {String(month).padStart(2, '0')}
        </Text>
        <View className="month-calendar__nav" onClick={onNext}>›</View>
      </View>

      <View className="month-calendar__grid">
        {WEEKDAYS.map((w) => (
          <View key={w} className="month-calendar__weekday">
            {w}
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={i} className="month-calendar__cell month-calendar__cell--empty" />;
          }
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const checked = Boolean(checkins[dateStr]);
          const isToday = dateStr === today;
          return (
            <View
              key={i}
              className={cn(
                'month-calendar__cell',
                checked && 'month-calendar__cell--checked',
                isToday && !checked && 'month-calendar__cell--today',
              )}
            >
              <Text
                className={cn(
                  'month-calendar__day',
                  checked && 'month-calendar__day--checked',
                )}
              >
                {day}
              </Text>
              {checked && <View className="month-calendar__stamp-ring" />}
            </View>
          );
        })}
      </View>
    </View>
  );
}
