import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0 ~ 1 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** 中心内容 */
  children?: React.ReactNode;
  /** 轨道颜色（默认 card-edge） */
  trackColor?: string;
  /** 进度条颜色（默认 amber） */
  barColor?: string;
}

/**
 * 环形进度（SVG），带入场绘制动画。
 * 颜色使用内联 stroke 属性（而非 currentColor + Tailwind 类），
 * 以确保 html-to-image 截图时颜色不丢失。
 */
export default function ProgressRing({
  value,
  size = 180,
  stroke = 10,
  className,
  children,
  trackColor = "#E2D9C3",
  barColor = "#C8893B",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped);

  // 入场动画：从 0 渐进到目标
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const animOffset = circ * (1 - shown);

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={barColor}
          strokeDasharray={circ}
          strokeDashoffset={animOffset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
