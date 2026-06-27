import { useSoundStore } from '../../store/soundStore';

export const AudioMeter: React.FC = () => {
  const audioLevel = useSoundStore((state) => state.audioLevel);
  const isListening = useSoundStore((state) => state.isListening);
  const pct = audioLevel > 1 ? audioLevel : audioLevel * 100;

  return (
    <div className="p-4 rounded-xl bg-[#1A2035]/40 backdrop-blur-md border border-[#2D3A5C]/40">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Acoustic Gain
        </span>
        <span className="text-[10px] font-mono text-slate-300">
          {isListening ? `${Math.round(pct)}%` : '0%'}
        </span>
      </div>

      <div className="flex items-end gap-px h-10">
        {Array.from({ length: 40 }, (_, i) => {
          const active = isListening && pct > 1;
          const wavePos = (i / 40) * Math.PI * 2;
          const h = active
            ? Math.max(10, Math.min(100, pct * (0.5 + 0.5 * Math.sin(wavePos + Date.now() / 150))))
            : 15 + (i % 3) * 8;

          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-50"
              style={{
                height: `${active ? h : 15 + (i % 3) * 8}%`,
                background: active
                  ? `hsl(${210 + h * 0.6}, 80%, ${40 + h * 0.4}%)`
                  : '#1E293B',
                minHeight: '2px',
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-2">
        <span className={`text-[9px] font-mono ${isListening ? 'text-emerald-400' : 'text-slate-500'}`}>
          {isListening ? '● LIVE' : '○ MUTED'}
        </span>
        <span className="text-[9px] font-mono text-slate-500">
          {isListening ? `Threshold: ${Math.round(pct)}%` : 'Standby'}
        </span>
      </div>
    </div>
  );
};

export default AudioMeter;
