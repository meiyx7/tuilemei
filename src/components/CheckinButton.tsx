import { useState } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { todayStr } from "@/lib/pension";
import Stamp from "./Stamp";

/** 每日打卡按钮：印章红圆形按钮，打卡后盖"已打卡"邮戳 */
export default function CheckinButton() {
  const checked = useStore((s) => s.isCheckedInToday());
  const checkinToday = useStore((s) => s.checkinToday);
  const streak = useStore((s) => s.streak());
  const checkins = useStore((s) => s.checkins);
  const [justChecked, setJustChecked] = useState(false);

  const todayQuote = checkins[todayStr()]?.quote;

  const handleCheckin = () => {
    if (checked) return;
    checkinToday();
    setJustChecked(true);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative grid place-items-center">
        <button
          onClick={handleCheckin}
          disabled={checked}
          className={cn(
            "group grid h-32 w-32 place-items-center rounded-full border-2 transition-all duration-200",
            "active:translate-y-px",
            checked
              ? "cursor-default border-stamp/40 bg-transparent"
              : "border-stamp bg-stamp text-paper shadow-stamp hover:bg-stamp-deep hover:border-stamp-deep",
          )}
          aria-label={checked ? "今日已打卡" : "今日打卡"}
        >
          {checked ? (
            <span className="font-display text-sm font-medium text-stamp/70">
              已完成
            </span>
          ) : (
            <span className="flex flex-col items-center leading-none">
              <span className="font-display text-lg font-bold">打卡</span>
              <span className="num mt-1 text-[0.6rem] opacity-80">CHECK-IN</span>
            </span>
          )}
        </button>
        {checked && justChecked && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <Stamp label="已打卡" sub={todayStr().slice(5)} size="lg" animate />
          </div>
        )}
        {checked && !justChecked && (
          <div className="pointer-events-none absolute -right-3 -top-3 rotate-[-11deg]">
            <Stamp label="已打卡" sub={todayStr().slice(5)} size="sm" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        {checked ? (
          <>
            <p className="font-display text-lg font-semibold text-ink">
              连续打卡 {streak} 天
            </p>
            {todayQuote && (
              <p className="max-w-xs text-sm italic text-slate">「{todayQuote}」</p>
            )}
          </>
        ) : (
          <p className="max-w-xs text-sm text-slate">
            点击印章完成今日打卡，记录你离退休又近的一天。
          </p>
        )}
      </div>
    </div>
  );
}
