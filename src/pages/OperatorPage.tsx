import { useEffect, useRef, useState } from 'react';
import { useSoundStore } from '../store/soundStore';
import { useScriptureStore } from '../store/scriptureStore';
import { useProjection } from '../hooks/useProjection';
import { useProjectionStore } from '../store/projectionStore';
import { useSoundMode } from '../hooks/useSoundMode';
import { AudioMeter } from '../components/sound/AudioMeter';
import { useOrchestrator } from '../hooks/useOrchestrator';
import type { Verse } from '../api/bible';

// Types and constants from second image
const MODES = ["Scripture", "Music", "Media"] as const;
const TRANSLATIONS = ["KJV", "NIV", "ESV", "NKJV"] as const;

interface DetectionEntry {
  ref: string;
  stage: "regex" | "semantic" | "gemma";
  confidence: number;
  time: string;
  spokenAs: string;
}

function FloatingOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl"
        style={{ background: 'radial-gradient(circle, #C9973A 0%, transparent 70%)', animation: 'float 22s ease-in-out infinite' }} />
      <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-[0.06] blur-3xl"
        style={{ background: 'radial-gradient(circle, #4F6BFF 0%, transparent 70%)', animation: 'float 28s ease-in-out infinite reverse' }} />
      <div className="absolute top-[50%] right-[40%] w-[300px] h-[300px] rounded-full opacity-[0.04] blur-3xl"
        style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)', animation: 'float 18s ease-in-out infinite 5s' }} />
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

