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
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {label} ✓
      </div>
    );
  }

  if (status === "progress" || status === "download") {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-[9px] font-mono">
          <span className="text-amber-400">⟳ {label}</span>
          <span className="text-slate-400">{pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
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
    || semanticProgress.status === "progress"
    || !whisperLoaded
    || !semanticLoaded;

  if (!hasActivity) return null;

  return (
    <div className="rounded-lg bg-[#1A2035]/60 backdrop-blur-md border border-[#2D3A5C]/30 p-3 space-y-2 min-w-[160px] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
        Model Downloads
      </div>
      <ModelProgress
        label="Whisper"
        loaded={whisperProgress.loaded}
        total={whisperProgress.total}
        status={whisperProgress.status}
        ready={whisperLoaded}
      />
      <ModelProgress
        label="MiniLM"
        loaded={semanticProgress.loaded}
        total={semanticProgress.total}
        status={semanticProgress.status}
        ready={semanticLoaded}
      />
    </div>
  );
}
