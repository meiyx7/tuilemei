import { describe, expect, it } from "vitest";
import {
  calcPension,
  calcRetirementAge,
  clamp,
  formatMoney,
  formatPercent,
  formatYears,
  getDelayPolicy,
  isNonNegativeFinite,
  isValidBirthDate,
  isValidWorkStart,
  isValidYearMonth,
  lookupPayoutMonths,
  parseYearMonth,
  PROVINCE_AVG_SALARY,
  PROVINCE_LIST,
} from "../src/lib/pension";
import type { Profile } from "../src/lib/types";

// 标准测试档案：1985-06 男工人，2007-07 参加工作
const baseProfile: Profile = {
  birthDate: "1985-06",
  gender: "male",
  identity: "worker",
  province: "北京",
  workStartDate: "2007-07",
  monthlySalary: 15000,
  avgContributionIndex: 1.2,
  personalAccountBalance: 86000,
  paidYears: 18,
  socialAvgSalary: PROVINCE_AVG_SALARY["北京"],
};

describe("parseYearMonth", () => {
  it("解析 YYYY-MM 格式", () => {
    expect(parseYearMonth("1985-06")).toEqual({ year: 1985, month: 6 });
    expect(parseYearMonth("2025-12")).toEqual({ year: 2025, month: 12 });
  });

  it("单数字月份也能解析（不严格）", () => {
    expect(parseYearMonth("2025-3")).toEqual({ year: 2025, month: 3 });
  });
});

