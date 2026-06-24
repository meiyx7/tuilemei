import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Settings, Share2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  calcPension,
  calcRetirementAge,
  parseYearMonth,
  todayYm,
} from "@/lib/pension";
import { shareElement } from "@/lib/share";
import CountdownHero from "@/components/CountdownHero";
import SectionHeader from "@/components/SectionHeader";
import Timeline from "@/components/Timeline";

export default function Dashboard() {
  const profile = useStore((s) => s.profile);
  const onboarded = useStore((s) => s.onboarded);
  const retirement = calcRetirementAge(profile);
  const pension = calcPension(profile);

  const shareRef = useRef<HTMLDivElement>(null);
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

  const handleShare = async () => {
    if (!shareRef.current) return;
    setSharing(true);
    try {
      await shareElement(shareRef.current);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex flex-col gap-12">
      {/* 可分享区域：倒计时主视觉 + 进度轴（一体化，无卡片割裂） */}
      <div ref={shareRef} className="flex flex-col gap-10">
        {/* 头条：倒计时主视觉（圆环即打卡入口） */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <SectionHeader
              eyebrow="退休进度 · Countdown"
              title="离退休还有多久"
              className="flex-1"
            />
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex shrink-0 items-center gap-1.5 rounded-[3px] border border-card-edge px-3 py-1.5 text-xs text-slate transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
            >
              {sharing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Share2 size={13} />
              )}
              {sharing ? "生成中" : "分享"}
            </button>
          </div>
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

        {/* 进度轴 */}
        <section className="flex flex-col gap-5">
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
              退休账本
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <Timeline
            nodes={[
              { label: "参加工作", date: profile.workStartDate },
              { label: "当前", date: todayYm() },
              { label: "缴满 15 年", date: minContributionDate(profile.workStartDate, 15) },
              { label: "法定退休", date: retirement.retirementDate },
            ]}
          />
        </section>
      </div>
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
