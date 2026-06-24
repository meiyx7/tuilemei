import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import {
  calcPension,
  calcRetirementAge,
  formatMoney,
  formatPercent,
  formatYears,
  getDelayPolicy,
} from "@/lib/pension";
import SectionHeader from "@/components/SectionHeader";
import MetricCard from "@/components/MetricCard";
import StackedBar from "@/components/StackedBar";

export default function Calculator() {
  const profile = useStore((s) => s.profile);
  const retirement = calcRetirementAge(profile);
  const pension = calcPension(profile);
  const policy = getDelayPolicy(profile.gender, profile.identity);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="退休账本 · Ledger"
        title="你的退休账本"
        desc="依据 2025 年渐进式延迟退休政策与城镇职工基本养老保险计发办法的简化模型测算。"
      />

      {/* 退休年龄 */}
      <section className="card-paper p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="num text-sm font-semibold text-amber">A</span>
          <h3 className="font-display text-xl font-semibold text-ink">法定退休年龄</h3>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="num text-6xl font-black text-ink">
                {retirement.years}
              </span>
              <span className="font-display text-2xl text-slate">岁</span>
              {retirement.months > 0 && (
                <>
                  <span className="num text-4xl font-bold text-amber">
                    {retirement.months}
                  </span>
                  <span className="font-display text-xl text-slate">个月</span>
                </>
              )}
            </div>
            <p className="text-sm text-slate">
              原法定退休年龄 <span className="num font-semibold text-ink">{policy.baseAgeYears}</span> 岁，
              {retirement.delayed ? (
                <>
                  因延迟政策增加
                  <span className="num font-semibold text-amber"> {retirement.delayedMonths} </span>个月
                </>
              ) : (
                "未适用延迟政策"
              )}
            </p>
            <p className="text-sm text-slate">
              预计退休月份
              <span className="num ml-2 font-semibold text-ink">
                {retirement.retirementDate}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-start">
            <MiniStat label="原退休年龄" value={`${policy.baseAgeYears} 岁`} />
            <MiniStat label="目标退休年龄" value={`${policy.targetAgeYears} 岁`} />
            <MiniStat
              label="延迟步长"
              value={`每 ${policy.stepMonths} 个月 +1 月`}
            />
            <MiniStat
              label="距退休剩余"
              value={
                pension.remaining.totalDays <= 0
                  ? "已到龄"
                  : `${pension.remaining.years} 年 ${pension.remaining.months} 月`
              }
              highlight
            />
          </div>
        </div>
      </section>

      {/* 养老金构成 */}
      <section className="card-paper p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="num text-sm font-semibold text-amber">B</span>
          <h3 className="font-display text-xl font-semibold text-ink">月养老金构成</h3>
        </div>

        <div className="mb-6 flex flex-col gap-1">
          <span className="label-eyebrow">合计月养老金</span>
          <div className="flex items-baseline gap-2">
            <span className="num text-5xl font-black text-stamp md:text-6xl">
              {formatMoney(pension.totalMonthly)}
            </span>
            <span className="font-display text-xl text-slate">元 / 月</span>
          </div>
          <span className="text-sm text-slate">
            替代率 {formatPercent(pension.replacementRate)}（占当前工资）
          </span>
        </div>

        <StackedBar
          total={pension.totalMonthly}
          segments={[
            { label: "基础养老金", value: pension.basicPension, color: "bg-amber" },
            { label: "个人账户养老金", value: pension.personalAccountPension, color: "bg-stamp" },
            { label: "过渡性养老金", value: pension.transitionalPension, color: "bg-slate" },
          ]}
        />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BreakdownCard
            label="基础养老金"
            value={pension.basicPension}
            formula="(社平工资 + 指数化工资) ÷ 2 × 缴费年限 × 1%"
          />
          <BreakdownCard
            label="个人账户养老金"
            value={pension.personalAccountPension}
            formula={`账户余额 ÷ 计发月数 ${pension.payoutMonths}`}
          />
          <BreakdownCard
            label="过渡性养老金"
            value={pension.transitionalPension}
            formula="视同缴费年限 × 社平工资 × 指数 × 1.3%"
          />
        </div>
      </section>

      {/* 测算明细 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="退休时账户余额"
          value={formatMoney(pension.personalAccountAtRetirement)}
          unit="元"
          hint="按 4% 记账利率推算"
        />
        <MetricCard
          label="计发月数"
          value={String(pension.payoutMonths)}
          unit="月"
          hint="按退休年龄查表"
          accent="amber"
        />
        <MetricCard
          label="累计缴费年限"
          value={formatYears(pension.totalContributionYears)}
          hint={`已缴 ${profile.paidYears} 年`}
          accent="slate"
        />
        <MetricCard
          label="视同缴费年限"
          value={formatYears(pension.deemedYears)}
          hint="1996 年前工龄"
          accent="slate"
        />
      </section>

      {/* 公式说明 */}
      <FormulaExplainer profile={profile} pension={pension} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[3px] border p-3",
        highlight ? "border-amber/50 bg-amber/5" : "border-card-edge bg-paper/40",
      )}
    >
      <div className="label-eyebrow mb-1">{label}</div>
      <div className="num text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function BreakdownCard({
  label,
  value,
  formula,
}: {
  label: string;
  value: number;
  formula: string;
}) {
  return (
    <div className="rounded-[3px] border border-card-edge bg-paper/40 p-4">
      <div className="label-eyebrow mb-2">{label}</div>
      <div className="num mb-2 text-2xl font-bold text-ink">
        {formatMoney(value)}
        <span className="ml-1 text-xs font-normal text-slate">元/月</span>
      </div>
      <div className="num text-[0.7rem] leading-relaxed text-slate-soft">{formula}</div>
    </div>
  );
}

