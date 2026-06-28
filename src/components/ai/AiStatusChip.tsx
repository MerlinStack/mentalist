import { useSoundStore } from "../../store/soundStore";

function ModelProgress({
  label,
  loaded,
  total,
  status,
  ready,
}: {
  label: string;
  loaded: number;
  total: number;
  status: string;
  ready: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

  if (ready) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 glow-green" style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))' }} />
        {label} <span className="text-emerald-500">✓</span>
      </div>
    );
  }

  if (status === "progress" || status === "download" || status === "webgpu-fallback" || status === "fallback") {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <span className={status === "fallback" || status === "webgpu-fallback" ? 'text-amber-400' : 'text-amber-400'}>
            {status === "fallback" || status === "webgpu-fallback" ? '⟳ ' : '⟳ '}{label}
            {status === "webgpu-fallback" && <span className="text-[8px] text-slate-500 ml-1">CPU</span>}
            {status === "fallback" && <span className="text-[8px] text-slate-500 ml-1">legacy</span>}
          </span>
          <span className="text-slate-400">{pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-slate-800/60 overflow-hidden ring-1 ring-white/[0.03]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
}

export default function AiStatusChip() {
  const whisperLoaded = useSoundStore((s) => s.whisperModelLoaded);
  const semanticLoaded = useSoundStore((s) => s.semanticModelLoaded);
  const whisperProgress = useSoundStore((s) => s.whisperProgress);
  const semanticProgress = useSoundStore((s) => s.semanticProgress);

  const hasActivity = whisperProgress.status === "progress"
    || whisperProgress.status === "download"
    || whisperProgress.status === "webgpu-fallback"
    || whisperProgress.status === "fallback"
    || semanticProgress.status === "progress"
    || semanticProgress.status === "download"
    || semanticProgress.status === "webgpu-fallback"
    || semanticProgress.status === "fallback"
    || !whisperLoaded
    || !semanticLoaded;

  if (!hasActivity) return null;

  return (
    <div className="glass-premium rounded-xl p-3.5 space-y-2.5 min-w-[180px]">
      <div className="flex items-center gap-2 border-b border-white/[0.04] pb-2">
        <div className="w-1 h-3 rounded-full bg-gradient-to-b from-[#C9973A] to-[#C9973A]/30" />
        <span className="text-cinema-label">Model Downloads</span>
      </div>
      <ModelProgress
        label="Whisper"
        loaded={whisperProgress.loaded}
        total={whisperProgress.total}
        status={whisperProgress.status}
        ready={whisperLoaded}
      />
      <ModelProgress
        label="Embedder"
        loaded={semanticProgress.loaded}
        total={semanticProgress.total}
        status={semanticProgress.status}
        ready={semanticLoaded}
      />
    </div>
  );
}
