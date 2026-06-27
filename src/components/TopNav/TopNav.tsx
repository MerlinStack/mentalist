interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  queueCount: number;
}

const TABS = ["Scripture", "Sound", "Queue", "Settings"];

export default function TopNav({ activeTab, onTabChange, queueCount }: TopNavProps) {
  return (
    <nav className="flex items-center justify-between px-4 h-14 border-b border-white/5 bg-surface/50 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-1">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center mr-2">
          <span className="text-white font-bold text-xs font-display">D</span>
        </div>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-primary/20 text-primary-light"
                : "text-text-muted hover:text-text-primary hover:bg-surface-lighter"
            }`}
          >
            {tab}
            {tab === "Queue" && queueCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-accent/20 text-accent">
                {queueCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
        <span className="text-xs text-text-muted">Connected</span>
      </div>
    </nav>
  );
}
