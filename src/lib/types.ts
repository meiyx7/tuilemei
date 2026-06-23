// 退了没 —— 数据类型定义

export type Gender = "male" | "female";

/** 身份：工人 / 干部（影响女职工法定退休年龄） */
export type Identity = "worker" | "cadre";

/** 个人档案 */
export interface Profile {
  /** 出生年月 "YYYY-MM" */
  birthDate: string;
  gender: Gender;
  identity: Identity;
  /** 所在省份，用于选取社平工资默认值 */
  province: string;
  /** 参加工作时间 "YYYY-MM" */
  workStartDate: string;
  /** 当前月工资（元） */
  monthlySalary: number;
  /** 平均缴费指数 0.6 ~ 3.0 */
  avgContributionIndex: number;
  /** 个人账户累计余额（元） */
  personalAccountBalance: number;
  /** 已缴费年限（年） */
  paidYears: number;
  /** 退休地上年度社平工资（元/月），可调 */
  socialAvgSalary: number;
}

/** 打卡记录 */
export interface Checkin {
  /** "YYYY-MM-DD" */
  date: string;
  /** 今日寄语 */
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
  /** 法定退休年龄（总月数） */
  ageMonths: number;
  years: number;
  months: number;
  /** 法定退休日期 "YYYY-MM" */
  retirementDate: string;
  /** 原始（未延迟）退休年龄 */
  baseAgeYears: number;
  /** 因延迟政策增加的月数 */
  delayedMonths: number;
  /** 是否适用延迟政策 */
  delayed: boolean;
}

/** 养老金测算结果 */
export interface PensionResult {
  /** 基础养老金（元/月） */
  basicPension: number;
  /** 个人账户养老金（元/月） */
  personalAccountPension: number;
  /** 过渡性养老金（元/月） */
  transitionalPension: number;
  /** 合计月养老金（元） */
  totalMonthly: number;
  /** 退休时个人账户预计累计余额（元） */
  personalAccountAtRetirement: number;
  /** 计发月数 */
  payoutMonths: number;
  /** 退休时累计缴费年限 */
  totalContributionYears: number;
  /** 视同缴费年限 */
  deemedYears: number;
  /** 养老金替代率（占当前工资比例） */
  replacementRate: number;
  /** 距退休剩余时间 */
  remaining: {
    years: number;
    months: number;
    totalDays: number;
  };
}
