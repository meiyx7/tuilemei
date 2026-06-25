import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LocateFixed, SkipForward } from "lucide-react";
import { useStore } from "@/store/useStore";
import {
  PROVINCE_AVG_SALARY,
  PROVINCE_LIST,
  clamp,
  detectProvince,
  isValidBirthDate,
  isValidWorkStart,
  isNonNegativeFinite,
} from "@/lib/pension";
import type { Gender, Identity, Profile as ProfileType } from "@/lib/types";
import Field, { SelectInput, TextInput } from "@/components/Field";
import Button from "@/components/Button";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  open: boolean;
  /** 跳过或完成时回调，用于关闭弹层 */
  onClose: () => void;
}

const TOTAL_STEPS = 3;

/**
 * 首次使用引导：3 步收集关键档案字段。
 * - Step 1：欢迎 + 隐私说明（纯展示）
 * - Step 2：基础信息（出生年月/性别/身份/参加工作时间/省份）→ 决定退休年龄
 * - Step 3：缴费信息（月工资/缴费指数/个人账户余额/已缴费年限）→ 决定养老金
 * 跳过则保留示例数据，完成则写入用户填写值，二者都标记 onboarded=true。
 */
export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProfileType>(profile);
  const [locating, setLocating] = useState(false);
  const [locateHint, setLocateHint] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** 校验当前步骤涉及的字段，返回错误映射 */
  function validateStep(currentStep: number, d: ProfileType): Record<string, string> {
    const e: Record<string, string> = {};
    if (currentStep >= 2) {
      if (!isValidBirthDate(d.birthDate)) e.birthDate = "请填写合法的出生年月";
      if (!isValidWorkStart(d.workStartDate)) e.workStartDate = "工作时间不能晚于当前月";
    }
    if (currentStep >= 3) {
      if (!isNonNegativeFinite(d.monthlySalary)) e.monthlySalary = "月工资不能为负";
      if (!isNonNegativeFinite(d.personalAccountBalance)) e.personalAccountBalance = "账户余额不能为负";
      if (!isNonNegativeFinite(d.paidYears) || d.paidYears > 60) e.paidYears = "年限应在 0~60 之间";
      if (d.avgContributionIndex < 0.6 || d.avgContributionIndex > 3.0) e.avgContributionIndex = "指数应在 0.6~3.0";
    }
    return e;
  }

  /** 规范化所有数值字段 */
  function normalize(d: ProfileType): ProfileType {
    return {
      ...d,
      monthlySalary: Math.max(0, d.monthlySalary || 0),
      personalAccountBalance: Math.max(0, d.personalAccountBalance || 0),
      paidYears: clamp(d.paidYears || 0, 0, 60),
      avgContributionIndex: clamp(d.avgContributionIndex || 0.6, 0.6, 3.0),
      socialAvgSalary: Math.max(0, d.socialAvgSalary || 0),
    };
  }

  // 打开时重置到第一步，用最新 profile 初始化 draft
  useEffect(() => {
    if (open) {
      setStep(1);
      setDraft(profile);
      setLocateHint(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC 关闭视为跳过
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ProfileType>(key: K, value: ProfileType[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // 清掉对应字段的错误
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleLocate = async () => {
    setLocating(true);
    setLocateHint(null);
    try {
      const province = await detectProvince();
      if (province) {
        set("province", province);
        const avg = PROVINCE_AVG_SALARY[province];
        if (avg) set("socialAvgSalary", avg);
        setLocateHint(`已定位到 ${province}`);
      } else {
        setLocateHint("无法识别所在省份，请手动选择");
      }
    } catch {
      setLocateHint("定位失败，请手动选择");
    } finally {
      setLocating(false);
    }
  };

  /** 跳过：保留示例数据，仅标记已完成引导 */
  const handleSkip = () => {
    completeOnboarding();
    onClose();
  };

  /** 下一步：先校验当前步，通过后才前进 */
  const handleNext = () => {
    const e = validateStep(step, draft);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  /** 完成：规范化 + 最终校验后写入 */
  const handleFinish = () => {
    const normalized = normalize(draft);
    const e = validateStep(3, normalized);
    if (Object.keys(e).length > 0) {
      setDraft(normalized);
      setErrors(e);
      return;
    }
    updateProfile(normalized);
    completeOnboarding();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm">
      <div className="card-paper relative my-8 w-full max-w-2xl p-6 md:p-8">
        {/* 步骤指示器 */}
        <div className="mb-6 flex items-center gap-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
            <div key={n} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1 rounded-full transition-colors",
                  n <= step ? "bg-stamp" : "bg-card-edge",
                )}
              />
              <span
                className={cn(
                  "num text-[0.65rem] transition-colors",
                  n === step ? "text-ink" : n < step ? "text-slate" : "text-slate-soft/60",
                )}
              >
                {n === 1 ? "欢迎" : n === 2 ? "基础信息" : "缴费信息"}
              </span>
            </div>
          ))}
        </div>

        {/* 步骤内容 */}
        {step === 1 && (
          <WelcomeStep />
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <StepHeader
              step="02"
              title="先填基础信息"
              desc="这几项决定你的法定退休年龄与退休日期"
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="出生年月" hint="格式 YYYY-MM，如 1985-06" error={errors.birthDate}>
                <TextInput
                  type="month"
                  value={draft.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                />
              </Field>
              <Field label="性别">
                <SelectInput
                  value={draft.gender}
                  onChange={(e) => set("gender", e.target.value as Gender)}
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                </SelectInput>
              </Field>
              <Field label="身份" hint="影响女职工退休年龄">
                <SelectInput
                  value={draft.identity}
                  onChange={(e) => set("identity", e.target.value as Identity)}
                >
                  <option value="worker">工人</option>
                  <option value="cadre">干部</option>
                </SelectInput>
              </Field>
              <Field label="参加工作时间" hint="格式 YYYY-MM" error={errors.workStartDate}>
                <TextInput
                  type="month"
                  value={draft.workStartDate}
                  onChange={(e) => set("workStartDate", e.target.value)}
                />
              </Field>
              <Field label="所在省份" hint={locateHint ?? "可点击右侧定位自动获取"} className="sm:col-span-2">
                <div className="flex gap-2">
                  <SelectInput
                    value={draft.province}
                    onChange={(e) => {
                      const v = e.target.value;
                      set("province", v);
                      const avg = PROVINCE_AVG_SALARY[v];
                      if (avg) set("socialAvgSalary", avg);
                    }}
                    className="flex-1"
                  >
                    {PROVINCE_LIST.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </SelectInput>
                  <button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating}
                    aria-label="自动定位省份"
                    className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[3px] border border-card-edge text-slate transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
                  >
                    <LocateFixed size={15} className={locating ? "animate-spin" : ""} />
                  </button>
                </div>
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <StepHeader
              step="03"
              title="再填缴费信息"
              desc="这几项决定退休后每月能领多少养老金"
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="当前月工资（元）" error={errors.monthlySalary}>
                <TextInput
                  type="number"
                  min={0}
                  value={draft.monthlySalary}
                  onChange={(e) => set("monthlySalary", Number(e.target.value))}
                />
              </Field>
              <Field label="平均缴费指数" hint="0.6 ~ 3.0" error={errors.avgContributionIndex}>
                <TextInput
                  type="number"
                  step={0.1}
                  min={0.6}
                  max={3}
                  value={draft.avgContributionIndex}
                  onChange={(e) => set("avgContributionIndex", Number(e.target.value))}
                />
              </Field>
              <Field label="个人账户累计余额（元）" error={errors.personalAccountBalance}>
                <TextInput
                  type="number"
                  min={0}
                  value={draft.personalAccountBalance}
                  onChange={(e) => set("personalAccountBalance", Number(e.target.value))}
                />
              </Field>
              <Field label="已缴费年限（年）" error={errors.paidYears}>
                <TextInput
                  type="number"
                  min={0}
                  step={0.5}
                  value={draft.paidYears}
                  onChange={(e) => set("paidYears", Number(e.target.value))}
                />
              </Field>
            </div>
            <p className="text-xs text-slate-soft">
              不确定也没关系，可以先用估算值，之后随时在右上角设置里修改。
            </p>
          </div>
        )}

        {/* 底部操作区 */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleSkip}
            className="inline-flex items-center gap-1 text-xs text-slate transition-colors hover:text-ink"
          >
            <SkipForward size={12} />
            跳过，先用示例数据
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft size={14} />
                上一步
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button variant="stamp" onClick={handleNext}>
                下一步
                <ArrowRight size={14} />
              </Button>
            ) : (
              <Button variant="stamp" onClick={handleFinish}>
                <Check size={14} />
                完成，开始追踪
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 第一步：欢迎页 + 隐私说明 */
function WelcomeStep() {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader step="01" title="欢迎来到「退了没」" desc="一个陪你慢慢熬到退休的小本本" />
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-slate">
        <p>
          接下来用 3 步填几项关键信息，App 会据此算出你的
          <span className="text-ink font-medium">法定退休年龄</span>、
          <span className="text-ink font-medium">退休日期</span> 和
          <span className="text-ink font-medium">预计养老金</span>，并生成专属倒计时。
        </p>
        <ul className="flex flex-col gap-2 border-l-2 border-stamp/40 pl-4">
          <li>测算依据 2025 年渐进式延迟退休政策与城镇职工养老保险计发办法的简化模型</li>
          <li>所有档案数据仅保存在本机浏览器，不会上传任何服务器</li>
          <li>"自动定位"功能会调用浏览器定位 + OpenStreetMap 逆向地理编码识别省份，请求会发送至 OpenStreetMap 服务器；如不愿被定位，可手动选择省份</li>
          <li>之后随时可在右上角设置里修改，结果实时更新</li>
        </ul>
      </div>
    </div>
  );
}

function StepHeader({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-eyebrow">Step {step} / 0{TOTAL_STEPS}</span>
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      <p className="text-sm text-slate">{desc}</p>
    </div>
  );
}
