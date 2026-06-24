import { useState } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { todayStr } from "@/lib/pension";
import Stamp from "./Stamp";

/**
 * 每日打卡悬浮按钮（FAB）：固定在页面右下角的圆形印章按钮 + 文字标签。
 * 加大尺寸并附带文字说明，既醒目又不与圆环主视觉重复（层级与形态均不同）。
 * 打卡后盖"已打卡"邮戳，并显示连续天数。
 */
export default function CheckinButton() {
  const checked = useStore((s) => s.isCheckedInToday());
  const checkinToday = useStore((s) => s.checkinToday);
  const streak = useStore((s) => s.streak());
  const [justChecked, setJustChecked] = useState(false);

  const handleCheckin = () => {
    if (checked) return;
    checkinToday();
    setJustChecked(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 md:bottom-8 md:right-8">
      {/* 悬浮打卡按钮（加大尺寸） */}
      <div className="relative grid place-items-center">
        <button
          onClick={handleCheckin}
          disabled={checked}
          className={cn(
            "group grid h-20 w-20 place-items-center rounded-full border-2 shadow-stamp transition-all duration-200",
            "active:translate-y-px md:h-24 md:w-24",
            checked
              ? "cursor-default border-stamp/40 bg-transparent text-stamp/60"
              : "border-stamp bg-stamp text-paper hover:bg-stamp-deep hover:border-stamp-deep",
          )}
          aria-label={checked ? "今日已打卡" : "今日打卡"}
        >
          {checked ? (
            <span className="font-display text-xs font-medium leading-tight">
              已<br />完<br />成
            </span>
          ) : (
            <span className="flex flex-col items-center leading-none">
              <span className="font-display text-lg font-bold md:text-xl">打卡</span>
              <span className="num mt-1 text-[0.55rem] opacity-80">CHECK-IN</span>
            </span>
          )}
        </button>

        {/* 刚打卡：盖大邮戳动画 */}
        {checked && justChecked && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <Stamp label="已打卡" sub={todayStr().slice(5)} size="lg" animate />
          </div>
        )}
      </div>

      {/* 文字标签：未打卡提示动作，已打卡显示连续天数 */}
      <span
        className={cn(
          "num rounded-full border px-3 py-1 text-[0.65rem] font-medium backdrop-blur-sm",
          checked
            ? "border-stamp/30 bg-paper/80 text-stamp/80"
            : "border-stamp/40 bg-paper/90 text-stamp shadow-sm",
        )}
      >
        {checked ? `连续 ${streak} 天` : "今日打卡"}
      </span>
    </div>
  );
}
