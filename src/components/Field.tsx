import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/** 表单字段容器：衬线标签 + 下划线输入 + 提示 */
export default function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-body text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-soft">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-[3px] border border-card-edge bg-paper/60 px-3 py-2.5 font-body text-ink " +
  "outline-none transition-colors placeholder:text-slate-soft focus:border-ink focus:bg-card";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={cn(inputBase, props.className)} />;
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={cn(inputBase, "cursor-pointer appearance-none", props.className)}
    />
  );
}
