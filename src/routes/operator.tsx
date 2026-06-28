import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useProjectionStore } from "../store/projectionStore";
import { useOrchestrator } from "../hooks/useOrchestrator";
import QueuePanel from "../components/ai/QueuePanel";
import type { Verse } from "../api/bible";

export const Route = createFileRoute("/operator")({
  head: () => ({
    meta: [
      { title: "D'mentalist — Operator Console" },
      { name: "description", content: "Real-time production control interface." },
    ],
  }),
  component: OperatorConsole,
});

const MODES = ["Scripture", "Music", "Media"] as const;
const TRANSLATIONS = ["KJV", "NIV", "ESV", "NKJV"] as const;

function OperatorConsole() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const queueRef = useRef<HTMLDivElement | null>(null);
  const prevDetectedRef = useRef<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const {
    isListening,
    isProcessing,
    audioLevel,
    transcript,
    detectedVerse,
    error,
    whisperLoaded,
    semanticLoaded,
    sensitivity,
    startListening,
    stopListening,
    pushToProjection,
  } = useOrchestrator();

  const queueList = useProjectionStore((s) => s.queue);
  const queueCount = queueList.length;
  const addToQueue = useProjectionStore((s) => s.addToQueue);
  const projectVerse = useProjectionStore((s) => s.projectVerse);
  const currentVerse = useProjectionStore((s) => s.currentVerse);

  const [mode, setMode] = useState<"Scripture" | "Music" | "Media">("Scripture");
  const [translation, setTranslation] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<any[]>([]);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => channelRef.current?.close();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(e.target as Node)) setShowQueue(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (detectedVerse) {
      const ref = (detectedVerse as any).ref || (detectedVerse as any).reference || "";
      if (ref && ref !== prevDetectedRef.current) {
        prevDetectedRef.current = ref;
        const now = new Date();
        setDetectionHistory((prev) => [
          {
            ref,
            stage: "regex",
            confidence: 92,
            time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
            spokenAs: transcript ? transcript.slice(0, 80) : ref,
          },
          ...prev.slice(0, 49),
        ]);
      }
    }
  }, [detectedVerse, transcript]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const pushToLive = (verse: Verse) => {
    if (!verse) return;
    projectVerse(verse);
    pushToProjection(verse);
    channelRef.current?.postMessage({
      type: "PROJECT_VERSE",
      verse: {
        ...verse,
        timestamp: Date.now(),
        translation: TRANSLATIONS[translation],
      },
    });
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const sessionTime = `${mm}:${ss}`;

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30">

      <header className="h-16 border-b border-[#2D3A5C]/40 bg-[#1A2035]/80 backdrop-blur-md flex items-center justify-between px-3 md:px-6 shadow-lg z-20">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/30 flex items-center justify-center font-bold text-xs md:text-sm text-white shrink-0">
            D
          </div>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-sm tracking-wide text-white">D'mentalist</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">AI SCRIPTURE ENGINE v1.2</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <div className="hidden lg:flex items-center gap-1 text-xs font-mono text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${whisperLoaded ? "bg-emerald-500" : "bg-slate-600"}`} />
            <span>W</span>
            <span className={`h-1.5 w-1.5 rounded-full ${semanticLoaded ? "bg-emerald-500" : "bg-slate-600"}`} />
            <span>M</span>
          </div>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition border ${
              isListening
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.1)]'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
            <span className="hidden sm:inline">{isListening ? 'Mute' : 'Mic'}</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-700 hidden md:block" />

          <div ref={queueRef} className="relative">
            <button
              onClick={() => setShowQueue((v) => !v)}
              className="px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
            >
              Q ({queueCount})
            </button>
            {showQueue && <QueuePanel onClose={() => setShowQueue(false)} />}
          </div>

          <button
            disabled={!detectedVerse}
            onClick={() => detectedVerse && pushToLive(detectedVerse)}
            className="px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md shadow-blue-500/20 hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <span className="hidden sm:inline">Push Live</span>
            <span className="sm:hidden">→</span>
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-3 md:p-6 overflow-y-auto md:overflow-hidden">

        <section className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col gap-4">

          <div className="p-4 rounded-xl bg-[#1A2035]/40 backdrop-blur-md border border-[#2D3A5C]/40 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">Audio Waveform</span>
              <span className="text-[10px] md:text-[11px] font-mono text-slate-500">{sessionTime}</span>
            </div>
            <div className="flex items-end gap-[3px] h-10 px-2 bg-black/30 rounded-lg py-1.5">
              {Array.from({ length: 28 }, (_, i) => {
                const isActive = isListening && audioLevel > 2;
                const liveHeight = isActive
                  ? `${Math.max(15, Math.min(100, audioLevel * (0.3 + 0.7 * ((Math.sin(i * 0.5) + 1) / 2))))}%`
                  : `${6 + (i % 4) * 6}%`;
                return (
                  <div
                    key={i}
                    className="w-full rounded-sm transition-all duration-75"
                    style={{
                      height: liveHeight,
                      background: isActive
                        ? audioLevel > 40
                          ? "#f43f5e"
                          : audioLevel > 15
                            ? "#fbbf24"
                            : "linear-gradient(to top, #4f6bff, #818cf8)"
                        : "#1A2140",
                      boxShadow: isActive ? "0 0 6px rgba(79,107,255,0.3)" : "none",
                    }}
                  />
                );
              })}
            </div>
            {isProcessing && (
              <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400 animate-pulse" style={{ width: "60%" }} />
              </div>
            )}
          </div>

          <div className="flex flex-col min-h-[150px] md:h-[200px] p-4 rounded-xl bg-[#1A2035]/40 backdrop-blur-md border border-[#2D3A5C]/40 shadow-inner">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <h3 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400">Live Audio Capture</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isListening ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {isListening ? 'LISTENING' : 'OFFLINE'}
              </span>
            </div>
            <div ref={transcriptRef} className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed space-y-2 text-slate-300 pr-1 select-text">
              {transcript ? (
                <span className="text-slate-400 opacity-70">{transcript}</span>
              ) : (
                <p className="text-slate-500 italic text-[11px]">
                  {isListening ? "Awaiting detected vocal inputs..." : "Vocal capture hardware unlinked."}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 font-mono">
              {error}
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#1A2035]/20 border border-[#2D3A5C]/20 flex-1 text-[11px] font-mono space-y-2.5 text-slate-400 overflow-y-auto">
            <h4 className="font-semibold uppercase text-[10px] tracking-wider text-slate-500 border-b border-white/5 pb-1 mb-1">Detection Log</h4>
            {detectionHistory.length > 0 ? (
              detectionHistory.map((item, i) => (
                <div key={i} className="p-2 rounded bg-black/30 border-l-2 border-emerald-500/50 space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">{item.ref}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="px-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">Regex</span>
                    {item.confidence}% · {item.time}
                  </div>
                  <div className="text-[10px] text-slate-600 italic truncate">"{item.spokenAs}"</div>
                </div>
              ))
            ) : (
              <p className="text-slate-600 text-center py-4 text-[11px]">No detections yet</p>
            )}
          </div>
        </section>

        <section className="col-span-12 md:col-span-8 lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          <div className="relative rounded-2xl border border-[#2D3A5C] bg-gradient-to-b from-[#1A2035]/30 to-transparent p-4 md:p-8 flex flex-col items-center justify-center min-h-[300px] md:min-h-[450px] shadow-2xl transition-all duration-300 hover:border-blue-500/30">
            <span className="absolute top-3 left-3 md:top-4 md:left-4 text-[10px] font-bold tracking-widest uppercase text-blue-400 px-2 py-1 md:px-2.5 md:py-1 bg-blue-500/10 rounded-md border border-blue-500/20 shadow-sm font-mono">
              Preview
            </span>

            {detectedVerse ? (
              <div className="text-center space-y-4 md:space-y-6 max-w-md animate-fadeIn px-2">
                <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-[#FFD580] font-mono px-2 md:px-3 py-1 bg-[#FFD580]/10 rounded-full border border-[#FFD580]/20">
                  {(detectedVerse as any).reference || (detectedVerse as any).ref} — {TRANSLATIONS[translation]}
                </span>
                <p className="text-lg md:text-2xl font-serif leading-relaxed text-white font-medium drop-shadow-md">
                  "{(detectedVerse as any).text}"
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2 max-w-xs px-2">
                <p className="text-xs text-slate-500 font-mono italic">Awaiting audio or search input string streams...</p>
                <p className="text-[10px] text-slate-600 font-sans">Scripture spoken or typed will display here for operator confirmation before live push.</p>
              </div>
            )}
          </div>

          <div className="relative rounded-2xl border-2 border-red-500/30 bg-black/40 p-4 md:p-8 flex flex-col items-center justify-center min-h-[300px] md:min-h-[450px] shadow-2xl transition-all duration-300">
            <span className="absolute top-3 left-3 md:top-4 md:left-4 text-[10px] font-bold tracking-widest uppercase text-rose-500 px-2 py-1 md:px-2.5 md:py-1 bg-rose-500/10 rounded-md border border-rose-500/20 flex items-center gap-2 shadow-sm font-mono">
              <span className={`h-1.5 w-1.5 rounded-full bg-rose-500 ${currentVerse ? 'animate-ping' : ''}`} />
              <span className="hidden sm:inline">Live</span>
            </span>

            {currentVerse && (
              <button
                onClick={() => {
                  useProjectionStore.getState().clearProjection();
                  channelRef.current?.postMessage({ type: "CLEAR" });
                }}
                className="absolute top-3 right-3 md:top-4 md:right-4 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 transition"
              >
                Clear
              </button>
            )}

            {currentVerse ? (
              <div className="text-center space-y-3 md:space-y-4 max-w-md animate-scaleUp px-2">
                <p className="text-lg md:text-2xl font-serif leading-relaxed text-white font-semibold">
                  {currentVerse.text}
                </p>
                <span className="text-[10px] md:text-xs font-mono text-slate-400 tracking-wider block uppercase font-bold text-blue-400">
                  {currentVerse.reference}
                </span>
              </div>
            ) : (
              <div className="text-center space-y-2 max-w-xs px-2">
                <div className="h-2 w-2 rounded-full bg-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-mono">Stage projection output clear.</p>
                <p className="text-[10px] text-slate-500 font-sans">Use 'Push Live →' in the header to deploy.</p>
              </div>
            )}
          </div>

        </section>
      </main>

      <footer className="h-12 md:h-10 border-t border-[#2D3A5C]/30 bg-[#1A2035]/60 backdrop-blur-sm flex items-center justify-between px-3 md:px-6 shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 md:px-3 py-1 rounded text-[10px] md:text-[11px] font-medium transition ${
                mode === m ? "text-blue-400 bg-blue-500/10" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-[10px] text-slate-600 hidden sm:inline">Translation</span>
          <button
            onClick={() => setTranslation((i) => (i + 1) % TRANSLATIONS.length)}
            className="px-2 py-0.5 rounded text-[10px] md:text-[11px] font-mono text-slate-400 bg-slate-800 border border-slate-700"
          >
            {TRANSLATIONS[translation]}
          </button>
        </div>
      </footer>
    </div>
  );
}
