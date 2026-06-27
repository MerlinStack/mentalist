interface BottomBarProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  translation: string;
  onTranslationChange: () => void;
}

const MODES = ["Scripture", "Sound", "Announcements"];

export default function BottomBar({
  activeMode,
  onModeChange,
  translation,
  onTranslationChange,
}: BottomBarProps) {
  return (
    <div className="flex items-center justify-between px-4 h-12 border-t border-white/5 bg-surface/50 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-1">
        {MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeMode === mode
                ? "bg-primary/20 text-primary-light"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] text-text-muted">Translation</span>
        <button
          onClick={onTranslationChange}
          className="px-2.5 py-1 rounded-md bg-surface-lighter text-xs font-medium text-text-primary hover:bg-surface transition-all"
        >
          {translation}
        </button>
      </div>
    </div>
  );
}
