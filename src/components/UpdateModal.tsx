import { useState } from "react";
import { Check, Download, Loader2, Sparkles, X } from "lucide-react";
import Button from "@/components/Button";
import type { UpdateInfo } from "@/lib/updater";
import { downloadAndInstallUpdate } from "@/lib/updater";

interface UpdateModalProps {
  open: boolean;
  onClose: () => void;
  info: UpdateInfo | null;
}

/** 应用更新提示弹框：展示新版本号与发行说明，支持应用内下载安装 */
export default function UpdateModal({ open, onClose, info }: UpdateModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!open || !info) return null;

  const handleUpdate = async () => {
    setDownloading(true);
    try {
      await downloadAndInstallUpdate(info);
    } finally {
      setDownloading(false);
    }
  };

  // 已是最新版本
  if (!info.hasUpdate) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="card-paper relative my-8 w-full max-w-lg p-6 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-[3px] text-slate transition-colors hover:bg-card-edge/40 hover:text-ink"
          >
            <X size={16} />
          </button>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-amber/30 bg-amber/5 text-amber">
              <Check size={24} />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink">
              已是最新版本
            </h2>
            <p className="text-sm text-slate">
              当前 v{info.currentVersion}，暂无可用更新
            </p>
            <Button variant="ghost" onClick={onClose} className="mt-2">
              知道了
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm"
      onClick={downloading ? undefined : onClose}
    >
      <div
        className="card-paper relative my-8 w-full max-w-lg p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {!downloading && (
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-[3px] text-slate transition-colors hover:bg-card-edge/40 hover:text-ink"
          >
            <X size={16} />
          </button>
        )}

        <div className="mb-5 flex flex-col gap-1">
          <span className="label-eyebrow">应用更新 · Update</span>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber" />
            <h2 className="font-display text-2xl font-semibold text-ink">
              发现新版本
            </h2>
          </div>
          <p className="text-sm text-slate">
            <span className="num font-semibold text-ink">v{info.latestVersion}</span>
            <span className="mx-2 text-slate-soft">·</span>
            当前 v{info.currentVersion}
          </p>
        </div>

        {info.releaseNotes && (
          <div className="mb-6 max-h-64 overflow-y-auto rounded-[3px] border border-card-edge/60 p-4">
            <pre className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-ink-soft">
              {info.releaseNotes}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="stamp"
            onClick={handleUpdate}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                正在下载…
              </>
            ) : (
              <>
                <Download size={15} />
                立即更新
              </>
            )}
          </Button>
          {!downloading && (
            <Button variant="ghost" onClick={onClose}>
              稍后再说
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
