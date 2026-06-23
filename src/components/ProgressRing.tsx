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
  trackClass?: string;
  barClass?: string;
}

/**
 * 环形进度（SVG），带入场绘制动画。
 */
export default function ProgressRing({
  value,
  size = 180,
  stroke = 10,
  className,
  children,
  trackClass = "text-card-edge",
  barClass = "text-amber",
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
          className={trackClass}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={barClass}
          stroke="currentColor"
          strokeDasharray={circ}
          strokeDashoffset={animOffset}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
