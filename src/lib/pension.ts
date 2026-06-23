// 退了没 —— 测算引擎
// 依据：2025 年《渐进式延迟法定退休年龄办法》与城镇职工基本养老保险计发办法
// 注：本引擎为简化测算模型，结果仅供参考，不构成任何官方承诺。

import type {
  Identity,
  PensionResult,
  Profile,
  RetirementAgeResult,
} from "./types";

/* ------------------------------------------------------------------ */
/* 政策常量                                                            */
/* ------------------------------------------------------------------ */

interface DelayPolicy {
  /** 原法定退休年龄（年） */
  baseAgeYears: number;
  /** 目标退休年龄（年） */
  targetAgeYears: number;
  /** 每多少个出生月份延迟 1 个月 */
  stepMonths: number;
  /** 延迟政策起始适用的出生年月（即 2025-01 减去原退休年龄）"YYYY-MM" */
  cohortStart: string;
}

/** 男职工：60 → 63，每 4 个月 +1 月 */
const MALE_POLICY: DelayPolicy = {
  baseAgeYears: 60,
  targetAgeYears: 63,
  stepMonths: 4,
  cohortStart: "1965-01",
};

/** 女工人：50 → 55，每 2 个月 +1 月 */
const FEMALE_WORKER_POLICY: DelayPolicy = {
  baseAgeYears: 50,
  targetAgeYears: 55,
  stepMonths: 2,
  cohortStart: "1975-01",
};

/** 女干部：55 → 58，每 4 个月 +1 月 */
const FEMALE_CADRE_POLICY: DelayPolicy = {
  baseAgeYears: 55,
  targetAgeYears: 58,
  stepMonths: 4,
  cohortStart: "1970-01",
};

export function getDelayPolicy(gender: Profile["gender"], identity: Identity): DelayPolicy {
  if (gender === "male") return MALE_POLICY;
  return identity === "cadre" ? FEMALE_CADRE_POLICY : FEMALE_WORKER_POLICY;
}

/** 个人账户养老金计发月数表（按退休年龄整数岁） */
export const PAYOUT_MONTHS_TABLE: Record<number, number> = {
  40: 233, 41: 230, 42: 226, 43: 223, 44: 220, 45: 216, 46: 212, 47: 208,
  48: 204, 49: 199, 50: 195, 51: 190, 52: 185, 53: 180, 54: 175, 55: 170,
  56: 164, 57: 158, 58: 152, 59: 145, 60: 139, 61: 132, 62: 125, 63: 117,
  64: 109, 65: 101, 66: 93, 67: 84, 68: 75, 69: 65, 70: 56,
};

/** 各省份上年度社平工资默认值（元/月，近似值，仅作默认填充） */
export const PROVINCE_AVG_SALARY: Record<string, number> = {
  北京: 13900, 上海: 13600, 广东: 9800, 浙江: 8800, 江苏: 8600,
  天津: 7900, 福建: 7200, 山东: 7100, 四川: 7000, 重庆: 6900,
  湖北: 6800, 湖南: 6400, 河南: 6200, 河北: 6200, 安徽: 6400,
  江西: 6000, 陕西: 6300, 辽宁: 6400, 山西: 6000, 云南: 6200,
  广西: 5900, 黑龙江: 5800, 吉林: 5700, 贵州: 5800, 内蒙古: 6200,
  新疆: 6100, 甘肃: 5700, 海南: 6700, 宁夏: 6100, 青海: 6000,
  西藏: 8000,
};

export const PROVINCE_LIST = Object.keys(PROVINCE_AVG_SALARY);

/** 个人账户记账利率假设（年化） */
const PERSONAL_ACCOUNT_RATE = 0.04;
/** 个人账户缴费比例（工资的 8%） */
const PERSONAL_ACCOUNT_RATE_MONTHLY = 0.08;
/** 视同缴费年限截止年月（个人账户制度建立，简化取 1996-01） */
const DEEMED_CUTOFF = "1996-01";
/** 过渡性养老金计发系数 */
const TRANSITIONAL_COEFFICIENT = 0.013;

/* ------------------------------------------------------------------ */
/* 日期工具                                                            */
/* ------------------------------------------------------------------ */

/** 解析 "YYYY-MM" 为 {year, month} */
export function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

/** "YYYY-MM" 转总月数 */
function ymToMonths(ym: string): number {
  const { year, month } = parseYearMonth(ym);
  return year * 12 + (month - 1);
}

