import { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { todayYm } from '@/lib/pension';
import SectionHeader from '@/components/SectionHeader';
import MetricCard from '@/components/MetricCard';
import MonthCalendar from '@/components/MonthCalendar';
import Heatmap from '@/components/Heatmap';
import './index.scss';

type ViewMode = 'month' | 'heatmap';

export default function History() {
  const checkins = useStore((s) => s.checkins);
  const changelog = useStore((s) => s.changelog);
  const streak = useStore((s) => s.streak());
  const totalCheckins = useStore((s) => s.totalCheckins());

  const goDashboard = () => Taro.switchTab({ url: '/pages/dashboard/index' });

  // 月历状态
  const nowYm = todayYm();
  const [calYear, setCalYear] = useState(Number(nowYm.split('-')[0]));
  const [calMonth, setCalMonth] = useState(Number(nowYm.split('-')[1]));
  // 热力图状态
  const [heatYear, setHeatYear] = useState(Number(nowYm.split('-')[0]));
  // 视图切换
  const [view, setView] = useState<ViewMode>('month');

  // 本年打卡数
  const yearCheckinCount = useMemo(
    () => Object.keys(checkins).filter((d) => d.startsWith(`${calYear}-`)).length,
    [checkins, calYear],
  );

  // 寄语列表：按日期倒序，取最近 12 条
  const quoteList = useMemo(() => {
    return Object.values(checkins)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 12);
  }, [checkins]);

  // 首次打卡日期
  const firstCheckin = useMemo(() => {
    const dates = Object.keys(checkins).sort();
    return dates[0] ?? null;
  }, [checkins]);

  // 月历导航
  const prevMonth = () => {
    let m = calMonth - 1;
    let y = calYear;
    if (m < 1) { m = 12; y -= 1; }
    setCalMonth(m);
    setCalYear(y);
  };
  const nextMonth = () => {
    let m = calMonth + 1;
    let y = calYear;
    if (m > 12) { m = 1; y += 1; }
    setCalMonth(m);
    setCalYear(y);
  };

  // 热力图导航
  const prevYear = () => setHeatYear((y) => y - 1);
  const nextYear = () => setHeatYear((y) => y + 1);

  return (
    <View className="page container">
      {/* 顶部操作行 */}
      <View className="topbar">
        <View className="topbar-btn" onClick={goDashboard}>
          <Text>‹ 返回</Text>
        </View>
      </View>

      {/* 打卡概览 */}
      <View className="section">
        <SectionHeader eyebrow="打卡历史 · History" title="坚持的痕迹" />
        <View className="metric-grid">
          <MetricCard label="累计打卡" value={`${totalCheckins}`} unit="天" accent="stamp" />
          <MetricCard label="连续打卡" value={`${streak}`} unit="天" accent="amber" />
          <MetricCard
            label="本年打卡"
            value={`${yearCheckinCount}`}
            unit="天"
            hint={`${calYear} 年累计`}
            accent="ink"
          />
          <MetricCard
            label="首次打卡"
            value={firstCheckin ? firstCheckin.slice(5) : '—'}
            hint={firstCheckin ? firstCheckin.slice(0, 4) : '尚未开始打卡'}
            accent="slate"
          />
        </View>
      </View>

      {/* 打卡日历 */}
      <View className="section">
        <View className="section-head-row">
          <SectionHeader eyebrow="日历 · Calendar" title="打卡日历" />
          <View className="view-switch">
            <View
              className={cn('switch-btn', view === 'month' && 'switch-btn--active')}
              onClick={() => setView('month')}
            >
              <Text>月历</Text>
            </View>
            <View
              className={cn('switch-btn', view === 'heatmap' && 'switch-btn--active')}
              onClick={() => setView('heatmap')}
            >
              <Text>热力图</Text>
            </View>
          </View>
        </View>
        <View className="calendar-card card-paper">
          {view === 'month' ? (
            <MonthCalendar
              year={calYear}
              month={calMonth}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
          ) : (
            <Heatmap year={heatYear} onPrev={prevYear} onNext={nextYear} />
          )}
        </View>
      </View>

      {/* 寄语集 */}
      <View className="section">
        <SectionHeader eyebrow="寄语 · Quotes" title="每日寄语集" />
        {quoteList.length === 0 ? (
          <View className="empty card-paper">
            <Text className="empty-text">还没有打卡记录，去首页打卡吧。</Text>
          </View>
        ) : (
          <View className="quote-list">
            {quoteList.map((c) => (
              <View key={c.date} className="quote-item card-paper">
                <Text className="num quote-date">{c.date}</Text>
                <Text className="quote-text">「{c.quote}」</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 档案变更记录 */}
      <View className="section">
        <SectionHeader eyebrow="变更 · Changelog" title="档案变更记录" />
        {changelog.length === 0 ? (
          <View className="empty card-paper">
            <Text className="empty-text">暂无变更记录。</Text>
          </View>
        ) : (
          <View className="changelog card-paper">
            {changelog.slice(0, 20).map((entry, i) => (
              <View key={i} className="changelog-row">
                <View className="changelog-field">
                  <Text className="changelog-field-name">{entry.field}</Text>
                  <Text className="num changelog-time">
                    {formatTime(entry.timestamp)}
                  </Text>
                </View>
                <View className="changelog-diff">
                  <Text className="num changelog-old">{entry.oldValue || '—'}</Text>
                  <Text className="changelog-arrow">→</Text>
                  <Text className="num changelog-new">{entry.newValue}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 底部声明 */}
      <View className="footer">
        <View className="almanac-rule" />
        <Text className="footer-text">
          打卡数据与档案信息均保存在本机本地存储，不会上传服务器。
        </Text>
      </View>
    </View>
  );
}

/** ISO 时间字符串 → "MM-DD HH:mm" */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '';
  }
}
