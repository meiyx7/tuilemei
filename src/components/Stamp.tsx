import { cn } from "@/lib/utils";

interface StampProps {
  /** 印章主文字，如 "已打卡" */
  label: string;
  /** 印章副文字，如日期 */
  sub?: string;
  size?: "sm" | "md" | "lg";
  /** 是否播放盖章动画 */
  animate?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "h-16 w-16", label: "text-[0.7rem]", sub: "text-[0.55rem]" },
  md: { box: "h-24 w-24", label: "text-sm", sub: "text-[0.6rem]" },
  lg: { box: "h-32 w-32", label: "text-lg", sub: "text-[0.7rem]" },
};

/**
 * 印章组件 —— 模拟中式印章/邮戳，圆形双环 + 衬线文字，盖在纸面上略带旋转。
 */
export default function Stamp({
  label,
  sub,
  size = "md",
  animate = false,
  className,
}: StampProps) {
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-full border-2 border-stamp text-stamp",
        "bg-transparent select-none",
        animate && "animate-stampDown",
        s.box,
        className,
      )}
      style={{
        boxShadow: "inset 0 0 0 1px rgba(178,58,46,0.35)",
      }}
      aria-hidden
    >
      <div className="absolute inset-[5px] rounded-full border border-stamp/60" />
      <div className="relative z-10 flex flex-col items-center leading-none">
        <span className={cn("stamp-text", s.label)}>{label}</span>
        {sub && (
          <span className={cn("num mt-1 opacity-80", s.sub)}>{sub}</span>
        )}
      </div>
    </div>
  );
}
