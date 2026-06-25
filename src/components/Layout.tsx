import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Loader2, RefreshCw, Settings, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import ProfileModal from "@/components/ProfileModal";
import OnboardingModal from "@/components/OnboardingModal";
import UpdateModal from "@/components/UpdateModal";
import { checkForUpdate, APP_VERSION, BUILD_TIME } from "@/lib/updater";
import type { UpdateInfo } from "@/lib/updater";

const NAV = [
  { to: "/", label: "仪表盘", en: "Dashboard" },
  { to: "/calc", label: "退休账本", en: "Ledger" },
  { to: "/history", label: "打卡历史", en: "Almanac" },
];

/** 自动检查更新的间隔（毫秒）：24 小时 */
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = "tuilemei:last-update-check";

/** 顶部刊头 + 导航 + 档案设置弹框 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const onboarded = useStore((s) => s.onboarded);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const isHome = pathname === "/";

  // 监听其他页面派发的"打开档案弹框"事件
  useEffect(() => {
    const onOpen = () => setProfileOpen(true);
    window.addEventListener("open-profile-modal", onOpen);
    return () => window.removeEventListener("open-profile-modal", onOpen);
  }, []);

  // 监听 Dashboard 回传的分享状态
  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent<{ sharing: boolean }>).detail;
      setSharing(detail.sharing);
    };
    window.addEventListener("share-state", onState as EventListener);
    return () => window.removeEventListener("share-state", onState as EventListener);
  }, []);

  // 启动时自动检查更新（24 小时内已检查过则跳过）
  useEffect(() => {
    const last = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
    if (Date.now() - last < CHECK_INTERVAL) return;
    checkForUpdate().then((info) => {
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      if (info.hasUpdate) {
        setUpdateInfo(info);
        setUpdateOpen(true);
      }
    });
  }, []);

  const handleShare = () => {
    window.dispatchEvent(new CustomEvent("trigger-share"));
  };

  // 手动检查更新
  // 行为对齐自动检查：仅在有新版本时弹窗，无新版本时通过 hint 提示
  const [checkHint, setCheckHint] = useState<string | null>(null);
  const handleCheckUpdate = async () => {
    setChecking(true);
    setCheckHint(null);
    try {
      const info = await checkForUpdate();
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      setUpdateInfo(info);
      if (info.hasUpdate) {
        setUpdateOpen(true);
      } else {
        // 短暂提示"已是最新版本"，2 秒后消失
        setCheckHint("已是最新版本");
        setTimeout(() => setCheckHint(null), 2000);
      }
    } catch {
      setCheckHint("检查失败，请稍后重试");
      setTimeout(() => setCheckHint(null), 2000);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-30 border-b border-card-edge/70 bg-paper/85 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container flex items-center justify-between py-4">
          <nav className="flex flex-nowrap items-center justify-between gap-2 overflow-hidden">
            {/* 左侧：tab 页导航 */}
            <div className="flex flex-nowrap items-center gap-1">
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "relative shrink-0 rounded-[3px] px-3 py-1.5 font-body text-sm transition-colors",
                      active
                        ? "text-ink"
                        : "text-slate hover:text-ink",
                    )}
                  >
                    <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                    {active && (
                      <span className="absolute inset-x-2 -bottom-px h-[2px] bg-stamp" />
                    )}
                  </NavLink>
                );
              })}
            </div>
            {/* 右侧：设置 + 分享按钮组，位置固定，分享按钮隐藏时用 invisible 占位避免设置按钮位移 */}
            <div className="flex flex-nowrap items-center gap-1">
              <button
                onClick={() => setProfileOpen(true)}
                aria-label="个人档案设置"
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border transition-colors",
                  "border-card-edge text-slate hover:border-ink hover:text-ink",
                )}
              >
                <Settings size={15} />
              </button>
              {/* 分享按钮：仅首页显示，非首页用 invisible 占位保持设置按钮位置不变 */}
              <button
                onClick={handleShare}
                disabled={sharing || !isHome}
                aria-label="分享退休进度"
                tabIndex={isHome ? 0 : -1}
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border transition-colors",
                  "border-card-edge text-slate hover:border-ink hover:text-ink disabled:opacity-50",
                  !isHome && "invisible pointer-events-none",
                )}
              >
                {sharing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Share2 size={15} />
                )}
              </button>
            </div>
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
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="num text-[0.7rem] text-slate-soft">
            v{APP_VERSION}
            {BUILD_TIME && (
              <span className="ml-1 text-slate-soft/60">
                · {new Date(BUILD_TIME).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </span>
          <button
            onClick={handleCheckUpdate}
            disabled={checking}
            className="inline-flex items-center gap-1 text-[0.7rem] text-slate transition-colors hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={11} className={checking ? "animate-spin" : ""} />
            {checking ? "检查中…" : "检查更新"}
          </button>
          {checkHint && (
            <span className="text-[0.7rem] text-slate-soft">{checkHint}</span>
          )}
        </div>
      </footer>

      {/* 个人档案设置弹框 */}
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      {/* 首次使用引导：未完成 onboarding 时自动弹出 */}
      <OnboardingModal open={!onboarded} onClose={() => {}} />
      {/* 应用更新提示弹框 */}
      <UpdateModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        info={updateInfo}
      />
    </div>
  );
}
