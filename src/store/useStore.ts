// 退了没 —— 全局状态（zustand + 小程序本地存储持久化 + 云端同步）

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Taro from '@tarojs/taro';
import type { ChangelogEntry, Checkin, Profile } from '@/lib/types';
import { PROVINCE_AVG_SALARY, todayStr } from '@/lib/pension';
import { quoteForDate } from '@/lib/quotes';
import { loadCloudData, saveCloudData } from '@/lib/cloud';

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

  /** 本地最后修改时间戳（ms），用于云端合并时 LWW 比较 */
  lastModified: number;
  /** 正在从云端拉取数据覆盖本地，期间跳过 syncToCloud 避免循环 */
  syncing: boolean;
  /** 云端数据是否已就绪（启动时拉取过一次） */
  cloudReady: boolean;

  updateProfile: (patch: Partial<Profile>) => void;
  replaceProfile: (profile: Profile) => void;
  completeOnboarding: () => void;

  isCheckedInToday: () => boolean;
  checkinToday: () => void;
  streak: () => number;
  totalCheckins: () => number;

  /** 触发 debounced 云端推送（写入操作内部调用） */
  syncToCloud: () => void;
  /** 启动时从云端拉取并合并（云端较新则覆盖本地） */
  hydrateFromCloud: () => Promise<void>;
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

/** 云端推送 debounce 计时器（模块级单例） */
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      profile: SAMPLE_PROFILE,
      onboarded: false,
      checkins: {},
      changelog: [],
      lastModified: 0,
      syncing: false,
      cloudReady: false,

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
          lastModified: Date.now(),
        }));
        get().syncToCloud();
      },

      replaceProfile: (profile) => {
        set({ profile, lastModified: Date.now() });
        get().syncToCloud();
      },

      completeOnboarding: () => {
        set({ onboarded: true, lastModified: Date.now() });
        get().syncToCloud();
      },

      isCheckedInToday: () => Boolean(get().checkins[todayStr()]),

      checkinToday: () => {
        const date = todayStr();
        if (get().checkins[date]) return;
        set((state) => ({
          checkins: { ...state.checkins, [date]: { date, quote: quoteForDate(date) } },
          lastModified: Date.now(),
        }));
        get().syncToCloud();
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

      syncToCloud: () => {
        // 正在从云端拉取时跳过推送，避免覆盖循环
        if (get().syncing) return;
        if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
        cloudSyncTimer = setTimeout(() => {
          const s = get();
          if (s.syncing) return;
          saveCloudData({
            profile: s.profile,
            checkins: s.checkins,
            changelog: s.changelog,
            onboarded: s.onboarded,
          });
        }, 1000);
      },

      hydrateFromCloud: async () => {
        const cloud = await loadCloudData();
        if (!cloud) {
          // 云未就绪或云端无数据：标记完成，保留本地状态
          set({ cloudReady: true });
          return;
        }
        const local = get();
        const cloudTime = cloud.updatedAt || 0;
        // LWW：云端较新才覆盖（清缓存恢复场景：本地 lastModified=0，云端 cloudTime>0）
        if (cloudTime > local.lastModified) {
          set({
            syncing: true,
            profile: cloud.profile ?? local.profile,
            checkins: cloud.checkins ?? local.checkins,
            changelog: cloud.changelog ?? local.changelog,
            onboarded: cloud.onboarded ?? local.onboarded,
            lastModified: cloudTime,
            cloudReady: true,
          });
          // 解除 syncing 标记（延后到下一个微任务，确保 React 完成渲染）
          setTimeout(() => set({ syncing: false }), 0);
        } else {
          set({ cloudReady: true });
        }
      },
    }),
    {
      name: 'tuilemei-store',
      version: 2,
      storage: createJSONStorage(() => taroStorage),
      // 仅持久化数据字段，运行时标记（syncing/cloudReady）不入库
      partialize: (s) => ({
        profile: s.profile,
        onboarded: s.onboarded,
        checkins: s.checkins,
        changelog: s.changelog,
        lastModified: s.lastModified,
      }),
    },
  ),
);
