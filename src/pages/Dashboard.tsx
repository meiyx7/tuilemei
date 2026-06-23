import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Coins, Hourglass, IdCard, Settings } from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  calcPension,
  calcRetirementAge,
  formatMoney,
  formatPercent,
  parseYearMonth,
  todayYm,
} from "@/lib/pension";
import CountdownHero from "@/components/CountdownHero";
import CheckinButton from "@/components/CheckinButton";
import MetricCard from "@/components/MetricCard";
import SectionHeader from "@/components/SectionHeader";
import Timeline from "@/components/Timeline";

export default function Dashboard() {
  const profile = useStore((s) => s.profile);
  const onboarded = useStore((s) => s.onboarded);
  const retirement = calcRetirementAge(profile);
  const pension = calcPension(profile);

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

  return (
    <div className="flex flex-col gap-10">
      {/* 头条：倒计时主视觉 + 打卡 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <CountdownHero
          retirement={retirement}
          pension={pension}
          careerProgress={careerProgress}
        />
        <div className="card-paper flex flex-col items-center justify-center gap-6 p-6 md:p-8">
          <SectionHeader eyebrow="每日仪式" title="今日打卡" align="center" />
          <CheckinButton />
          {!onboarded && (
            <Link
              to="/profile"
              className="flex items-center gap-1.5 text-xs text-slate transition-colors hover:text-ink"
            >
              <Settings size={12} />
              填写你的真实档案，重算倒计时
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </section>

      {/* 关键指标 */}
      <section className="flex flex-col gap-5">
        <SectionHeader
          eyebrow="关键指标 · Key Figures"
          title="退休速览"
          desc="基于当前档案的实时测算，修改档案后此处自动更新。"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="法定退休年龄"
            value={`${retirement.years}${retirement.months > 0 ? `+${retirement.months}` : ""}`}
            unit="岁"
            hint={retirement.delayed ? `延迟 ${retirement.delayedMonths} 个月` : "未适用延迟"}
            accent="amber"
          >
            <IconRow icon={<Hourglass size={13} />} text="2025 延迟退休政策" />
          </MetricCard>
          <MetricCard
            label="预计退休月份"
            value={retirement.retirementDate}
            hint={`距今约 ${formatMoney(pension.remaining.totalDays)} 天`}
            accent="ink"
          >
            <IconRow icon={<CalendarCheck size={13} />} text="出生年月推算" />
          </MetricCard>
          <MetricCard
            label="预估月养老金"
            value={formatMoney(pension.totalMonthly)}
            unit="元"
            hint={`替代率 ${formatPercent(pension.replacementRate)}`}
            accent="stamp"
          >
            <IconRow icon={<Coins size={13} />} text="基础+账户+过渡" />
          </MetricCard>
          <MetricCard
            label="累计缴费年限"
            value={pension.totalContributionYears.toFixed(1)}
            unit="年"
            hint={`已缴 ${profile.paidYears} 年`}
            accent="slate"
          >
            <IconRow icon={<IdCard size={13} />} text="含未来继续缴费" />
          </MetricCard>
        </div>
      </section>

      {/* 进度轴 */}
      <section className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="进度轴 · Timeline"
            title="从入职到退休"
            className="flex-1"
          />
          <Link
            to="/calc"
            className="group hidden items-center gap-1 text-sm text-slate transition-colors hover:text-ink sm:flex"
          >
            查看完整测算
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="card-paper p-6 md:p-8">
          <Timeline
            nodes={[
              { label: "参加工作", date: profile.workStartDate, past: true },
              { label: "当前", date: todayYm(), current: true, past: true },
              { label: "缴满 15 年", date: minContributionDate(profile.workStartDate, 15), past: true },
              { label: "法定退休", date: retirement.retirementDate },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function IconRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[0.7rem] text-slate-soft">
      {icon}
      <span>{text}</span>
    </div>
  );
}

/** 缴满 N 年的月份 */
function minContributionDate(workStart: string, years: number): string {
  const { year, month } = parseYearMonth(workStart);
  const total = year * 12 + (month - 1) + years * 12;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}
