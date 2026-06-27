import { useEffect, useRef } from 'react';
import { useSoundStore } from '../../store/soundStore';

export const LiveTranscript: React.FC = () => {
  const { transcript, recentChunk, isListening } = useSoundStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, recentChunk]);

  return (
    <div className="flex flex-col h-full p-4 pro-console-glass rounded-xl text-slate-200">
      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Audio Stream</h3>
        <span className={`h-2 w-2 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[180px] text-sm font-mono leading-relaxed text-slate-300">
        {transcript || recentChunk ? (
          <>
            <p className="opacity-60">{transcript}</p>
            {recentChunk && <p className="text-accent-blue border-l-2 border-accent-blue pl-2 font-semibold">{recentChunk}</p>}
          </>
        ) : (
          <p className="text-xs italic text-slate-500">
            {isListening ? "Awaiting vocal speech patterns..." : "System engine offline. Toggle mic."}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LiveTranscript;
