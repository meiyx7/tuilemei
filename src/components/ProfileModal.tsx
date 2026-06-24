import { useEffect, useState } from "react";
import { Check, LocateFixed, RotateCcw, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PROVINCE_AVG_SALARY, PROVINCE_LIST, detectProvince } from "@/lib/pension";
import type { Gender, Identity, Profile as ProfileType } from "@/lib/types";
import Field, { SelectInput, TextInput } from "@/components/Field";
import Button from "@/components/Button";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

/** 个人档案设置弹框：保存后关闭，页面数据因 zustand 响应式自动刷新 */
export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [draft, setDraft] = useState<ProfileType>(profile);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateHint, setLocateHint] = useState<string | null>(null);

  // 每次打开弹框时，用最新 profile 重置 draft
  useEffect(() => {
    if (open) {
      setDraft(profile);
      setSaved(false);
      setLocateHint(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = <K extends keyof ProfileType>(key: K, value: ProfileType[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
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

  const handleSave = () => {
    updateProfile(draft);
    completeOnboarding();
    setSaved(true);
    // 短暂展示"已保存"后关闭弹框，页面数据因 zustand 响应式自动刷新
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setDraft(profile);
    setSaved(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-paper relative my-8 w-full max-w-3xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-[3px] text-slate transition-colors hover:bg-card-edge/40 hover:text-ink"
        >
          <X size={16} />
        </button>

        <div className="mb-6 flex flex-col gap-1">
          <span className="label-eyebrow">个人档案 · Dossier</span>
          <h2 className="font-display text-2xl font-semibold text-ink">绑定你的退休参数</h2>
          <p className="text-sm text-slate">
            所有信息仅保存在本机浏览器，不会上传。保存后测算结果实时更新。
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {/* 基础信息 */}
          <FormCard step="01" title="基础信息" desc="决定法定退休年龄与退休日期">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="出生年月" hint="格式 YYYY-MM，如 1985-06">
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
              <Field label="参加工作时间" hint="格式 YYYY-MM">
                <TextInput
                  type="month"
                  value={draft.workStartDate}
                  onChange={(e) => set("workStartDate", e.target.value)}
                />
              </Field>
              <Field label="所在省份" hint={locateHint ?? "可点击右侧定位自动获取"}>
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
          </FormCard>

          {/* 缴费信息 */}
          <FormCard step="02" title="缴费信息" desc="决定养老金计发金额">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="当前月工资（元）">
                <TextInput
                  type="number"
                  min={0}
                  value={draft.monthlySalary}
                  onChange={(e) => set("monthlySalary", Number(e.target.value))}
                />
              </Field>
              <Field label="平均缴费指数" hint="0.6 ~ 3.0">
                <TextInput
                  type="number"
                  step={0.1}
                  min={0.6}
                  max={3}
                  value={draft.avgContributionIndex}
                  onChange={(e) => set("avgContributionIndex", Number(e.target.value))}
                />
              </Field>
              <Field label="个人账户累计余额（元）">
                <TextInput
                  type="number"
                  min={0}
                  value={draft.personalAccountBalance}
                  onChange={(e) => set("personalAccountBalance", Number(e.target.value))}
                />
              </Field>
              <Field label="已缴费年限（年）">
                <TextInput
                  type="number"
                  min={0}
                  step={0.5}
                  value={draft.paidYears}
                  onChange={(e) => set("paidYears", Number(e.target.value))}
                />
              </Field>
            </div>
          </FormCard>

          {/* 政策参数 */}
          <FormCard step="03" title="政策参数" desc="可手动调整，默认按省份填充">
            <Field label="退休地上年度社平工资（元/月）" hint="影响基础养老金与过渡性养老金">
              <TextInput
                type="number"
                min={0}
                value={draft.socialAvgSalary}
                onChange={(e) => set("socialAvgSalary", Number(e.target.value))}
              />
            </Field>
          </FormCard>

          {/* 操作 */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="stamp" onClick={handleSave}>
              <Check size={15} />
              {saved ? "已保存" : "保存档案"}
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw size={15} />
              撤销修改
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormCard({
  step,
  title,
  desc,
  children,
}: {
  step: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[3px] border border-card-edge/60 p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="num mt-1 text-sm font-semibold text-amber">{step}</span>
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <p className="text-xs text-slate">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