/** 总月数转 "YYYY-MM" */
function monthsToYm(total: number): string {
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 今日 "YYYY-MM-DD" */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 今日 "YYYY-MM" */
export function todayYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 两个 "YYYY-MM-DD" 之间的天数（向下取整） */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/* ------------------------------------------------------------------ */
/* 退休年龄测算                                                        */
/* ------------------------------------------------------------------ */

/**
 * 依据 2025 渐进式延迟退休政策计算法定退休年龄与日期。
 * 退休日期 = 出生年月 + 法定退休年龄（精确到月）。
 */
export function calcRetirementAge(profile: Profile): RetirementAgeResult {
  const policy = getDelayPolicy(profile.gender, profile.identity);
  const birthMonths = ymToMonths(profile.birthDate);
  const cohortStartMonths = ymToMonths(policy.cohortStart);
  const maxDelayMonths = (policy.targetAgeYears - policy.baseAgeYears) * 12;

  let delayedMonths = 0;
  let delayed = false;

  if (birthMonths >= cohortStartMonths) {
    const monthsSinceStart = birthMonths - cohortStartMonths;
    const increments = Math.floor(monthsSinceStart / policy.stepMonths);
    delayedMonths = Math.min(increments, maxDelayMonths);
    delayed = delayedMonths > 0;
  }

  const ageMonths = policy.baseAgeYears * 12 + delayedMonths;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const retirementDate = monthsToYm(birthMonths + ageMonths);

  return {
    ageMonths,
    years,
    months,
    retirementDate,
    baseAgeYears: policy.baseAgeYears,
    delayedMonths,
    delayed,
  };
}

/* ------------------------------------------------------------------ */
/* 养老金测算                                                          */
/* ------------------------------------------------------------------ */

/** 按退休年龄查计发月数（四舍五入到整数岁） */
export function lookupPayoutMonths(ageYears: number, ageMonths: number): number {
  const exact = ageYears + ageMonths / 12;
  const rounded = Math.round(exact);
  const clamped = Math.max(40, Math.min(70, rounded));
  return PAYOUT_MONTHS_TABLE[clamped] ?? 139;
}

/**
 * 计算距退休的剩余时间。
 * 以退休年月的 1 日为目标，与今日比较。
 */
export function calcRemaining(retirementDate: string): {
  years: number;
  months: number;
  totalDays: number;
} {
  const target = retirementDate + "-01";
  const today = todayStr();
  const totalDays = daysBetween(today, target);

  const tYm = parseYearMonth(retirementDate);
  const now = new Date();
  let years = tYm.year - now.getFullYear();
  let months = tYm.month - (now.getMonth() + 1);
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    years = 0;
    months = 0;
  }
  return { years, months, totalDays: Math.max(0, totalDays) };
}

/**
 * 养老金计发测算（城镇职工基本养老保险）。
 *
 * - 基础养老金 = (社平工资 + 本人指数化月平均缴费工资) / 2 × 缴费年限 × 1%
 * - 个人账户养老金 = 退休时个人账户累计余额 / 计发月数
 * - 过渡性养老金 = 视同缴费年限 × 社平工资 × 平均缴费指数 × 计发系数
 *
 * 个人账户余额按 4% 年化记账利率、并继续按 8% 工资比例缴费至退休进行推算。
 */
export function calcPension(profile: Profile): PensionResult {
  const retirement = calcRetirementAge(profile);
  const remaining = calcRemaining(retirement.retirementDate);
  const remainingYears = Math.max(0, remaining.years + remaining.months / 12);

  // 累计缴费年限 = 已缴费 + 剩余继续缴费
  const totalContributionYears = profile.paidYears + remainingYears;

  // 本人指数化月平均缴费工资
  const indexedMonthlyWage = profile.socialAvgSalary * profile.avgContributionIndex;

  // 基础养老金
  const basicPension =
    ((profile.socialAvgSalary + indexedMonthlyWage) / 2) *
    totalContributionYears *
    0.01;

  // 个人账户：现有余额按记账利率复利 + 未来缴费年金终值
  const r = PERSONAL_ACCOUNT_RATE;
  const monthlyContribution = profile.monthlySalary * PERSONAL_ACCOUNT_RATE_MONTHLY;
  const annualContribution = monthlyContribution * 12;
  const futureValueExisting =
    profile.personalAccountBalance * Math.pow(1 + r, remainingYears);
  const futureValueAnnuity =
    remainingYears > 0
      ? annualContribution * ((Math.pow(1 + r, remainingYears) - 1) / r)
      : 0;
  const personalAccountAtRetirement = futureValueExisting + futureValueAnnuity;

  const payoutMonths = lookupPayoutMonths(retirement.years, retirement.months);
  const personalAccountPension = personalAccountAtRetirement / payoutMonths;

  // 视同缴费年限：参加工作早于 1996-01 的部分
  const workStartMonths = ymToMonths(profile.workStartDate);
  const cutoffMonths = ymToMonths(DEEMED_CUTOFF);
  const deemedMonths = Math.max(0, cutoffMonths - workStartMonths);
  const deemedYears = deemedMonths / 12;

  const transitionalPension =
    deemedYears * profile.socialAvgSalary * profile.avgContributionIndex * TRANSITIONAL_COEFFICIENT;

  const totalMonthly =
    basicPension + personalAccountPension + transitionalPension;

  const replacementRate =
    profile.monthlySalary > 0 ? totalMonthly / profile.monthlySalary : 0;

  return {
    basicPension,
    personalAccountPension,
    transitionalPension,
    totalMonthly,
    personalAccountAtRetirement,
    payoutMonths,
    totalContributionYears,
    deemedYears,
    replacementRate,
    remaining,
  };
}

/* ------------------------------------------------------------------ */
/* 格式化工具                                                          */
/* ------------------------------------------------------------------ */

/** 金额格式化：12345.6 -> "12,346" */
export function formatMoney(n: number): string {
  return Math.round(n).toLocaleString("zh-CN");
}

/** 金额带元：12345.6 -> "12,346 元" */
export function formatYuan(n: number): string {
  return `${formatMoney(n)} 元`;
}

/** 百分比：0.4231 -> "42.3%" */
export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/** 年限：1.5 -> "1 年 6 个月" */
export function formatYears(n: number): string {
  const years = Math.floor(n);
  const months = Math.round((n - years) * 12);
  if (years === 0) return `${months} 个月`;
  if (months === 0) return `${years} 年`;
  return `${years} 年 ${months} 个月`;
}
