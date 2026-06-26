import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import {
  calcPension,
  calcRetirementAge,
  formatMoney,
  formatPercent,
  formatYears,
  PROVINCE_AVG_SALARY,
} from '@/lib/pension';
import SectionHeader from '@/components/SectionHeader';
import MetricCard from '@/components/MetricCard';
import StackedBar from '@/components/StackedBar';
import ProfileModal from '@/components/ProfileModal';
import TopTab from '@/components/TopTab';
import './index.scss';

const GENDER_TEXT: Record<string, string> = { male: '男', female: '女' };
const IDENTITY_TEXT: Record<string, string> = { worker: '工人', cadre: '干部' };

// 养老金三段配色（与账本主题一致）
const COLOR_BASIC = '#1c1a17'; // $ink
const COLOR_PERSONAL = '#c8893b'; // $amber
const COLOR_TRANSITIONAL = '#b23a2e'; // $stamp

export default function Calc() {
  const profile = useStore((s) => s.profile);
  const retirement = calcRetirementAge(profile);
  const pension = calcPension(profile);

  const [profileOpen, setProfileOpen] = useState(false);

  const segments = [
    { label: '基础养老金', value: pension.basicPension, color: COLOR_BASIC },
    { label: '个人账户养老金', value: pension.personalAccountPension, color: COLOR_PERSONAL },
    { label: '过渡性养老金', value: pension.transitionalPension, color: COLOR_TRANSITIONAL },
  ];

  return (
    <View className="page container">
      {/* 顶部 Tab 导航 + 调整参数按钮 */}
      <TopTab
        current="calc"
        extra={
          <View className="toptab-btn" onClick={() => setProfileOpen(true)}>
            <Text>调整参数</Text>
          </View>
        }
      />

      {/* 养老金总额 */}
      <View className="section">
        <SectionHeader
          eyebrow="退休账本 · Pension"
          title="预计月养老金"
          desc="依据 2025 年渐进式延迟退休政策与城镇职工基本养老保险计发办法的简化模型测算。"
        />
        <View className="total-card card-paper">
          <Text className="total-eyebrow">每月可领</Text>
          <View className="total-row">
            <Text className="num total-value">{formatMoney(pension.totalMonthly)}</Text>
            <Text className="total-unit">元/月</Text>
          </View>
          <View className="almanac-rule total-rule" />
          <View className="total-meta">
            <Text className="meta-label">养老金替代率</Text>
            <Text className="num meta-value">{formatPercent(pension.replacementRate)}</Text>
          </View>
        </View>
      </View>

      {/* 三段构成 */}
      <View className="section">
        <SectionHeader eyebrow="构成 · Composition" title="养老金三段构成" />
        <StackedBar segments={segments} total={pension.totalMonthly} />
      </View>

      {/* 关键指标 */}
      <View className="section">
        <SectionHeader eyebrow="指标 · Metrics" title="关键测算指标" />
        <View className="metric-grid">
          <MetricCard
            label="法定退休年龄"
            value={`${retirement.years}`}
            unit={retirement.months > 0 ? `岁 ${retirement.months} 月` : '岁'}
            accent="ink"
          >
            {retirement.delayed && (
              <Text className="num card-extra">延迟 {retirement.delayedMonths} 个月</Text>
            )}
          </MetricCard>
          <MetricCard
            label="个人账户累计"
            value={formatMoney(pension.personalAccountAtRetirement)}
            unit="元"
            hint="含现有余额复利 + 退休前继续缴费"
            accent="amber"
          />
          <MetricCard
            label="计发月数"
            value={`${pension.payoutMonths}`}
            unit="月"
            hint="按退休年龄查表确定"
            accent="slate"
          />
          <MetricCard
            label="累计缴费年限"
            value={formatYears(pension.totalContributionYears)}
            hint={`含退休前剩余 ${formatYears(pension.remaining.years + pension.remaining.months / 12)}`}
            accent="stamp"
          />
        </View>
      </View>

      {/* 测算明细 */}
      <View className="section">
        <SectionHeader eyebrow="明细 · Detail" title="计发明细" />
        <View className="ledger card-paper">
          <LedgerRow label="基础养老金" formula="(社平工资 + 指数化月均工资) ÷ 2 × 缴费年限 × 1%" value={pension.basicPension} />
          <LedgerRow label="个人账户养老金" formula="个人账户累计 ÷ 计发月数" value={pension.personalAccountPension} />
          <LedgerRow
            label="过渡性养老金"
            formula="视同缴费年限 × 社平工资 × 指数 × 1.3%"
            value={pension.transitionalPension}
          />
          <View className="ledger-divider almanac-rule" />
          <View className="ledger-row ledger-row--total">
            <View className="ledger-label-wrap">
              <Text className="ledger-label ledger-label--strong">月养老金合计</Text>
            </View>
            <Text className="num ledger-value ledger-value--total">
              {formatMoney(pension.totalMonthly)}
            </Text>
          </View>
        </View>
      </View>

      {/* 当前参数 */}
      <View className="section">
        <SectionHeader eyebrow="参数 · Inputs" title="当前测算参数" />
        <View className="params card-paper">
          <ParamRow k="出生年月" v={profile.birthDate} />
          <ParamRow k="性别" v={`${GENDER_TEXT[profile.gender]}（${IDENTITY_TEXT[profile.identity]}）`} />
          <ParamRow k="所在省份" v={`${profile.province}（社平 ${formatMoney(PROVINCE_AVG_SALARY[profile.province] ?? 0)} 元）`} />
          <ParamRow k="参加工作时间" v={profile.workStartDate} />
          <ParamRow k="当前月工资" v={`${formatMoney(profile.monthlySalary)} 元`} />
          <ParamRow k="平均缴费指数" v={profile.avgContributionIndex.toFixed(2)} />
          <ParamRow k="个人账户余额" v={`${formatMoney(profile.personalAccountBalance)} 元`} />
          <ParamRow k="已缴费年限" v={formatYears(profile.paidYears)} />
        </View>
        <View className={cn('param-tip')} onClick={() => setProfileOpen(true)}>
          <Text>✎ 点此调整参数重新测算</Text>
        </View>
      </View>

      {/* 底部声明 */}
      <View className="footer">
        <View className="almanac-rule" />
        <Text className="footer-text">
          上述结果基于简化模型与公开政策参数估算，
          <Text className="footer-warn">仅供参考，不构成任何官方承诺或法律依据。</Text>
          实际退休年龄与待遇以参保地社保经办机构核定为准。
        </Text>
      </View>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </View>
  );
}

/* ---------- 明细行 ---------- */
function LedgerRow({ label, formula, value }: { label: string; formula: string; value: number }) {
  return (
    <View className="ledger-row">
      <View className="ledger-label-wrap">
        <Text className="ledger-label">{label}</Text>
        <Text className="ledger-formula">{formula}</Text>
      </View>
      <Text className="num ledger-value">{formatMoney(value)}</Text>
    </View>
  );
}

/* ---------- 参数行 ---------- */
function ParamRow({ k, v }: { k: string; v: string }) {
  return (
    <View className="param-row">
      <Text className="param-k">{k}</Text>
      <Text className="num param-v">{v}</Text>
    </View>
  );
}
