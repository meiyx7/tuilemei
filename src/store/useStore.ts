// 退了没 —— 全局状态（zustand + 小程序本地存储持久化）

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import type { ChangelogEntry, Checkin, Profile } from '@/lib/types';
import { PROVINCE_AVG_SALARY, todayStr } from '@/lib/pension';
import { quoteForDate } from '@/lib/quotes';

const SAMPLE_PROFILE: Profile = {
  birthDate: '1985-06',
  gender: 'male',
  identity: 'worker',
  province: '北京',
  workStartDate: '2007-07',
  monthlySalary: 15000,
  avgContributionIndex: 1.2,
  personalAccountBalance: 86000,
  paidYears: 18,
  socialAvgSalary: PROVINCE_AVG_SALARY['北京'],
};

/** 小程序本地存储适配器（供 zustand persist 使用） */
const taroStorage = {
  getItem: (name: string): string | null => {
    const val = Taro.getStorageSync(name);
    return val || null;
  },
  setItem: (name: string, value: string): void => {
    Taro.setStorageSync(name, value);
  },
  removeItem: (name: string): void => {
    Taro.removeStorageSync(name);
  },
};

interface StoreState {
  profile: Profile;
  onboarded: boolean;
  checkins: Record<string, Checkin>;
  changelog: ChangelogEntry[];

  updateProfile: (patch: Partial<Profile>) => void;
  replaceProfile: (profile: Profile) => void;
  completeOnboarding: () => void;

  isCheckedInToday: () => boolean;
  checkinToday: () => void;
  streak: () => number;
  totalCheckins: () => number;
}

const FIELD_LABELS: Record<string, string> = {
  birthDate: '出生年月', gender: '性别', identity: '身份', province: '所在省份',
  workStartDate: '参加工作时间', monthlySalary: '当前月工资', avgContributionIndex: '平均缴费指数',
  personalAccountBalance: '个人账户余额', paidYears: '已缴费年限', socialAvgSalary: '社平工资',
};

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      profile: SAMPLE_PROFILE,
      onboarded: false,
      checkins: {},
      changelog: [],

      updateProfile: (patch) => {
        const current = get().profile;
        const entries: ChangelogEntry[] = [];
        const now = new Date().toISOString();
        for (const [key, value] of Object.entries(patch)) {
          const oldValue = (current as unknown as Record<string, unknown>)[key];
          if (oldValue !== value) {
            entries.push({ timestamp: now, field: FIELD_LABELS[key] ?? key, oldValue: String(oldValue ?? ''), newValue: String(value ?? '') });
          }
        }
        set((state) => ({
          profile: { ...state.profile, ...patch },
          changelog: entries.length > 0 ? [...entries, ...state.changelog].slice(0, 100) : state.changelog,
        }));
      },

      replaceProfile: (profile) => set({ profile }),
      completeOnboarding: () => set({ onboarded: true }),

      isCheckedInToday: () => Boolean(get().checkins[todayStr()]),

      checkinToday: () => {
        const date = todayStr();
        if (get().checkins[date]) return;
        set((state) => ({
          checkins: { ...state.checkins, [date]: { date, quote: quoteForDate(date) } },
        }));
      },

      streak: () => {
        const checkins = get().checkins;
        let count = 0;
        let cursor = todayStr();
        if (!checkins[cursor]) cursor = addDays(cursor, -1);
        while (checkins[cursor]) { count += 1; cursor = addDays(cursor, -1); }
        return count;
      },

      totalCheckins: () => Object.keys(get().checkins).length,
    }),
    {
      name: 'tuilemei-store',
      version: 1,
      storage: createJSONStorage(() => taroStorage),
    },
  ),
);
