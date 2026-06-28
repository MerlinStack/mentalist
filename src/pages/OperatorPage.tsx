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

          {/* Mode Tabs */}
          <div className="ml-6 flex items-center gap-1 border-l border-[#2D3A5C]/40 pl-6">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-[11px] font-medium transition ${
                  mode === m
                    ? 'text-[#C9973A] bg-[#C9973A]/10 border border-[#C9973A]/20'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                {m}
              </button>
            ))}
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

          {/* AiStatusChip popover */}
          <div className="relative group">
            <span className="text-[10px] text-slate-500 font-mono cursor-help border-b border-dotted border-slate-600">
              models
            </span>
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50">
              <AiStatusChip />
            </div>
          </div>

          {/* Queue count badge */}
          {queue.length > 0 && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
              Queue · <span className="font-bold">{queue.length}</span>
            </span>
          )}

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

        {/* RIGHT PANEL — mode-conditional content */}
        <section className="col-span-9 h-full">

          {mode === "Scripture" ? (
            <div className="flex gap-6 h-full">

              <div className="flex-1 grid grid-cols-2 gap-6 h-full min-w-0">

              {/* PREVIEW PANEL */}
              <div className="relative rounded-2xl border border-[#2D3A5C] bg-[#1A2035]/30 backdrop-blur-xl flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all duration-300 hover:border-[#C9973A]/30">
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
                        className="px-3 py-1 text-[10px] font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded-lg shadow-md shadow-[#C9973A]/20 hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        Transmit Live &rarr;
                      </button>
                    </>
                  }
                />
              </div>

              {/* LIVE PANEL */}
              <div className="relative rounded-2xl border-2 border-[#EF4444]/30 bg-[#0A0F1E]/60 backdrop-blur-xl flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.37)] transition-all duration-300">
                <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${currentLiveVerse ? 'bg-[#EF4444] animate-ping' : 'bg-slate-600'}`} />
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

              {/* QUEUE BOARD */}
              <div className="w-52 shrink-0 relative rounded-2xl border border-[#2D3A5C]/40 bg-[#1A2035]/20 backdrop-blur-xl flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.37)] overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
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
                            className="px-2 py-1 text-[9px] font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded shadow-md shadow-[#C9973A]/20 hover:brightness-110 transition"
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
                      className="w-full py-2 text-[10px] font-semibold bg-gradient-to-r from-[#C9973A] to-[#FFD580] text-[#080D1C] rounded-lg shadow-md shadow-[#C9973A]/20 hover:brightness-110 transition"
                    >
                      Project Next &rarr;
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : mode === "Music" ? (
            <div className="h-full rounded-2xl border border-[#2D3A5C]/40 bg-[#1A2035]/20 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
              <div className="text-5xl mb-4 opacity-30">🎵</div>
              <h2 className="text-lg font-semibold text-slate-300 mb-2">Music Mode</h2>
              <p className="text-xs text-slate-500 max-w-md">
                Queue and display song lyrics, chord charts, and worship media.
                Connect your CCLI or song library to get started.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                Coming Soon
              </div>
            </div>
          ) : (
            <div className="h-full rounded-2xl border border-[#2D3A5C]/40 bg-[#1A2035]/20 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
              <div className="text-5xl mb-4 opacity-30">📺</div>
              <h2 className="text-lg font-semibold text-slate-300 mb-2">Media Mode</h2>
              <p className="text-xs text-slate-500 max-w-md">
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