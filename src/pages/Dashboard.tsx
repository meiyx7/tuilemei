import { Link } from "react-router-dom";
import { ArrowRight, Settings } from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  calcPension,
  calcRetirementAge,
  parseYearMonth,
  todayYm,
} from "@/lib/pension";
import CountdownHero from "@/components/CountdownHero";
import CheckinButton from "@/components/CheckinButton";
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
      {/* 头条：倒计时主视觉（占满宽度，打卡改为右下角悬浮按钮） */}
      <section className="flex flex-col gap-4">
        <CountdownHero
          retirement={retirement}
          pension={pension}
          careerProgress={careerProgress}
        />
        {!onboarded && (
          <Link
            to="/profile"
            className="flex items-center gap-1.5 self-start text-xs text-slate transition-colors hover:text-ink"
          >
            <Settings size={12} />
            填写你的真实档案，重算倒计时
            <ArrowRight size={12} />
          </Link>
        )}
      </section>

      {/* 悬浮打卡按钮（固定在页面右下角） */}
      <CheckinButton />

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

/** 缴满 N 年的月份 */
function minContributionDate(workStart: string, years: number): string {
  const { year, month } = parseYearMonth(workStart);
  const total = year * 12 + (month - 1) + years * 12;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}
