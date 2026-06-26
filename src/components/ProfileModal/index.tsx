import { useEffect, useState } from 'react';
import { View, Text, Input, Picker, ScrollView } from '@tarojs/components';
import { useStore } from '@/store/useStore';
import { PROVINCE_AVG_SALARY, PROVINCE_LIST, detectProvince } from '@/lib/pension';
import type { Gender, Identity, Profile as ProfileType } from '@/lib/types';
import './index.scss';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const GENDER_LABELS = ['男', '女'];
const GENDER_VALUES: Gender[] = ['male', 'female'];
const IDENTITY_LABELS = ['工人', '干部'];
const IDENTITY_VALUES: Identity[] = ['worker', 'cadre'];

/** 个人档案设置弹框：全屏覆盖层模拟 Modal，保存后关闭 */
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

  const handleSave = () => {
    updateProfile(draft);
    completeOnboarding();
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setDraft(profile);
    setSaved(false);
  };

  const stopClose = (e: any) => {
    e.stopPropagation();
  };

  if (!open) return null;

  const genderIndex = Math.max(0, GENDER_VALUES.indexOf(draft.gender));
  const identityIndex = Math.max(0, IDENTITY_VALUES.indexOf(draft.identity));
  const provinceIndex = Math.max(0, PROVINCE_LIST.indexOf(draft.province));

  return (
    <View catchMove className="modal-overlay" onClick={onClose}>
      <View className="modal-card" onClick={stopClose}>
        {/* 关闭按钮 */}
        <View className="modal-close" onClick={onClose}>
          <Text>×</Text>
        </View>

        <View className="modal-header">
          <Text className="eyebrow">个人档案 · Dossier</Text>
          <Text className="modal-title">绑定你的退休参数</Text>
          <Text className="modal-desc">所有信息仅保存在本机，不会上传。保存后测算结果实时更新。</Text>
        </View>

        <ScrollView scrollY className="modal-body" style={{ height: 'calc(88vh - 340rpx)' }}>
          {/* 基础信息 */}
          <FormCard step="01" title="基础信息" desc="决定法定退休年龄与退休日期">
            <View className="form-grid">
              <Field label="出生年月" hint="格式 YYYY-MM，如 1985-06">
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

              <Field label="所在省份" hint={locateHint ?? '可点击右侧定位自动获取'}>
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
                  <View className={`locate-btn${locating ? ' locating' : ''}`} onClick={handleLocate}>
                    <Text>{locating ? '◌' : '◎'}</Text>
                  </View>
                </View>
              </Field>
            </View>
          </FormCard>

          {/* 缴费信息 */}
          <FormCard step="02" title="缴费信息" desc="决定养老金计发金额">
            <View className="form-grid">
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
          </FormCard>

          {/* 政策参数 */}
          <FormCard step="03" title="政策参数" desc="可手动调整，默认按省份填充">
            <Field label="退休地上年度社平工资（元/月）" hint="影响基础养老金与过渡性养老金">
              <Input className="num-input" type="digit" value={String(draft.socialAvgSalary)} onInput={(e) => set('socialAvgSalary', Number(e.detail.value) || 0)} placeholder="0" />
            </Field>
          </FormCard>
        </ScrollView>

        {/* 操作 */}
        <View className="modal-actions">
          <View className="btn btn-stamp" onClick={handleSave}>
            <Text>{saved ? '✓ 已保存' : '✓ 保存档案'}</Text>
          </View>
          <View className="btn btn-ghost" onClick={handleReset}>
            <Text>↺ 撤销修改</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="field">
      <Text className="field-label">{label}</Text>
      {children}
      {hint && <Text className="field-hint">{hint}</Text>}
    </View>
  );
}

function FormCard({ step, title, desc, children }: { step: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <View className="form-card">
      <View className="form-card-head">
        <Text className="num form-card-step">{step}</Text>
        <View className="form-card-title-wrap">
          <Text className="form-card-title">{title}</Text>
          <Text className="form-card-desc">{desc}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}
