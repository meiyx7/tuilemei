import { cn } from "@/lib/utils";

type Variant = "stamp" | "outline" | "ghost" | "amber";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantMap: Record<Variant, string> = {
  stamp:
    "bg-stamp text-paper border-stamp hover:bg-stamp-deep hover:border-stamp-deep shadow-stamp",
  amber:
    "bg-amber text-paper border-amber hover:brightness-95",
  outline:
    "bg-transparent text-ink border-ink/30 hover:border-ink hover:bg-ink hover:text-paper",
  ghost: "bg-transparent text-ink-soft border-transparent hover:bg-ink/5",
};

/** 按钮：方形微圆角，印章式按压反馈 */
export default function Button({
  variant = "outline",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[3px] border px-4 py-2.5",
        "font-body text-sm font-medium tracking-wide transition-all duration-150",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        variantMap[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
