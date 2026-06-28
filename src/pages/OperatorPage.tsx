import { useEffect, useRef, useState } from 'react';
import { useSoundStore } from '../store/soundStore';
import { useScriptureStore } from '../store/scriptureStore';
import { useProjection } from '../hooks/useProjection';
import { useProjectionStore } from '../store/projectionStore';
import { useSoundMode } from '../hooks/useSoundMode';

import { useOrchestrator } from '../hooks/useOrchestrator';
import AiStatusChip from '../components/ai/AiStatusChip';
import VersePanel from '../components/verse/VersePanel';
import { getChapter } from '../api/bible';
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
  const utteranceRef = useRef<(text: string) => void>();
  const { startListening, stopListening } = useSoundMode({ utteranceRef });
  const { 
    projectVerse, 
    clearProjection, 
    currentVerse: currentLiveVerse,
  } = useProjection();

  const queue = useProjectionStore((s) => s.queue);
  const addToQueue = useProjectionStore((s) => s.addToQueue);
  const removeFromQueue = useProjectionStore((s) => s.removeFromQueue);

  // AI pipeline from second image
  const {
    isProcessing,
    audioLevel,
    detectedVerse,
    whisperLoaded,
    semanticLoaded,
    pushToProjection,
    searchUtterance,
  } = useOrchestrator();

  // Wire semantic fallback: when Web Speech API hears speech with no explicit
  // reference, the orchestrator's regex+semantic pipeline tries to identify it.
  utteranceRef.current = searchUtterance;

  // State from second image
  const [mode, setMode] = useState<(typeof MODES)[number]>("Scripture");
  const [translation, setTranslation] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [previewVerse, setPreviewVerse] = useState<Verse | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DetectionEntry[]>([]);
  const prevDetectedRef = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // Chapter cache for sequential navigation
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);
  const chapterBookRef = useRef<string | null>(null);
  const chapterNumRef = useRef<number | null>(null);

  const navigateVerse = (dir: 'prev' | 'next') => {
    if (chapterVerses.length === 0) return;
    setPreviewIdx((i) => {
      if (dir === 'next') return (i + 1) % chapterVerses.length;
      return i === 0 ? chapterVerses.length - 1 : i - 1;
    });
  };

  // Load chapter when a verse is set on the preview
  useEffect(() => {
    const src = previewVerse || activeVerse || detectedVerse;
    if (!src) return;
    const book = src.book || '';
    const ch = src.chapter || 0;
    if (!book || !ch || (book === chapterBookRef.current && ch === chapterNumRef.current)) return;
    chapterBookRef.current = book;
    chapterNumRef.current = ch;
    getChapter(book, ch, 'kjv').then((verses) => {
      if (verses.length > 0) {
        setChapterVerses(verses);
        const idx = verses.findIndex((v) => v.verse === src.verse);
        setPreviewIdx(idx >= 0 ? idx : 0);
      }
    });
  }, [previewVerse, activeVerse, detectedVerse]);

  // Auto-scroll transcript when new speech arrives
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, recentChunk]);

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

  const handlePushLive = () => {
    const verse = chapterVerses[previewIdx] || previewVerse || activeVerse || detectedVerse;
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
    <div className="min-h-screen text-slate-100 flex flex-col font-sans antialiased selection:bg-[#C9973A]/30">

      {/* Ambient floating orbs */}
      <FloatingOrbs />

      {/* HEADER — deep frosted navigation */}
      <header className="h-16 border-b border-white/[0.04] flex items-center justify-between px-6 shadow-lg z-20"
        style={{ background: 'rgba(10, 15, 30, 0.5)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#C9973A] to-[#FFD580] shadow-lg shadow-[#C9973A]/20 flex items-center justify-center font-bold text-sm text-[#080D1C]">
            D
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-wide text-white">D'mentalist</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">AI SCRIPTURE ENGINE v1.2</p>
          </div>

          {/* Mode Tabs — glass segmented control */}
          <div className="ml-6 flex items-center gap-1 border-l border-[#2D3A5C]/40 pl-6">
            <div className="flex rounded-lg bg-[#1A2035]/40 backdrop-blur-md border border-white/[0.04] p-0.5">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                    mode === m
                      ? 'text-[#C9973A] bg-[#C9973A]/12 shadow-sm border border-[#C9973A]/20'
                      : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Status — glowing indicators */}
          <div className="flex items-center gap-3 bg-[#1A2035]/20 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/[0.03]">
            <span className={`text-[10px] font-mono flex items-center gap-1.5 ${whisperLoaded ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${whisperLoaded ? 'bg-emerald-500' : 'bg-slate-600'}`}
                style={whisperLoaded ? { filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))' } : {}} />
              WHISPER {whisperLoaded ? '✓' : '⟳'}
            </span>
            <span className={`text-[10px] font-mono flex items-center gap-1.5 ${semanticLoaded ? 'text-indigo-400' : 'text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${semanticLoaded ? 'bg-indigo-400' : 'bg-slate-600'}`}
                style={semanticLoaded ? { filter: 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.6))' } : {}} />
              MINILM {semanticLoaded ? '✓' : '⟳'}
            </span>
          </div>

          {/* AiStatusChip popover */}
          <div className="relative group">
            <span className="text-[10px] text-slate-500 font-mono cursor-help border-b border-dotted border-slate-500/60 hover:text-slate-300 transition-colors">
              models
            </span>
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 animate-fadeIn">
              <AiStatusChip />
            </div>
          </div>

          {/* Queue count badge — glowing */}
          {queue.length > 0 && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30"
              style={{ boxShadow: '0 0 12px rgba(245, 158, 11, 0.1)' }}>
              Queue · <span className="font-bold">{queue.length}</span>
            </span>
          )}

          {/* Mic Toggle — glowing when active */}
          <button
            onClick={handleToggleMic}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
              isListening
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600'
            }`}
            style={isListening ? { boxShadow: '0 0 16px rgba(244, 63, 94, 0.15)' } : {}}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`}
              style={isListening ? { filter: 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.8))' } : {}} />
            {isListening ? 'Mute Console' : 'Activate Live Mic'}
          </button>

          <div className="h-4 w-[1px] bg-slate-700" />

          {/* Push Live Button — glowing when enabled */}
          <button
            disabled={!displayVerse}
            onClick={handlePushLive}
            className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded-lg transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none hover:scale-[1.02] active:scale-[0.98]"
            style={displayVerse ? { boxShadow: '0 0 20px rgba(201, 151, 58, 0.25), 0 4px 12px rgba(201, 151, 58, 0.15)' } : {}}
          >
            Push Live →
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-6 p-6 h-[calc(100vh-4rem)] overflow-hidden">

        {/* LEFT PANEL - Enhanced with AI features */}
        <section className="col-span-3 flex flex-col gap-4 h-full">

          {/* Live Transcript with Waveform and AI detection — premium glass */}
          <div className="glass-premium flex flex-col h-[280px] p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-400/80 to-emerald-600/20" />
                <h3 className="text-cinema-label">Live Transcript</h3>
                <span className="text-[10px] font-mono text-slate-500/70">{formatSessionTime()}</span>
              </div>
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <span className="text-[9px] text-amber-400 animate-pulse font-mono">PROCESSING</span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-all ${
                  isListening
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800/50 text-slate-500 border border-white/[0.04]'
                }`}
                  style={isListening ? { filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.25))' } : {}}>
                  {isListening ? 'LISTENING' : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Waveform Visualization — neon pink-to-emerald */}
            <div className={`h-12 mb-3 flex items-end gap-0.5 ${isListening ? 'animate-neon-wave' : ''}`}>
              {(() => {
                const raw = audioLevel > 1 ? audioLevel / 100 : audioLevel;
                const time = Date.now() / 200;
                return Array.from({ length: 50 }, (_, i) => {
                  const isActive = isListening && raw > 0.01;
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
                    if (intensity > 0.7) return `hsl(160, 80%, ${45 + intensity * 25}%)`;
                    if (intensity > 0.4) return `hsl(330, 85%, ${45 + intensity * 20}%)`;
                    return `hsl(340, 80%, ${35 + intensity * 30}%)`;
                  };
                  const barGlow = isActive ? `0 0 ${8 + height * 0.08}px ${getColor()}` : 'none';

                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all duration-75"
                      style={{
                        height: `${height}%`,
                        background: getColor(),
                        minHeight: '2px',
                        opacity: isActive ? 0.7 + (height / 100) * 0.3 : 0.3,
                        boxShadow: barGlow,
                      }}
                    />
                  );
                });
              })()}
            </div>

            {/* Transcript Text */}
            <div ref={transcriptRef} className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed space-y-2 text-slate-300 pr-1 select-text min-h-0">
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

          {/* Engine Infrastructure — premium glass */}
          <div className="glass-premium rounded-xl p-4 flex-1 text-[11px] font-mono space-y-2.5 text-slate-400 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-2 border-b border-white/[0.04] pb-2 mb-2">
              <div className="w-1 h-3 rounded-full bg-gradient-to-b from-[#C9973A] to-[#C9973A]/30" />
              <h4 className="text-cinema-label">Engine Infrastructure</h4>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Whisper ASR</span> 
              <span className={`flex items-center gap-1.5 ${whisperLoaded ? "text-emerald-400" : "text-slate-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${whisperLoaded ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  style={whisperLoaded ? { filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))' } : {}} />
                {whisperLoaded ? 'Connected' : 'Loading'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Embedder</span> 
              <span className={`flex items-center gap-1.5 ${semanticLoaded ? "text-indigo-400" : "text-slate-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${semanticLoaded ? 'bg-indigo-400' : 'bg-slate-600'}`}
                  style={semanticLoaded ? { filter: 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.6))' } : {}} />
                {semanticLoaded ? 'Vector Ready' : 'Loading'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Core</span> 
              <span className="text-indigo-400/80">React 19 + TS 5.8</span>
            </div>
            
            {/* Session Timer */}
            <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] mt-2">
              <span className="text-slate-500">Session</span>
              <span className="text-slate-300 font-semibold">{formatSessionTime()}</span>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL — mode-conditional content */}
        <section className="col-span-9 h-full">

          {mode === "Scripture" ? (
            <div className="flex gap-6 h-full">

              <div className="flex-1 grid grid-cols-2 gap-6 h-full min-w-0">

              {/* PREVIEW PANEL — premium glass with gold hover glow */}
              <div className="glass-premium rounded-2xl flex flex-col transition-all duration-300 hover:border-[#C9973A]/30"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <VersePanel
                  kind="preview"
                  verse={chapterVerses[previewIdx] || displayVerse}
                  nextRef={
                    chapterVerses.length > 0 && previewIdx + 1 < chapterVerses.length
                      ? chapterVerses[previewIdx + 1].reference
                      : queue.length > 0
                        ? queue[0].reference
                        : null
                  }
                  translation={TRANSLATIONS[translation]}
                  actions={
                    <>
                      <button
                        onClick={() => navigateVerse('prev')}
                        className="text-[10px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 transition"
                      >
                        &larr; Prev
                      </button>
                      <button
                        onClick={() => {
                          const v = chapterVerses[previewIdx] || displayVerse;
                          if (v) addToQueue(v);
                          navigateVerse('next');
                        }}
                        className="text-[10px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 transition"
                      >
                        Next &rarr;
                      </button>
                      <div className="h-4 w-px bg-white/10" />
                      <button
                        onClick={handlePushLive}
                        disabled={!displayVerse}
                        className="px-3 py-1 text-[10px] font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded-lg shadow-md shadow-[#C9973A]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
                      >
                        Transmit Live &rarr;
                      </button>
                    </>
                  }
                />
              </div>

              {/* LIVE PANEL — premium glass with red glow border */}
              <div className="glass-premium rounded-2xl flex flex-col transition-all duration-300"
                style={{
                  border: '2px solid rgba(239, 68, 68, 0.25)',
                  boxShadow: currentLiveVerse
                    ? '0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(239, 68, 68, 0.08), inset 0 1px 0 rgba(255,255,255,0.03)'
                    : '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}>
                <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${currentLiveVerse ? 'bg-[#EF4444] animate-ping' : 'bg-slate-600'}`}
                      style={currentLiveVerse ? { filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' } : {}} />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#EF4444]">Live Projector Feed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentLiveVerse && (
                      <button onClick={clearProjection} className="text-[10px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 transition">Clear</button>
                    )}
                    <button onClick={openProjector} className="text-[10px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 transition flex items-center gap-1"><span>Project</span><span className="text-[8px]">↗</span></button>
                  </div>
                </div>
                <VersePanel
                  kind="live"
                  verse={currentLiveVerse}
                  translation={TRANSLATIONS[translation]}
                />
                {currentLiveVerse && (
                  <div className="flex items-center justify-center gap-2 text-[10px] text-[#EF4444] pb-4 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                    <span>LIVE</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">{formatSessionTime()}</span>
                  </div>
                )}
                {!currentLiveVerse && queue.length > 0 && (
                  <div className="text-center text-[10px] text-slate-400 pb-4 shrink-0">
                    <span className="text-[#FFD580]">●</span>
                    <span className="ml-1">{queue.length} verse{queue.length > 1 ? 's' : ''} in queue</span>
                  </div>
                )}
              </div>

              </div>

              {/* QUEUE BOARD — premium glass */}
              <div className="glass-premium w-52 shrink-0 relative rounded-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 rounded-full bg-gradient-to-b from-[#FFD580] to-[#C9973A]/30" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#FFD580]">Queue</span>
                    {queue.length > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">
                        {queue.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
                  {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-[11px] text-slate-500 italic">Queue is empty</p>
                      <p className="text-[9px] text-slate-600 mt-1">Stage verses from Preview to build your queue</p>
                    </div>
                  ) : (
                    queue.map((v, i) => (
                      <div key={`${v.reference || v.ref}-${i}`} className="flex items-start gap-3 p-2.5 rounded-lg bg-[#1A2035]/40 border border-[#2D3A5C]/20">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-semibold text-[#C9973A] block truncate">
                            {v.reference || v.ref}
                          </span>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">
                            {v.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            onClick={() => {
                              projectVerse(v);
                              removeFromQueue(i);
                            }}
                            className="px-2 py-1 text-[9px] font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded shadow-md shadow-[#C9973A]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                          >
                            Live
                          </button>
                          <button
                            onClick={() => removeFromQueue(i)}
                            className="px-1.5 py-1 text-[9px] text-slate-500 hover:text-white bg-slate-800/50 border border-slate-700/50 rounded transition"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {queue.length > 0 && (
                  <div className="px-5 pb-4 shrink-0">
                    <button
                      onClick={() => {
                        projectVerse(queue[0]);
                        removeFromQueue(0);
                      }}
                      className="w-full py-2 text-[10px] font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded-lg shadow-md shadow-[#C9973A]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      Project Next &rarr;
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : mode === "Music" ? (
            <div className="glass-premium h-full rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4 opacity-20">🎵</div>
              <h2 className="text-lg font-semibold text-slate-300 mb-2 tracking-wide">Music Mode</h2>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Queue and display song lyrics, chord charts, and worship media.
                Connect your CCLI or song library to get started.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                Coming Soon
              </div>
            </div>
          ) : (
            <div className="glass-premium h-full rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4 opacity-20">📺</div>
              <h2 className="text-lg font-semibold text-slate-300 mb-2 tracking-wide">Media Mode</h2>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Play video backgrounds, sermon slides, and presentation media
                alongside your scripture projection feed.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                Coming Soon
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
};