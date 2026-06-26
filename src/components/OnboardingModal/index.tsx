import { useEffect, useState } from 'react';
import { View, Text, Input, Picker, ScrollView } from '@tarojs/components';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { PROVINCE_AVG_SALARY, PROVINCE_LIST, detectProvince } from '@/lib/pension';
import type { Gender, Identity, Profile as ProfileType } from '@/lib/types';
import './index.scss';

interface OnboardingModalProps {
  open: boolean;
  /** 跳过或完成时回调，用于关闭弹层 */
  onClose: () => void;
}

const TOTAL_STEPS = 3;
const GENDER_LABELS = ['男', '女'];
const GENDER_VALUES: Gender[] = ['male', 'female'];
const IDENTITY_LABELS = ['工人', '干部'];
const IDENTITY_VALUES: Identity[] = ['worker', 'cadre'];
const STEP_TITLES = ['欢迎', '基础信息', '缴费信息'];

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
  // 记录是否已尝试过自动定位，避免重复触发
  const [autoLocated, setAutoLocated] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDraft(profile);
      setLocateHint(null);
      setAutoLocated(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 进入「基础信息」步骤时自动尝试定位一次（仅一次）
  useEffect(() => {
    if (open && step === 2 && !autoLocated && !locating) {
      setAutoLocated(true);
      handleLocate();
    }
  }, [open, step, autoLocated]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ProfileType>(key: K, value: ProfileType[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleLocate = async () => {
    setLocating(true);
    setLocateHint(null);
    try {
      const province = await detectProvince();
      if (province) {
        set('province', province);
        const avg = PROVINCE_AVG_SALARY[province];
        if (avg) set('socialAvgSalary', avg);
        setLocateHint(`已定位到 ${province}`);
      } else {
        setLocateHint('无法识别所在省份，请手动选择');
      }
    } catch {
      setLocateHint('定位失败，请手动选择');
    } finally {
      setLocating(false);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    onClose();
  };

  const handleFinish = () => {
    updateProfile(draft);
    completeOnboarding();
    onClose();
  };

  const stopClose = (e: any) => {
    e.stopPropagation();
  };

  if (!open) return null;

  const genderIndex = Math.max(0, GENDER_VALUES.indexOf(draft.gender));
  const identityIndex = Math.max(0, IDENTITY_VALUES.indexOf(draft.identity));
  const provinceIndex = Math.max(0, PROVINCE_LIST.indexOf(draft.province));

  return (
    <View className="ob-overlay" onClick={handleSkip}>
      <View className="ob-card" onClick={stopClose}>
        {/* 步骤指示器 */}
        <View className="ob-steps">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
            <View key={n} className="ob-step">
              <View className={cn('ob-step-bar', n <= step && 'ob-step-bar-active')} />
              <Text className={cn('ob-step-label', n === step ? 'ob-step-label-current' : n < step ? 'ob-step-label-done' : 'ob-step-label-todo')}>
                {STEP_TITLES[n - 1]}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView scrollY className="ob-body">
          {step === 1 && (
            <View className="ob-section">
              <StepHeader step="01" title="欢迎来到「退了没」" desc="一个陪你慢慢熬到退休的小本本" />
              <View className="welcome-text">
                <Text className="welcome-p">
                  接下来用 3 步填几项关键信息，小程序会据此算出你的
                  <Text className="welcome-em">法定退休年龄</Text>、
                  <Text className="welcome-em">退休日期</Text> 和
                  <Text className="welcome-em">预计养老金</Text>，并生成专属倒计时。
                </Text>
                <View className="welcome-list">
                  <Text className="welcome-li">· 测算依据 2025 年渐进式延迟退休政策与城镇职工养老保险计发办法的简化模型</Text>
                  <Text className="welcome-li">· 所有数据仅保存在本机，不会上传任何服务器</Text>
                  <Text className="welcome-li">· 之后随时可在设置里修改，结果实时更新</Text>
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View className="ob-section">
              <StepHeader step="02" title="先填基础信息" desc="这几项决定你的法定退休年龄与退休日期" />
              <View className="ob-grid">
                <Field label="出生年月" hint="格式 YYYY-MM">
                  <Picker mode="date" fields="month" value={draft.birthDate} onChange={(e) => set('birthDate', e.detail.value)}>
                    <View className="picker-display">
                      <Text className="num">{draft.birthDate || '请选择'}</Text>
                      <Text className="picker-arrow">›</Text>
                    </View>
                  </Picker>
                </Field>
                <Field label="性别">
                  <Picker mode="selector" range={GENDER_LABELS} value={genderIndex} onChange={(e) => set('gender', GENDER_VALUES[Number(e.detail.value)])}>
                    <View className="picker-display">
                      <Text>{GENDER_LABELS[genderIndex]}</Text>
                      <Text className="picker-arrow">›</Text>
                    </View>
                  </Picker>
                </Field>
                <Field label="身份" hint="影响女职工退休年龄">
                  <Picker mode="selector" range={IDENTITY_LABELS} value={identityIndex} onChange={(e) => set('identity', IDENTITY_VALUES[Number(e.detail.value)])}>
                    <View className="picker-display">
                      <Text>{IDENTITY_LABELS[identityIndex]}</Text>
                      <Text className="picker-arrow">›</Text>
                    </View>
                  </Picker>
                </Field>
                <Field label="参加工作时间" hint="格式 YYYY-MM">
                  <Picker mode="date" fields="month" value={draft.workStartDate} onChange={(e) => set('workStartDate', e.detail.value)}>
                    <View className="picker-display">
                      <Text className="num">{draft.workStartDate || '请选择'}</Text>
                      <Text className="picker-arrow">›</Text>
                    </View>
                  </Picker>
                </Field>
                <Field label="所在省份" hint={locateHint ?? '可点击右侧定位自动获取'} className="ob-col-span">
                  <View className="province-row">
                    <Picker mode="selector" range={PROVINCE_LIST} value={provinceIndex} onChange={(e) => {
                      const v = PROVINCE_LIST[Number(e.detail.value)];
                      set('province', v);
                      const avg = PROVINCE_AVG_SALARY[v];
                      if (avg) set('socialAvgSalary', avg);
                    }}>
                      <View className="picker-display picker-flex">
                        <Text>{draft.province}</Text>
                        <Text className="picker-arrow">›</Text>
                      </View>
                    </Picker>
                    <View className={cn('locate-btn', locating && 'locating')} onClick={handleLocate}>
                      <Text>{locating ? '◌' : '◎'}</Text>
                    </View>
                  </View>
                </Field>
              </View>
            </View>
          )}

          {step === 3 && (
            <View className="ob-section">
              <StepHeader step="03" title="再填缴费信息" desc="这几项决定退休后每月能领多少养老金" />
              <View className="ob-grid">
                <Field label="当前月工资（元）">
                  <Input className="num-input" type="digit" value={String(draft.monthlySalary)} onInput={(e) => set('monthlySalary', Number(e.detail.value) || 0)} placeholder="0" />
                </Field>
                <Field label="平均缴费指数" hint="0.6 ~ 3.0">
                  <Input className="num-input" type="digit" value={String(draft.avgContributionIndex)} onInput={(e) => set('avgContributionIndex', Number(e.detail.value) || 0)} placeholder="1.0" />
                </Field>
                <Field label="个人账户累计余额（元）">
                  <Input className="num-input" type="digit" value={String(draft.personalAccountBalance)} onInput={(e) => set('personalAccountBalance', Number(e.detail.value) || 0)} placeholder="0" />
                </Field>
                <Field label="已缴费年限（年）">
                  <Input className="num-input" type="digit" value={String(draft.paidYears)} onInput={(e) => set('paidYears', Number(e.detail.value) || 0)} placeholder="0" />
                </Field>
              </View>
              <Text className="ob-note">不确定也没关系，可以先用估算值，之后随时在设置里修改。</Text>
            </View>
          )}
        </ScrollView>

        {/* 底部操作区 */}
        <View className="ob-footer">
          <View className="ob-skip" onClick={handleSkip}>
            <Text>» 跳过，先用示例数据</Text>
          </View>
          <View className="ob-actions">
            {step > 1 && (
              <View className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
                <Text>‹ 上一步</Text>
              </View>
            )}
            {step < TOTAL_STEPS ? (
              <View className="btn btn-stamp" onClick={() => setStep((s) => s + 1)}>
                <Text>下一步 ›</Text>
              </View>
            ) : (
              <View className="btn btn-stamp" onClick={handleFinish}>
                <Text>✓ 完成，开始追踪</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <View className={cn('field', className)}>
      <Text className="field-label">{label}</Text>
      {children}
      {hint && <Text className="field-hint">{hint}</Text>}
    </View>
  );
}

function StepHeader({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <View className="step-header">
      <Text className="eyebrow">Step {step} / 0{TOTAL_STEPS}</Text>
      <Text className="step-title">{title}</Text>
      <Text className="step-desc">{desc}</Text>
    </View>
  );
}
