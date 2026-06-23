import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  desc?: string;
  align?: "left" | "center";
  className?: string;
}

/** 章节标题：等宽小标签 + 衬线大标题 + 细分割线 */
export default function SectionHeader({
  eyebrow,
  title,
  desc,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow && <span className="label-eyebrow">{eyebrow}</span>}
      <h2 className="font-display text-2xl font-semibold text-ink tracking-tightish md:text-3xl">
        {title}
      </h2>
      {desc && <p className="max-w-prose text-sm text-slate">{desc}</p>}
      <div className="almanac-rule mt-1 w-full max-w-xs" />
    </div>
  );
}