function FormulaExplainer({
  profile,
  pension,
}: {
  profile: ReturnType<typeof useStore.getState>["profile"];
  pension: ReturnType<typeof calcPension>;
}) {
  const [open, setOpen] = useState(false);
  const indexedWage = profile.socialAvgSalary * profile.avgContributionIndex;

  return (
    <section className="card-paper overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-6 text-left md:p-8"
      >
        <div className="flex items-center gap-3">
          <Info size={18} className="text-slate" />
          <div className="flex flex-col">
            <span className="label-eyebrow">测算说明</span>
            <span className="font-display text-lg font-semibold text-ink">
              公式与假设
            </span>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={cn(
            "text-slate transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="animate-riseIn border-t border-card-edge px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 text-sm leading-relaxed text-slate">
            <FormulaRow
              title="基础养老金"
              expr={`(${formatMoney(profile.socialAvgSalary)} + ${formatMoney(indexedWage)}) ÷ 2 × ${pension.totalContributionYears.toFixed(1)} × 1%`}
              result={pension.basicPension}
            />
            <FormulaRow
              title="个人账户养老金"
              expr={`${formatMoney(pension.personalAccountAtRetirement)} ÷ ${pension.payoutMonths}`}
              result={pension.personalAccountPension}
            />
            <FormulaRow
              title="过渡性养老金"
              expr={`${pension.deemedYears.toFixed(1)} × ${formatMoney(profile.socialAvgSalary)} × ${profile.avgContributionIndex} × 1.3%`}
              result={pension.transitionalPension}
            />
            <div className="almanac-rule" />
            <ul className="flex flex-col gap-2 text-xs text-slate-soft">
              <li>· 个人账户余额按 4% 年化记账利率、并继续按工资 8% 缴费至退休进行年金终值推算。</li>
              <li>· 视同缴费年限按 1996 年 1 月前工龄简化计算，各地实际建立时间略有差异。</li>
              <li>· 过渡性养老金计发系数取 1.3%，部分地区为 1.0%~1.4%。</li>
              <li>· 本测算为简化模型，实际待遇以参保地社保经办机构核定为准。</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function FormulaRow({
  title,
  expr,
  result,
}: {
  title: string;
  expr: string;
  result: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body font-medium text-ink">{title}</span>
      <code className="num block rounded-[3px] bg-paper-2 px-3 py-2 text-[0.8rem] text-ink-soft">
        {expr}
      </code>
      <span className="num text-xs text-slate">
        = <span className="font-semibold text-stamp">{formatMoney(result)}</span> 元/月
      </span>
    </div>
  );
}
