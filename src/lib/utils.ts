// 退了没 —— 工具函数（小程序版）
// cn：简化版，不依赖 clsx/tailwind-merge，直接过滤拼接

export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}
