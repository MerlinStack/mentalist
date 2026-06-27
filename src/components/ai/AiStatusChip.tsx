import { useEffect, useState } from "react";

type ModelState = "idle" | "downloading" | "loaded" | "error";

interface Props {
  isListening?: boolean;
  isProcessing?: boolean;
  audioLevel?: number;
  micMuted?: boolean;
  onToggleMic?: () => void;
}

export default function AiStatusChip({
  isListening = false,
  isProcessing = false,
  audioLevel = 0,
  micMuted = false,
  onToggleMic,
}: Props) {
  const [whisper, setWhisper] = useState<ModelState>("idle");
  const [semantic, setSemantic] = useState<ModelState>("idle");
  const [whisperPct, setWhisperPct] = useState(0);
  const [semanticPct, setSemanticPct] = useState(0);

  useEffect(() => {
    const u1 = listenWorkerProgress("whisper", (s, p) => { setWhisper(s); setWhisperPct(p); });
    const u2 = listenWorkerProgress("semantic", (s, p) => { setSemantic(s); setSemanticPct(p); });
    return () => { u1(); u2(); };
  }, []);

  const anyLoading = whisper === "downloading" || semantic === "downloading";
  const allLoaded = whisper === "loaded" && semantic === "loaded";

  const isReady = allLoaded && !anyLoading;
  const isActive = isReady && isListening;
  const isDetecting = isReady && isProcessing;

  const dotColor = isDetecting ? "#C9973A" : isActive ? "#10B981" : isReady ? "#475569" : "#475569";
  const badgeBg = isDetecting ? "rgba(201,151,58,0.08)" : isActive ? "rgba(16,185,129,0.08)" : isReady ? "rgba(100,116,139,0.08)" : "transparent";
  const badgeBorder = isDetecting ? "rgba(201,151,58,0.3)" : isActive ? "rgba(16,185,129,0.3)" : isReady ? "rgba(100,116,139,0.2)" : "transparent";
  const badgeColor = isDetecting ? "#C9973A" : isActive ? "#10B981" : isReady ? "#64748B" : "#64748B";
  const label = isDetecting ? "Detecting..." : isActive ? "Listening" : isReady ? "AI Idle" : "";

  const modelsErrored = whisper === "error" || semantic === "error";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {onToggleMic && (
        <button
          onClick={onToggleMic}
          title={micMuted ? "Unmute mic" : isListening ? "Mic active" : "Mic idle"}
          style={{
            position: "relative",
            width: 20, height: 20, borderRadius: 3,
            display: "grid", placeItems: "center",
            border: `1px solid ${
              micMuted ? "rgba(239,68,68,0.4)" : isListening ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"
            }`,
            background: micMuted ? "rgba(239,68,68,0.1)" : isListening ? "rgba(16,185,129,0.1)" : "transparent",
            color: micMuted ? "#EF4444" : isListening ? "#10B981" : "#64748B",
            cursor: "pointer",
          }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <rect x="3" y="0" width="4" height="7" rx="2" fill="currentColor" />
            <path d="M1 5.5a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="1.2" fill="none" />
            {micMuted && <line x1="1" y1="1" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
          </svg>
          {isListening && !micMuted && (
            <span style={{
              position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
              height: 2, borderRadius: 1, transition: "all 0.1s",
              width: `${Math.max(4, (audioLevel / 100) * 14)}px`,
              background: audioLevel > 60 ? "#EF4444" : audioLevel > 30 ? "#F59E0B" : "#10B981",
            }} />
          )}
        </button>
      )}

      {anyLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div style={{ width: 48, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: "#C9973A", transition: "width 0.3s", width: `${whisperPct || semanticPct}%` }} />
          </div>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>
            {Math.round(whisperPct || semanticPct)}%
          </span>
        </div>
      )}

      {modelsErrored && (
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: "#EF4444" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
          AI Offline
        </span>
      )}

      {isReady && !anyLoading && !modelsErrored && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500,
          background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: dotColor,
            animation: (isActive || isDetecting) ? "pulse-green 1.2s infinite" : "none",
          }} />
          {label}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-green { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
      `}</style>
    </div>
  );
}

type Listener = (state: ModelState, pct: number) => void;

function listenWorkerProgress(name: string, cb: Listener): () => void {
  const channel = new BroadcastChannel(`dmentalist-model-${name}`);
  channel.onmessage = (ev) => {
    const { status, loaded, total } = ev.data;
    if (status === "progress") {
      cb("downloading", total > 0 ? (loaded / total) * 100 : 0);
    } else if (status === "done") {
      cb("loaded", 100);
    } else if (status === "error") {
      cb("error", 0);
    }
  };
  return () => channel.close();
}
