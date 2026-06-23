// 退了没 —— 每日打卡寄语库

export const DAILY_QUOTES: string[] = [
  "今日已打卡，离自由又近一天。",
  "多缴一年，多一份底气。",
  "时间是最公平的复利。",
  "退休不是终点，是新章节的扉页。",
  "把每一天都存进未来的账户。",
  "慢慢来，比较快。",
  "今天的工资，有一部分在替未来的你打工。",
  "稳住，你能赢。",
  "日子像邮票，盖一个少一个。",
  "别焦虑，先打卡。",
  "养老金的三块砖：基础、账户、过渡，一块块垒。",
  "延迟的是年龄，延不断的是盼头。",
  "又熬过一天，值得一枚印章。",
  "退休金会到账，就像日出会到来。",
  "把焦虑折算成缴费年限。",
];

/** 依据日期字符串稳定选取一条寄语 */
export function quoteForDate(dateStr: string): string {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return DAILY_QUOTES[hash % DAILY_QUOTES.length];
}
