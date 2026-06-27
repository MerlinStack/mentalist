interface Verse {
  ref: string;
  text: string;
  secondary?: string | null;
}

interface LivePanelProps {
  verse: Verse | null;
  onClear: () => void;
  onProject: () => void;
}

export default function LivePanel({ verse, onClear, onProject }: LivePanelProps) {
  return (
    <div className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Live</h3>
        {verse && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">PROJECTING</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
        {verse ? (
          <>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-medium mb-4">
              {verse.ref}
            </div>
            <p className="text-lg font-serif leading-relaxed text-text-primary">{verse.text}</p>
            {verse.secondary && (
              <p className="mt-3 text-sm text-text-muted italic leading-relaxed">
                {verse.secondary}
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-lighter flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm text-text-muted">No verse projected</p>
            <p className="text-xs text-text-muted/60 mt-1">Push a verse to display on screen</p>
          </div>
        )}
      </div>

      {verse && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={onProject}
            className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all"
          >
            Project to Display
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2.5 rounded-lg bg-surface-lighter text-text-secondary text-sm font-medium hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
