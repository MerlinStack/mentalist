interface Verse {
  ref: string;
  text: string;
  secondary?: string | null;
}

interface PreviewPanelProps {
  verse: Verse;
  confidence: number;
  onPushLive: () => void;
  onNext: () => void;
}

export default function PreviewPanel({ verse, confidence, onPushLive, onNext }: PreviewPanelProps) {
  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Preview</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${confidence > 90 ? "bg-emerald-400" : confidence > 80 ? "bg-yellow-400" : "bg-red-400"}`}
          />
          <span className="text-xs font-mono text-text-muted">{confidence}%</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-[10px] font-medium mb-4">
          {verse.ref}
        </div>
        <p className="text-lg font-serif leading-relaxed text-text-primary">{verse.text}</p>
        {verse.secondary && (
          <p className="mt-3 text-sm text-text-muted italic leading-relaxed">{verse.secondary}</p>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onPushLive}
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
        >
          Push to Live
        </button>
        <button
          onClick={onNext}
          className="px-4 py-2.5 rounded-lg bg-surface-lighter text-text-secondary text-sm font-medium hover:text-text-primary hover:bg-surface transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}
