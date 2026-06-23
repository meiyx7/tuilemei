import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/store/useStore";

/** 首次使用引导横幅 */
export default function OnboardingBanner() {
  const onboarded = useStore((s) => s.onboarded);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [dismissed, setDismissed] = useState(false);

  if (onboarded || dismissed) return null;

  return (
    <div className="card-paper relative mb-8 flex flex-col gap-3 border-amber/40 p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <span className="label-eyebrow text-amber">首次使用 · Welcome</span>
        <p className="font-display text-lg font-semibold text-ink">
          已为你预填一份示例档案
        </p>
        <p className="max-w-2xl text-sm text-slate">
          前往「个人档案」填入你的真实出生年月、工资、缴费年限等信息，倒计时与养老金将实时重算。
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/profile"
          onClick={completeOnboarding}
          className="rounded-[3px] border border-ink bg-ink px-4 py-2.5 font-body text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
        >
          去填写档案
        </Link>
        <button
          onClick={() => {
            setDismissed(true);
            completeOnboarding();
          }}
          className="grid h-10 w-10 place-items-center rounded-[3px] border border-card-edge text-slate transition-colors hover:text-ink"
          aria-label="关闭"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
