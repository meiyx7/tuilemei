// 退了没 —— 数据类型定义（与 Web 版一致）

export type Gender = 'male' | 'female';

/** 身份：工人 / 干部（影响女职工法定退休年龄） */
export type Identity = 'worker' | 'cadre';

/** 个人档案 */
export interface Profile {
  birthDate: string;
  gender: Gender;
  identity: Identity;
  province: string;
  workStartDate: string;
  monthlySalary: number;
  avgContributionIndex: number;
  personalAccountBalance: number;
  paidYears: number;
  socialAvgSalary: number;
}

/** 打卡记录 */
export interface Checkin {
  date: string;
  quote: string;
}

/** 档案变更记录 */
export interface ChangelogEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
}

/** 退休年龄测算结果 */
export interface RetirementAgeResult {
  ageMonths: number;
  years: number;
  months: number;
  retirementDate: string;
  baseAgeYears: number;
  delayedMonths: number;
  delayed: boolean;
}

/** 养老金测算结果 */
export interface PensionResult {
  basicPension: number;
  personalAccountPension: number;
  transitionalPension: number;
  totalMonthly: number;
  personalAccountAtRetirement: number;
  payoutMonths: number;
  totalContributionYears: number;
  deemedYears: number;
  replacementRate: number;
  remaining: {
    years: number;
    months: number;
    totalDays: number;
  };
}
