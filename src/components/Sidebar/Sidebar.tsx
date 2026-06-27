interface SidebarProps {
  isListening: boolean;
  timer: number;
  transcriptText: string;
  activeSelection: string;
  onSelectionChange: (id: string) => void;
  isAutoMode: boolean;
  onModeChange: (auto: boolean) => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function Sidebar({
  isListening,
  timer,
  transcriptText,
  activeSelection,
  onSelectionChange,
  isAutoMode,
  onModeChange,
}: SidebarProps) {
  return (
    <aside className="w-72 border-r border-white/5 bg-surface-lighter/30 flex flex-col shrink-0">
      {/* Status section */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Status
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${isListening ? "bg-emerald-400 animate-pulse" : "bg-text-muted"}`}
            />
            <span className="text-xs text-text-muted">{isListening ? "Live" : "Idle"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <svg
            className="w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatTime(timer)}
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Transcript
          </span>
          {isListening && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
        </div>
        <p className="text-sm text-text-secondary italic leading-relaxed">"{transcriptText}"</p>
      </div>

      {/* Quick select */}
      <div className="p-4 border-t border-white/5">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
          Quick Select
        </span>
        <div className="space-y-1">
          {["1", "2", "3"].map((id) => (
            <button
              key={id}
              onClick={() => onSelectionChange(id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                activeSelection === id
                  ? "bg-primary/20 text-primary-light"
                  : "text-text-secondary hover:bg-surface-lighter hover:text-text-primary"
              }`}
            >
              Selection {id}
            </button>
          ))}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-1 p-1 rounded-lg bg-surface border border-white/5">
          <button
            onClick={() => onModeChange(true)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isAutoMode
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => onModeChange(false)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              !isAutoMode
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Manual
          </button>
        </div>
      </div>
    </aside>
  );
}