export const OperatorPage: React.FC = () => {
  const { transcript, recentChunk, isListening } = useSoundStore();
  const { activeVerse } = useScriptureStore();
  const { startListening, stopListening } = useSoundMode();
  const { 
    projectVerse, 
    clearProjection, 
    currentVerse: currentLiveVerse,
  } = useProjection();

  const queue = useProjectionStore((s) => s.queue);
  const removeFromQueue = useProjectionStore((s) => s.removeFromQueue);

  // AI pipeline from second image
  const {
    isProcessing,
    audioLevel,
    detectedVerse,
    whisperLoaded,
    semanticLoaded,
    pushToProjection,
  } = useOrchestrator();

  // State from second image
  const [mode, setMode] = useState<(typeof MODES)[number]>("Scripture");
  const [translation, setTranslation] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [previewVerse, setPreviewVerse] = useState<Verse | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DetectionEntry[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const prevDetectedRef = useRef<string | null>(null);
  const queueRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Update preview verse when detected
  useEffect(() => {
    if (detectedVerse) {
      setPreviewVerse(detectedVerse);
      const ref = detectedVerse.ref || detectedVerse.reference || "";
      if (ref && ref !== prevDetectedRef.current) {
        prevDetectedRef.current = ref;
        const now = new Date();
        setDetectionHistory((prev) => [
          {
            ref,
            stage: "regex",
            confidence: 94,
            time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
            spokenAs: transcript ? transcript.slice(0, 80) : ref,
          },
          ...prev.slice(0, 49),
        ]);
      }
    }
  }, [detectedVerse, transcript]);

  // Update queue count
  useEffect(() => {
    setQueueCount(queue.length);
  }, [queue]);

  // System timer
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Sync session channel for active projections
  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => channelRef.current?.close();
  }, []);

  // Dropdown click-away
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(e.target as Node)) {
        setShowQueue(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handlePushLive = () => {
    const verse = previewVerse || activeVerse;
    if (verse) {
      projectVerse(verse);
      pushToProjection(verse);
      channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse });
    }
  };

  const handleToggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const formatSessionTime = () => {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const openProjector = () => {
    // Navigate to projector view
    window.open('/project', '_blank');
    if (currentLiveVerse) {
      channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse: currentLiveVerse });
    }
  };

  const displayVerse = previewVerse || activeVerse;

  return (
    <div className="min-h-screen bg-[#080D1C] text-slate-100 flex flex-col font-sans antialiased selection:bg-[#C9973A]/30">

      {/* Ambient floating orbs */}
      <FloatingOrbs />

      {/* HEADER with enhanced controls */}
      <header className="h-16 border-b border-[#2D3A5C]/40 bg-[#1A2035]/80 backdrop-blur-xl flex items-center justify-between px-6 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#C9973A] to-[#FFD580] shadow-lg shadow-[#C9973A]/20 flex items-center justify-center font-bold text-sm text-[#080D1C]">
            D
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-wide text-white">D'mentalist</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">AI SCRIPTURE ENGINE v1.2</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Status */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${whisperLoaded ? 'text-emerald-400' : 'text-slate-500'} font-mono`}>
              WHISPER {whisperLoaded ? '✓' : '⟳'}
            </span>
            <span className={`text-[10px] ${semanticLoaded ? 'text-indigo-400' : 'text-slate-500'} font-mono`}>
              MINILM {semanticLoaded ? '✓' : '⟳'}
            </span>
          </div>

          {/* Queue Button */}
          <div ref={queueRef} className="relative">
            <button
              onClick={() => setShowQueue((v) => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition border ${
                queueCount > 0 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Queue · <span className="font-bold">{queueCount}</span>
            </button>
            
            {showQueue && (
              <div className="absolute top-full right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-[#1A2035] border border-[#2D3A5C] rounded-xl shadow-2xl p-2 z-50">
                {queue.length > 0 ? (
                  queue.map((verse, i) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg">
                      <div>
                        <div className="text-xs font-medium text-white">{verse.reference}</div>
                        <div className="text-[10px] text-slate-400 truncate">{verse.text.slice(0, 40)}...</div>
                      </div>
                      <button 
                        onClick={() => removeFromQueue(i)}
                        className="text-slate-500 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 text-xs py-4">Queue is empty</div>
                )}
              </div>
            )}
          </div>

          {/* Mic Toggle */}
          <button
            onClick={handleToggleMic}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              isListening
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.1)]'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
            {isListening ? 'Mute Console' : 'Activate Live Mic'}
          </button>

          <div className="h-4 w-[1px] bg-slate-700" />

          {/* Push Live Button */}
          <button
            disabled={!displayVerse}
            onClick={handlePushLive}
            className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded-lg shadow-md shadow-[#C9973A]/20 hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            Push Live →
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden">

        {/* LEFT PANEL - Enhanced with AI features */}
        <section className="col-span-3 flex flex-col gap-4 h-full">

          {/* Audio Meter */}
          <AudioMeter />

          {/* Live Transcript with Waveform and AI detection */}
          <div className="flex flex-col h-[280px] p-4 rounded-xl bg-[#1A2035]/40 backdrop-blur-xl border border-[#2D3A5C]/40 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Transcript</h3>
                <span className="text-[10px] font-mono text-slate-500">{formatSessionTime()}</span>
              </div>
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <span className="text-[9px] text-amber-400 animate-pulse">PROCESSING...</span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isListening ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  {isListening ? 'LISTENING' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Waveform Visualization */}
            <div className="h-12 mb-3 flex items-end gap-0.5">
              {(() => {
                const raw = audioLevel > 1 ? audioLevel / 100 : audioLevel;
                const time = Date.now() / 200;
                return Array.from({ length: 50 }, (_, i) => {
                  const isActive = isListening && raw > 0.05;
                  const wavePosition = (i / 50) * Math.PI * 2;

                  let height;
                  if (isActive) {
                    const waveValue = Math.sin(wavePosition + time) * 0.5 + 0.5;
                    const randomFactor = 0.7 + (Math.sin(i * 1.3 + time * 0.5) * 0.3);
                    const levelFactor = Math.min(1, raw * 3);
                    height = Math.max(8, Math.min(100, (20 + waveValue * 60) * levelFactor * randomFactor));
                  } else {
                    height = 15 + (i % 4) * 6;
                  }

                  const getColor = () => {
                    if (!isActive) return '#1E293B';
                    const intensity = height / 100;
                    if (intensity > 0.7) return `hsl(160, 80%, ${40 + intensity * 30}%)`;
                    if (intensity > 0.4) return `hsl(200, 80%, ${40 + intensity * 30}%)`;
                    return `hsl(220, 70%, ${30 + intensity * 40}%)`;
                  };

                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all duration-75"
                      style={{
                        height: `${height}%`,
                        background: getColor(),
                        minHeight: '2px',
                        opacity: isActive ? 0.7 + (height / 100) * 0.3 : 0.3,
                      }}
                    />
                  );
                });
              })()}
            </div>

            {/* Transcript Text */}
            <div className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed space-y-2 text-slate-300 pr-1 select-text min-h-0">
              {isListening ? (
                <div className="space-y-2">
                  {transcript && (
                    <div className="text-slate-300">
                      {transcript}
                      {recentChunk && transcript.includes(recentChunk) && (
                        <span className="text-blue-400 font-medium bg-blue-500/5 px-1 rounded">
                          {recentChunk}
                        </span>
                      )}
                    </div>
                  )}

                  {recentChunk && !transcript?.includes(recentChunk) && (
                    <div className="text-blue-400 font-medium animate-pulse bg-blue-500/5 px-1 rounded">
                      {recentChunk}
                    </div>
                  )}

                  {detectedVerse && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] border-t border-white/5 pt-2">
                      <span className="text-emerald-400">✓ Detected:</span>
                      <span className="text-white font-medium">{detectedVerse.reference}</span>
                      <span className="text-slate-500">· 94% confidence</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 italic text-[11px]">
                  Vocal capture hardware unlinked. Trigger mic connection above.
                </p>
              )}
            </div>
          </div>

          {/* Engine Infrastructure */}
          <div className="p-4 rounded-xl bg-[#1A2035]/20 backdrop-blur-md border border-[#2D3A5C]/20 flex-1 text-[11px] font-mono space-y-2.5 text-slate-400 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
            <h4 className="font-semibold uppercase text-[9px] tracking-wider text-slate-500 border-b border-white/5 pb-1 mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9973A]" />
              Engine Infrastructure
            </h4>
            <div className="flex justify-between">
              <span>Whisper ASR:</span> 
              <span className={whisperLoaded ? "text-emerald-400" : "text-slate-500"}>
                {whisperLoaded ? '● Connected' : '⟳ Loading'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>MiniLM-L6:</span> 
              <span className={semanticLoaded ? "text-emerald-400" : "text-slate-500"}>
                {semanticLoaded ? '● Vector Ready' : '⟳ Loading'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Core Core:</span> 
              <span className="text-indigo-400">React 19 + TS 5.8</span>
            </div>
            
            {/* Session Timer */}
            <div className="flex justify-between pt-2 border-t border-white/5 mt-2">
              <span>Session:</span>
              <span className="text-slate-300">{formatSessionTime()}</span>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL - Preview and Live boards */}
        <section className="col-span-9 grid grid-cols-2 gap-6 h-full">

          {/* PREVIEW PANEL */}
          <div className="relative rounded-2xl border border-[#2D3A5C] bg-[#1A2035]/30 backdrop-blur-xl p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all duration-300 hover:border-[#C9973A]/30">

            {/* Header with Confidence and Next */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Confidence</span>
                  <span className="text-xl font-bold text-emerald-400">94%</span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Next</span>
                  <span className="text-xs font-medium text-slate-300">
                    {queue.length > 0 ? queue[0].reference : '\u2014'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewVerse(null)}
                  className="text-[10px] text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 transition"
                >
                  Clear
                </button>
                <button
                  onClick={handlePushLive}
                  disabled={!displayVerse}
                  className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded-lg shadow-md shadow-[#C9973A]/20 hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1"
                >
                  Push Live →
                </button>
              </div>
            </div>

            {/* Scripture Content */}
            {displayVerse ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8 animate-verse-enter">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold tracking-widest uppercase text-[#FFD580] font-mono px-3 py-1 bg-[#FFD580]/10 rounded-full border border-[#FFD580]/20">
                    {displayVerse.reference} — {TRANSLATIONS[translation] || 'KJV'}
                  </span>
                </div>
                <p className="text-2xl font-serif leading-relaxed text-white font-medium drop-shadow-md max-w-lg">
                  &ldquo;{displayVerse.text}&rdquo;
                </p>

                {/* Detection history indicator */}
                {detectionHistory.length > 0 && (
                  <div className="text-[10px] text-slate-400 mt-4">
                    <span>Detected: </span>
                    <span className="text-emerald-400">{detectionHistory[0].ref}</span>
                    <span className="text-slate-500 mx-2">·</span>
                    <span>{detectionHistory[0].time}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                <p className="text-xs text-slate-500 font-mono italic">Awaiting audio or search input string streams...</p>
                <p className="text-[10px] text-slate-600 font-sans max-w-xs">
                  Scripture spoken or typed will display here for operator confirmation before live push.
                </p>

                {/* Detection history when empty */}
                {detectionHistory.length > 0 && (
                  <div className="w-full max-w-xs mt-4 text-left">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Recent Detections</p>
                    {detectionHistory.slice(0, 3).map((item, i) => (
                      <div key={i} className="text-[10px] text-slate-400 py-1 border-b border-white/5 flex justify-between">
                        <span>{item.ref}</span>
                        <span>{item.confidence}% · {item.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LIVE PANEL */}
          <div className="relative rounded-2xl border-2 border-[#EF4444]/30 bg-[#0A0F1E]/60 backdrop-blur-xl p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all duration-300">

            {/* Live Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${currentLiveVerse ? 'bg-[#EF4444] animate-ping' : 'bg-slate-600'}`} />
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#EF4444]">
                  Live Projector Feed
                </span>
              </div>

              <div className="flex items-center gap-2">
                {currentLiveVerse && (
                  <button
                    onClick={clearProjection}
                    className="text-[10px] text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 transition"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={openProjector}
                  className="text-[10px] text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 transition flex items-center gap-1"
                >
                  <span>Project</span>
                  <span className="text-[8px]">↗</span>
                </button>
              </div>
            </div>

            {/* Live Content */}
            {currentLiveVerse ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8 animate-verse-enter">
                <p className="text-2xl font-serif leading-relaxed text-white font-semibold max-w-lg">
                  {currentLiveVerse.text}
                </p>
                <span className="text-xs font-mono text-slate-400 tracking-wider block uppercase font-bold text-[#4F6BFF]">
                  {currentLiveVerse.reference}
                </span>

                {/* Live indicator */}
                <div className="flex items-center gap-2 text-[10px] text-[#EF4444]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                  <span>LIVE</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{formatSessionTime()}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                <div className="h-2 w-2 rounded-full bg-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-mono">Nothing projected yet</p>
                <p className="text-[10px] text-slate-500 font-sans">Push a verse from Preview</p>

                {/* Queue indicator if available */}
                {queue.length > 0 && (
                  <div className="mt-4 text-[10px] text-slate-400">
                    <span className="text-[#FFD580]">●</span>
                    <span className="ml-2">{queue.length} verse{queue.length > 1 ? 's' : ''} in queue</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  );
};