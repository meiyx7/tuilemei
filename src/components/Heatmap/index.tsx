import { useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { todayStr } from '@/lib/pension';
import './index.scss';

interface HeatmapProps {
  year: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * 年度打卡热力图：GitHub 草地风格。
 * 按周列排列（每列一周，7 行代表周一到周日），颜色深浅表示打卡状态。
 * 触摸单元格显示日期与寄语（小程序无 mouseenter）。
 */
export default function Heatmap({ year, onPrev, onNext }: HeatmapProps) {
  const checkins = useStore((s) => s.checkins);
  const [selected, setSelected] = useState<string | null>(null);

  const today = todayStr();

  /** 生成该年度所有日期的网格数据：按周分组（周一为一周起始） */
  const weeks = useMemo(() => {
    const start = new Date(year, 0, 1);
    const offset = (start.getDay() + 6) % 7;
    const gridStart = new Date(year, 0, 1 - offset);

    const result: { date: string | null; day: number | null }[][] = [];
    const cursor = new Date(gridStart);
    // 一年最多 53 周，每周 7 天
    for (let w = 0; w < 53; w++) {
      const week: { date: string | null; day: number | null }[] = [];
      for (let d = 0; d < 7; d++) {
        const y = cursor.getFullYear();
        const m = cursor.getMonth() + 1;
        const day = cursor.getDate();
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (y === year) {
          week.push({ date: dateStr, day });
        } else {
          week.push({ date: null, day: null });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
      if (cursor.getFullYear() > year && cursor.getDay() === 1) break;
    }
    return result;
  }, [year]);

  const yearCheckinCount = useMemo(() => {
    return Object.keys(checkins).filter((d) => d.startsWith(`${year}-`)).length;
  }, [checkins, year]);

  const cellState = (dateStr: string | null): string => {
    if (!dateStr) return 'empty';
    if (dateStr > today) return 'future';
    return checkins[dateStr] ? 'checked' : 'none';
  };

  return (
    <View className="heatmap">
      {/* 年份切换 */}
      <View className="heatmap__header">
        <View className="heatmap__nav" onClick={onPrev}>‹</View>
        <View className="heatmap__title-wrap">
          <Text className="heatmap__year">{year}</Text>
          <Text className="heatmap__count">· 打卡 {yearCheckinCount} 天</Text>
        </View>
        <View className="heatmap__nav" onClick={onNext}>›</View>
      </View>

      {/* 热力图网格（横向可滚动） */}
      <ScrollView scrollX className="heatmap__scroll" enhanced showScrollbar={false}>
        <View className="heatmap__grid-wrap">
          <View className="heatmap__content">
            {/* 周几标签：对齐到第 0/2/4/6 行（一/三/五/日） */}
            <View className="heatmap__weeklabels">
              {['一', '', '三', '', '五', '', '日'].map((label, i) => (
                <View key={i} className="heatmap__weeklabel">
                  {label && <Text className="heatmap__weeklabel-text">{label}</Text>}
                </View>
              ))}
            </View>
            {/* 周列 */}
            {weeks.map((week, wi) => (
              <View key={wi} className="heatmap__week">
                {week.map((cell, di) => {
                  const state = cellState(cell.date);
                  return (
                    <View
                      key={di}
                      className={cn(
                        'heatmap__cell',
                        `heatmap__cell--${state}`,
                        cell.date === selected && 'heatmap__cell--selected',
                      )}
                      onTouchStart={() => {
                        if (cell.date) setSelected(cell.date);
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          {/* 月份标签 */}
          <View className="heatmap__months">
            {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map((m) => (
              <Text key={m} className="heatmap__month">{m}</Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 图例 */}
      <View className="heatmap__legend">
        <Text className="heatmap__legend-text">少</Text>
        <View className="heatmap__legend-swatch heatmap__legend-swatch--0" />
        <View className="heatmap__legend-swatch heatmap__legend-swatch--1" />
        <View className="heatmap__legend-swatch heatmap__legend-swatch--2" />
        <View className="heatmap__legend-swatch heatmap__legend-swatch--3" />
        <Text className="heatmap__legend-text">多</Text>
      </View>

      {/* 触摸提示 */}
      {selected && (
        <View className="heatmap__tooltip">
          <Text className="heatmap__tooltip-date">{selected}</Text>
          {checkins[selected] ? (
            <Text className="heatmap__tooltip-quote">「{checkins[selected].quote}」</Text>
          ) : (
            <Text className="heatmap__tooltip-empty">未打卡</Text>
          )}
        </View>
      )}
    </View>
  );
}