describe("clamp", () => {
  it("限制数值在区间内", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("NaN 时返回 min", () => {
    expect(clamp(Number.NaN, 0, 10)).toBe(0);
  });
});

describe("isNonNegativeFinite", () => {
  it("合法非负数返回 true", () => {
    expect(isNonNegativeFinite(0)).toBe(true);
    expect(isNonNegativeFinite(100.5)).toBe(true);
  });

  it("负数 / NaN / Infinity 返回 false", () => {
    expect(isNonNegativeFinite(-1)).toBe(false);
    expect(isNonNegativeFinite(Number.NaN)).toBe(false);
    expect(isNonNegativeFinite(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("校验函数", () => {
  it("isValidYearMonth", () => {
    expect(isValidYearMonth("1985-06")).toBe(true);
    expect(isValidYearMonth("1985-13")).toBe(false); // 月份越界
    expect(isValidYearMonth("1985-6")).toBe(false);  // 必须两位
    expect(isValidYearMonth("abc-de")).toBe(false);
  });

  it("isValidBirthDate：1900 至当前年", () => {
    expect(isValidBirthDate("1985-06")).toBe(true);
    expect(isValidBirthDate("1899-12")).toBe(false);
    expect(isValidBirthDate("1900-01")).toBe(true);
    const futureYear = new Date().getFullYear() + 1;
    expect(isValidBirthDate(`${futureYear}-01`)).toBe(false);
  });

  it("isValidWorkStart：不晚于当前月", () => {
    expect(isValidWorkStart("2007-07")).toBe(true);
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const future = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
    expect(isValidWorkStart(future)).toBe(false);
  });
});

describe("getDelayPolicy", () => {
  it("男职工：60→63，每 4 月 +1", () => {
    const p = getDelayPolicy("male", "worker");
    expect(p.baseAgeYears).toBe(60);
    expect(p.targetAgeYears).toBe(63);
    expect(p.stepMonths).toBe(4);
    expect(p.cohortStart).toBe("1965-01");
  });

  it("女工人：50→55，每 2 月 +1", () => {
    const p = getDelayPolicy("female", "worker");
    expect(p.baseAgeYears).toBe(50);
    expect(p.targetAgeYears).toBe(55);
    expect(p.stepMonths).toBe(2);
    expect(p.cohortStart).toBe("1975-01");
  });

  it("女干部：55→58，每 4 月 +1", () => {
    const p = getDelayPolicy("female", "cadre");
    expect(p.baseAgeYears).toBe(55);
    expect(p.targetAgeYears).toBe(58);
    expect(p.stepMonths).toBe(4);
    expect(p.cohortStart).toBe("1970-01");
  });
});

describe("calcRetirementAge", () => {
  it("1964-12 男：未适用延迟政策（早于 1965-01）", () => {
    const r = calcRetirementAge({ ...baseProfile, birthDate: "1964-12" });
    expect(r.delayed).toBe(false);
    expect(r.delayedMonths).toBe(0);
    expect(r.years).toBe(60);
    expect(r.months).toBe(0);
    expect(r.retirementDate).toBe("2024-12");
  });

  it("1965-01 男：政策起始，刚好不延迟（increments=0）", () => {
    const r = calcRetirementAge({ ...baseProfile, birthDate: "1965-01" });
    expect(r.delayed).toBe(false);
    expect(r.delayedMonths).toBe(0);
    expect(r.years).toBe(60);
    expect(r.retirementDate).toBe("2025-01");
  });

  it("1965-05 男：延迟 1 个月（4 个月后第一个 increment）", () => {
    // 1965-05 比 1965-01 晚 4 个月，increments = floor(4/4) = 1
    const r = calcRetirementAge({ ...baseProfile, birthDate: "1965-05" });
    expect(r.delayed).toBe(true);
    expect(r.delayedMonths).toBe(1);
    expect(r.years).toBe(60);
    expect(r.months).toBe(1);
    expect(r.retirementDate).toBe("2025-06");
  });

  it("1977-01 男：达到最大延迟 36 个月（63 岁）", () => {
    // 1977-01 比 1965-01 晚 144 个月，increments = floor(144/4) = 36，
    // 但 maxDelayMonths = (63-60)*12 = 36，所以封顶 36
    const r = calcRetirementAge({ ...baseProfile, birthDate: "1977-01" });
    expect(r.delayed).toBe(true);
    expect(r.delayedMonths).toBe(36);
    expect(r.years).toBe(63);
    expect(r.months).toBe(0);
    expect(r.retirementDate).toBe("2040-01");
  });

  it("1985-06 男：延迟 36 个月（封顶）", () => {
    const r = calcRetirementAge(baseProfile);
    expect(r.delayed).toBe(true);
    expect(r.delayedMonths).toBe(36);
    expect(r.years).toBe(63);
    expect(r.retirementDate).toBe("2048-06");
  });

  it("女工人 1974-12：未适用延迟政策", () => {
    const r = calcRetirementAge({
      ...baseProfile,
      gender: "female",
      identity: "worker",
      birthDate: "1974-12",
    });
    expect(r.delayed).toBe(false);
    expect(r.years).toBe(50);
    expect(r.retirementDate).toBe("2024-12");
  });

  it("女工人 1975-03：延迟 1 个月", () => {
    // 1975-03 比 1975-01 晚 2 个月，increments = floor(2/2) = 1
    const r = calcRetirementAge({
      ...baseProfile,
      gender: "female",
      identity: "worker",
      birthDate: "1975-03",
    });
    expect(r.delayed).toBe(true);
    expect(r.delayedMonths).toBe(1);
    expect(r.years).toBe(50);
    expect(r.months).toBe(1);
  });
});

describe("lookupPayoutMonths", () => {
  it("60 岁 -> 139 月", () => {
    expect(lookupPayoutMonths(60, 0)).toBe(139);
  });

  it("63 岁 -> 117 月", () => {
    expect(lookupPayoutMonths(63, 0)).toBe(117);
  });

  it("55 岁 -> 170 月", () => {
    expect(lookupPayoutMonths(55, 0)).toBe(170);
  });

  it("越界自动 clamp 到 [40, 70]", () => {
    expect(lookupPayoutMonths(30, 0)).toBe(233); // 40 岁对应的月数
    expect(lookupPayoutMonths(80, 0)).toBe(56);  // 70 岁对应的月数
  });

  it("带月份四舍五入", () => {
    // 60.5 岁 -> round(60.5) = 61 -> 132 月
    expect(lookupPayoutMonths(60, 6)).toBe(132);
  });
});

describe("calcPension", () => {
  it("返回完整的养老金结果对象", () => {
    const p = calcPension(baseProfile);
    expect(p).toHaveProperty("basicPension");
    expect(p).toHaveProperty("personalAccountPension");
    expect(p).toHaveProperty("transitionalPension");
    expect(p).toHaveProperty("totalMonthly");
    expect(p).toHaveProperty("payoutMonths");
    expect(p).toHaveProperty("remaining");
    expect(p.totalMonthly).toBe(
      p.basicPension + p.personalAccountPension + p.transitionalPension,
    );
  });

  it("替代率 = 月养老金 / 月工资", () => {
    const p = calcPension(baseProfile);
    expect(p.replacementRate).toBeCloseTo(p.totalMonthly / baseProfile.monthlySalary, 5);
  });

  it("已退休档案：remaining.totalDays <= 0", () => {
    const p = calcPension({
      ...baseProfile,
      birthDate: "1960-01", // 男，60 岁，2020-01 退休
    });
    expect(p.remaining.totalDays).toBeLessThanOrEqual(0);
  });

  it("1996 年后参加工作：无过渡性养老金", () => {
    const p = calcPension({
      ...baseProfile,
      workStartDate: "2000-01",
    });
    expect(p.transitionalPension).toBe(0);
    expect(p.deemedYears).toBe(0);
  });

  it("1996 年前参加工作：有过渡性养老金", () => {
    const p = calcPension({
      ...baseProfile,
      workStartDate: "1990-01",
    });
    expect(p.transitionalPension).toBeGreaterThan(0);
    expect(p.deemedYears).toBeGreaterThan(0);
  });
});

describe("格式化工具", () => {
  it("formatMoney", () => {
    expect(formatMoney(12345.6)).toBe("12,346");
    expect(formatMoney(0)).toBe("0");
    expect(formatMoney(999999)).toBe("999,999");
  });

  it("formatPercent", () => {
    expect(formatPercent(0.4231)).toBe("42.3%");
    expect(formatPercent(1)).toBe("100.0%");
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formatYears", () => {
    expect(formatYears(1.5)).toBe("1 年 6 个月");
    expect(formatYears(1)).toBe("1 年");
    expect(formatYears(0.5)).toBe("6 个月");
  });
});

describe("PROVINCE_AVG_SALARY", () => {
  it("所有省份都在 PROVINCE_LIST 中", () => {
    for (const province of Object.keys(PROVINCE_AVG_SALARY)) {
      expect(PROVINCE_LIST).toContain(province);
    }
  });

  it("所有工资为正数", () => {
    for (const salary of Object.values(PROVINCE_AVG_SALARY)) {
      expect(salary).toBeGreaterThan(0);
    }
  });

  it("包含 31 个省级行政区", () => {
    expect(PROVINCE_LIST.length).toBeGreaterThanOrEqual(31);
  });
});
