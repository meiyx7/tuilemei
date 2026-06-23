import { NavLink, useLocation, Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "仪表盘", en: "Dashboard" },
  { to: "/calc", label: "退休测算", en: "Forecast" },
  { to: "/history", label: "打卡历史", en: "Almanac" },
];

function todayLabel(): string {
  const d = new Date();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${weekdays[d.getDay()]}`;
}

/** 顶部刊头 + 导航 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-30 border-b border-card-edge/70 bg-paper/85 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl font-black tracking-tightish text-ink">
              退了没
            </h1>
            <span className="hidden text-xs text-slate sm:inline">
              · 退休进度年鉴 ·
            </span>
            <span className="num text-[0.7rem] text-slate-soft">{todayLabel()}</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative rounded-[3px] px-3 py-1.5 font-body text-sm transition-colors",
                    active
                      ? "text-ink"
                      : "text-slate hover:text-ink",
                  )}
                >
                  <span className="relative z-10">{item.label}</span>
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-[2px] bg-stamp" />
                  )}
                </NavLink>
              );
            })}
            {/* 个人档案：设置按钮入口，不与其他 tab 并列 */}
            <Link
              to="/profile"
              aria-label="个人档案设置"
              className={cn(
                "ml-1 grid h-8 w-8 place-items-center rounded-[3px] border transition-colors",
                pathname === "/profile"
                  ? "border-ink text-ink"
                  : "border-card-edge text-slate hover:border-ink hover:text-ink",
              )}
            >
              <Settings size={15} />
            </Link>
          </nav>
        </div>
      </header>
      <main className="container py-8 md:py-12">{children}</main>
      <footer
        className="container pb-10 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)" }}
      >
        <div className="almanac-rule mb-4" />
        <p className="text-xs leading-relaxed text-slate">
          「退了没」为个人退休进度追踪与养老金测算工具，测算依据 2025 年渐进式延迟退休政策与城镇职工基本养老保险计发办法的简化模型，
          <span className="text-stamp">结果仅供参考，不构成任何官方承诺或法律依据。</span>
          实际退休年龄与待遇以参保地社保经办机构核定为准。
        </p>
      </footer>
    </div>
  );
}
