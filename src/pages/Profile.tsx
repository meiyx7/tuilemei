import { useState } from "react";
import { Check, LocateFixed, RotateCcw } from "lucide-react";
import { useStore } from "@/store/useStore";
import { PROVINCE_AVG_SALARY, PROVINCE_LIST, detectProvince } from "@/lib/pension";
import type { Gender, Identity, Profile as ProfileType } from "@/lib/types";
import SectionHeader from "@/components/SectionHeader";
import Field, { SelectInput, TextInput } from "@/components/Field";
import Button from "@/components/Button";

export default function ProfilePage() {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const replaceProfile = useStore((s) => s.replaceProfile);
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [draft, setDraft] = useState<ProfileType>(profile);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateHint, setLocateHint] = useState<string | null>(null);

  const set = <K extends keyof ProfileType>(key: K, value: ProfileType[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  /** 失焦时提交单个字段到 store（写入变更记录） */
  const commitField = <K extends keyof ProfileType>(key: K, value: ProfileType[K]) => {
    if (profile[key] !== value) {
      updateProfile({ [key]: value } as Partial<ProfileType>);
    }
  };

  /** 自动定位省份并填充社平工资 */
  const handleLocate = async () => {
    setLocating(true);
    setLocateHint(null);
    try {
      const province = await detectProvince();
      if (province) {
        set("province", province);
        const avg = PROVINCE_AVG_SALARY[province];
        if (avg) {
          set("socialAvgSalary", avg);
          commitField("province", province);
          commitField("socialAvgSalary", avg);
        } else {
          commitField("province", province);
        }
        setLocateHint(`已定位到 ${province}`);
      } else {
        setLocateHint("无法识别所在省份，请手动选择");
      }
    } catch (e) {
      const msg = e instanceof GeolocationPositionError
        ? e.code === 1 ? "定位授权被拒绝，请手动选择"
          : e.code === 3 ? "定位超时，请手动选择"
          : "定位失败，请手动选择"
        : "定位失败，请手动选择";
      setLocateHint(msg);
    } finally {
      setLocating(false);
    }
  };

  const handleSave = () => {
    updateProfile(draft);
    setSaved(true);
    completeOnboarding();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDraft(profile);
    setSaved(false);
  };

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="个人档案 · Dossier"
        title="绑定你的退休参数"
        desc="所有信息仅保存在本机浏览器，不会上传。修改后测算结果实时更新。"
      />

      {/* 基础信息 */}
      <FormCard step="01" title="基础信息" desc="决定法定退休年龄与退休日期">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="出生年月" hint="格式 YYYY-MM，如 1985-06">
            <TextInput
              type="month"
              value={draft.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
              onBlur={(e) => commitField("birthDate", e.target.value)}
            />
          </Field>
          <Field label="性别">
            <SelectInput
              value={draft.gender}
              onChange={(e) => {
                const v = e.target.value as Gender;
                set("gender", v);
                commitField("gender", v);
              }}
            >
              <option value="male">男</option>
              <option value="female">女</option>
            </SelectInput>
          </Field>
          <Field label="身份" hint="影响女职工退休年龄">
            <SelectInput
              value={draft.identity}
              onChange={(e) => {
                const v = e.target.value as Identity;
                set("identity", v);
                commitField("identity", v);
              }}
            >
              <option value="worker">工人</option>
              <option value="cadre">干部</option>
            </SelectInput>
          </Field>
          <Field label="所在省份" hint={locateHint ?? "用于默认社平工资，可点击右侧定位自动获取"}>
            <div className="flex gap-2">
              <SelectInput
                value={draft.province}
                onChange={(e) => {
                  const v = e.target.value;
                  set("province", v);
                  const avg = PROVINCE_AVG_SALARY[v];
                  if (avg) {
                    set("socialAvgSalary", avg);
                    commitField("province", v);
                    commitField("socialAvgSalary", avg);
                  } else {
                    commitField("province", v);
                  }
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
          <Field label="参加工作时间" hint="格式 YYYY-MM">
            <TextInput
              type="month"
              value={draft.workStartDate}
              onChange={(e) => set("workStartDate", e.target.value)}
              onBlur={(e) => commitField("workStartDate", e.target.value)}
            />
          </Field>
        </div>
      </FormCard>

      {/* 缴费信息 */}
      <FormCard step="02" title="缴费信息" desc="决定养老金计发金额">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="当前月工资（元）">
            <TextInput
              type="number"
              min={0}
              value={draft.monthlySalary}
              onChange={(e) => set("monthlySalary", Number(e.target.value))}
              onBlur={(e) => commitField("monthlySalary", Number(e.target.value))}
            />
          </Field>
          <Field label="平均缴费指数" hint="0.6 ~ 3.0，多数人为 0.6~1.5">
            <TextInput
              type="number"
              step={0.1}
              min={0.6}
              max={3}
              value={draft.avgContributionIndex}
              onChange={(e) => set("avgContributionIndex", Number(e.target.value))}
              onBlur={(e) => commitField("avgContributionIndex", Number(e.target.value))}
            />
          </Field>
          <Field label="个人账户累计余额（元）" hint="社保个人账户当前余额">
            <TextInput
              type="number"
              min={0}
              value={draft.personalAccountBalance}
              onChange={(e) => set("personalAccountBalance", Number(e.target.value))}
              onBlur={(e) => commitField("personalAccountBalance", Number(e.target.value))}
            />
          </Field>
          <Field label="已缴费年限（年）">
            <TextInput
              type="number"
              min={0}
              step={0.5}
              value={draft.paidYears}
              onChange={(e) => set("paidYears", Number(e.target.value))}
              onBlur={(e) => commitField("paidYears", Number(e.target.value))}
            />
          </Field>
        </div>
      </FormCard>

      {/* 政策参数 */}
      <FormCard step="03" title="政策参数" desc="可手动调整，默认按省份填充">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="退休地上年度社平工资（元/月）" hint="影响基础养老金与过渡性养老金">
            <TextInput
              type="number"
              min={0}
              value={draft.socialAvgSalary}
              onChange={(e) => set("socialAvgSalary", Number(e.target.value))}
              onBlur={(e) => commitField("socialAvgSalary", Number(e.target.value))}
            />
          </Field>
        </div>
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
        <span className="text-xs text-slate-soft">
          字段失焦时即自动写入并记录变更
        </span>
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
    <section className="card-paper p-6 md:p-8">
      <div className="mb-6 flex items-start gap-4">
        <span className="num mt-1 text-sm font-semibold text-amber">{step}</span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
          <p className="text-sm text-slate">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
