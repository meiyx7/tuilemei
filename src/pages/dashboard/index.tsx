import { useState } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import {
  calcPension,
  calcRetirementAge,
  parseYearMonth,
  todayYm,
} from '@/lib/pension';
import { drawShareCard, saveCanvasToAlbum } from '@/lib/share';
import { APP_VERSION, BUILD_TIME } from '@/lib/updater';
import CountdownHero from '@/components/CountdownHero';
import ProfileModal from '@/components/ProfileModal';
import OnboardingModal from '@/components/OnboardingModal';
import './index.scss';

export default function Dashboard() {
  const profile = useStore((s) => s.profile);
  const onboarded = useStore((s) => s.onboarded);
  const streak = useStore((s) => s.streak());
  const retirement = calcRetirementAge(profile);
  const pension = calcPension(profile);

  const [profileOpen, setProfileOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  // 职业生涯进度：已工作月数 / 总工作月数（入职到退休）
  const workStartMonths = parseYearMonth(profile.workStartDate).year * 12 +
    parseYearMonth(profile.workStartDate).month - 1;
  const retireMonths = parseYearMonth(retirement.retirementDate).year * 12 +
    parseYearMonth(retirement.retirementDate).month - 1;
  const nowMonths = parseYearMonth(todayYm()).year * 12 +
    parseYearMonth(todayYm()).month - 1;
  const careerProgress = Math.max(
    0,
    Math.min(1, (nowMonths - workStartMonths) / (retireMonths - workStartMonths || 1)),
  );

  // 分享：showLoading → 获取 Canvas 节点 → drawShareCard → saveCanvasToAlbum → hideLoading
  const handleShare = () => {
    if (sharing) return;
    setSharing(true);
    Taro.showLoading({ title: '生成中...', mask: true });
    const query = Taro.createSelectorQuery();
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res[0]?.node;
      if (!canvas) {
        Taro.hideLoading();
        setSharing(false);
        Taro.showToast({ title: '分享失败', icon: 'none' });
        return;
      }
      const ctx = canvas.getContext('2d');
      drawShareCard(ctx, canvas, { retirement, pension, careerProgress, streak });
      setTimeout(async () => {
        try {
          await saveCanvasToAlbum(canvas);
        } catch {
          Taro.showToast({ title: '保存失败', icon: 'none' });
        } finally {
          Taro.hideLoading();
          setSharing(false);
        }
      }, 80);
    });
  };

  const goCalc = () => {
    Taro.switchTab({ url: '/pages/calc/index' });
  };

  return (
    <View className="page container">
      {/* 顶部操作行 */}
      <View className="topbar">
        <View className="topbar-btn" onClick={() => setProfileOpen(true)}>
          <Text>设置</Text>
        </View>
        <View className={cn('topbar-btn', sharing && 'topbar-btn-disabled')} onClick={handleShare}>
          <Text>{sharing ? '◌ 生成中' : '↗ 分享'}</Text>
        </View>
      </View>

      {/* 倒计时主视觉 */}
      <View className="section">
        <SectionHeader eyebrow="退休进度 · Countdown" title="今天您退了没" />
        <CountdownHero
          retirement={retirement}
          pension={pension}
          careerProgress={careerProgress}
        />
      </View>

      {/* 进度轴 */}
      <View className="section">
        <View className="section-head-row">
          <SectionHeader eyebrow="进度轴 · Timeline" title="从入职到退休" />
          <View className="link-more" onClick={goCalc}>
            <Text>退休账本 ›</Text>
          </View>
        </View>
        <Timeline
          nodes={[
            { label: '参加工作', date: profile.workStartDate },
            { label: '缴满 15 年', date: minContributionDate(profile.workStartDate, 15) },
            { label: '法定退休', date: retirement.retirementDate },
          ]}
        />
      </View>

      {/* 底部声明 */}
      <View className="footer">
        <View className="almanac-rule" />
        <Text className="footer-text">
          「退了没」为退休进度追踪与养老金测算工具，测算依据 2025 年渐进式延迟退休政策与城镇职工基本养老保险计发办法的简化模型，
          <Text className="footer-warn">结果仅供参考，不构成任何官方承诺或法律依据。</Text>
          实际退休年龄与待遇以参保地社保经办机构核定为准。
        </Text>
        <Text className="footer-version">
          v{APP_VERSION}
          {BUILD_TIME ? ` · ${BUILD_TIME}` : ''}
        </Text>
      </View>

      {/* 隐藏的分享 Canvas（type='2d'） */}
      <Canvas type="2d" id="shareCanvas" className="share-canvas" />

      {/* 首次使用引导 */}
      <OnboardingModal open={!onboarded} onClose={() => {}} />
      {/* 个人档案设置 */}
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </View>
  );
}

/** 缴满 N 年的月份 */
function minContributionDate(workStart: string, years: number): string {
  const { year, month } = parseYearMonth(workStart);
  const total = year * 12 + (month - 1) + years * 12;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/* ---------- 内联：章节标题 ---------- */
function SectionHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View className="section-header">
      {eyebrow && <Text className="eyebrow">{eyebrow}</Text>}
      <Text className="section-title">{title}</Text>
      <View className="almanac-rule section-rule" />
    </View>
  );
}

/* ---------- 内联：进度轴 ---------- */
interface TimelineNode {
  label: string;
  date: string;
  past?: boolean;
  current?: boolean;
}

function ymToMonths(ym: string): number {
  const { year, month } = parseYearMonth(ym);
  return year * 12 + month;
}

function Timeline({ nodes }: { nodes: TimelineNode[] }) {
  const nowMonths = ymToMonths(todayYm());

  const realNodes = nodes.filter((n) => !n.current && ymToMonths(n.date) !== nowMonths);
  const sorted = [...realNodes].sort((a, b) => ymToMonths(a.date) - ymToMonths(b.date));

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
    <View className="timeline">
      <View className="tl-track" />
      <View className="tl-progress" style={{ width: `${progress}%` }} />
      <View className="tl-grid" style={{ gridTemplateColumns: `repeat(${finalNodes.length}, 1fr)` }}>
        {finalNodes.map((node, i) => (
          <View key={`${node.label}-${i}`} className="tl-node">
            <View className={cn(
              'tl-dot-wrap',
              node.current ? 'tl-dot-current' : node.past ? 'tl-dot-past' : 'tl-dot-future',
            )}>
              <View className={cn(
                'tl-dot',
                node.current ? 'tl-dot-in-current' : node.past ? 'tl-dot-in-past' : 'tl-dot-in-future',
              )} />
            </View>
            <Text className={cn(
              'tl-label',
              node.current ? 'tl-label-current' : node.past ? 'tl-label-past' : 'tl-label-future',
            )}>
              {node.label}
            </Text>
            <Text className="num tl-date">{node.date}</Text>
          </View>
        ))}
      </View>
    </View>
  );
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
