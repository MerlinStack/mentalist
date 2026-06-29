import { useEffect, useRef, useState } from "react";
import { useSoundStore, type TranscriptSegment } from "../store/soundStore";
import { useScriptureStore } from "../store/scriptureStore";
import { useProjection } from "../hooks/useProjection";
import { useProjectionStore } from "../store/projectionStore";
import { useSoundMode } from "../hooks/useSoundMode";

import { useOrchestrator } from "../hooks/useOrchestrator";
import { usePresentationController } from "../hooks/usePresentationController";
import AiStatusChip from "../components/ai/AiStatusChip";
import VersePanel from "../components/verse/VersePanel";
import type { Verse } from "../api/bible";
import { lookupEngine } from "../services/scriptureLookup";
import { MATCH_RANGE_OPTIONS } from "../utils/distance";
import type { MatchRange } from "../utils/distance";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Drawer from "@mui/material/Drawer";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import { CinemaLabel, CinemaReference, GlassPaper } from "../components/styled";

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
    <Box sx={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <Box
        sx={{
          position: "absolute",
          top: "5%",
          left: "10%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          opacity: 0.08,
          filter: "blur(96px)",
          background: "radial-gradient(circle, #C9973A 0%, transparent 70%)",
          animation: "float 22s ease-in-out infinite",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          opacity: 0.06,
          filter: "blur(96px)",
          background: "radial-gradient(circle, #4F6BFF 0%, transparent 70%)",
          animation: "float 28s ease-in-out infinite reverse",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          right: "40%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          opacity: 0.04,
          filter: "blur(96px)",
          background: "radial-gradient(circle, #10B981 0%, transparent 70%)",
          animation: "float 18s ease-in-out infinite 5s",
        }}
      />
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
      `}</style>
    </Box>
  );
}

export const OperatorPage: React.FC = () => {
  const {
    transcript,
    recentChunk,
    isListening,
    matchRange,
    setMatchRange,
    transcriptHistory,
    transcriptView,
    setTranscriptView,
  } = useSoundStore();
  const { results: searchResults, relatedReferences } = useScriptureStore();
  const { activeVerse } = useScriptureStore();
  const utteranceRef = useRef<(text: string) => void>(undefined);
  const { startListening, stopListening } = useSoundMode({ utteranceRef });
  const { projectVerse, clearProjection, currentVerse: currentLiveVerse } = useProjection();

  const queue = useProjectionStore((s) => s.queue);
  const addToQueue = useProjectionStore((s) => s.addToQueue);
  const setQueue = useProjectionStore((s) => s.setQueue);
  const removeFromQueue = useProjectionStore((s) => s.removeFromQueue);

  const {
    isProcessing,
    audioLevel,
    detectedVerse,
    whisperLoaded,
    semanticLoaded,
    pushToProjection,
    searchUtterance,
    searchPreview,
    searchReferences,
    findRelated,
    frequencyData,
  } = useOrchestrator();

  utteranceRef.current = searchUtterance;

  const [mode, setMode] = useState<(typeof MODES)[number]>("Scripture");
  const [translation, setTranslation] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [previewVerse, setPreviewVerse] = useState<Verse | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DetectionEntry[]>([]);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [selectedSearchRef, setSelectedSearchRef] = useState<string | null>(null);
  const prevDetectedRef = useRef<string | null>(null);
  const { launchProjection, isActive: isProjectorConnected, sendMessage } = usePresentationController("/projection");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const chapterBookRef = useRef<string | null>(null);
  const chapterNumRef = useRef<number | null>(null);

  const navigateVerse = (dir: "prev" | "next") => {
    if (chapterVerses.length === 0) return;
    setPreviewIdx((i) => {
      if (dir === "next") return (i + 1) % chapterVerses.length;
      return i === 0 ? chapterVerses.length - 1 : i - 1;
    });
  };

  useEffect(() => {
    const src = previewVerse || activeVerse || detectedVerse;
    if (!src) return;
    const book = src.book || "";
    const ch = src.chapter || 0;
    if (!book || !ch || (book === chapterBookRef.current && ch === chapterNumRef.current)) return;
    chapterBookRef.current = book;
    chapterNumRef.current = ch;
    const verses = lookupEngine.getChapter(book, ch);
    if (verses.length > 0) {
      setChapterVerses(
        verses.map((v) => ({
          reference: `${v.b} ${v.c}:${v.v}`,
          text: v.t,
          book: v.b,
          chapter: v.c,
          verse: v.v,
          translation: "KJV",
        })),
      );
      const idx = verses.findIndex((v) => v.v === src.verse);
      setPreviewIdx(idx >= 0 ? idx : 0);
    }
  }, [previewVerse, activeVerse, detectedVerse]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript, recentChunk]);

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

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => channelRef.current?.close();
  }, []);

  useEffect(() => {
    if (currentLiveVerse) {
      sendMessage({ type: "PROJECT_VERSE", verse: currentLiveVerse });
    }
  }, [currentLiveVerse, sendMessage]);

  const prevVerseRef = useRef<string | null>(null);
  useEffect(() => {
    const verse = currentLiveVerse;
    if (!verse) return;
    const ref = verse.ref || verse.reference || "";
    if (!ref || ref === prevVerseRef.current) return;
    prevVerseRef.current = ref;
    const book = verse.book;
    const chapter = verse.chapter;
    const verseNum = verse.verse;
    if (!book || !chapter || !verseNum) return;
    const all = lookupEngine.getChapter(book, chapter);
    if (!all || all.length === 0) return;
    const remaining = all
      .filter((v) => v.v > verseNum)
      .map((v) => ({
        reference: `${v.b} ${v.c}:${v.v}`,
        ref: `${v.b} ${v.c}:${v.v}`,
        text: v.t,
        book: v.b,
        chapter: v.c,
        verse: v.v,
        translation: "KJV",
      }));
    setQueue(remaining);
  }, [currentLiveVerse, setQueue]);

  const handlePushLive = () => {
    const verse = chapterVerses[previewIdx] || previewVerse || activeVerse || detectedVerse;
    if (verse) {
      projectVerse(verse);
      pushToProjection(verse);
      channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse });
      try { localStorage.setItem("mentalist_projection_verse", JSON.stringify(verse)); } catch {}
      sendMessage({ type: "PROJECT_VERSE", verse });
    }
  };

  const handleToggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const formatSessionTime = () =>
    `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const openProjector = () => {
    window.open("/projection", "_blank");
    if (currentLiveVerse)
      channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse: currentLiveVerse });
  };

  const handleClearLive = () => {
    clearProjection();
    channelRef.current?.postMessage({ type: "CLEAR_PROJECTION" });
  };

  const displayVerse = previewVerse || activeVerse;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        position: "relative",
      }}
    >
      <FloatingOrbs />

      {/* HEADER */}
      <Paper
        elevation={3}
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 1.5, md: 3 },
          borderRadius: 0,
          bgcolor: "rgba(10, 15, 30, 0.5)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          zIndex: 20,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 } }}>
          <Box
            sx={{
              width: { xs: 28, md: 32 },
              height: { xs: 28, md: 32 },
              borderRadius: 1.5,
              background: "linear-gradient(135deg, #C9973A, #FFD580)",
              boxShadow: "0 4px 12px rgba(201,151,58,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: { xs: 10, md: 12 },
              color: "#080D1C",
              flexShrink: 0,
            }}
          >
            D
          </Box>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>D'mentalist</Typography>
            <Typography
              sx={{
                fontSize: 9,
                color: "text.disabled",
                fontFamily: "'JetBrains Mono Variable', monospace",
              }}
            >
              AI SCRIPTURE ENGINE v1.2
            </Typography>
          </Box>

          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            sx={{
              display: { xs: "none", md: "inline-flex" },
              ml: 1,
              pl: 2,
              borderLeft: "1px solid rgba(45,58,92,0.4)",
              "& .MuiToggleButton-root": {
                px: 1.5,
                py: 0.5,
                fontSize: 10,
                fontWeight: 500,
                borderColor: "transparent",
                color: "#64748B",
                "&.Mui-selected": {
                  bgcolor: "rgba(201,151,58,0.12)",
                  color: "#C9973A",
                  borderColor: "rgba(201,151,58,0.2)",
                },
              },
            }}
          >
            {MODES.map((m) => (
              <ToggleButton key={m} value={m}>
                {m}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, md: 1.5 } }}>
          {/* Match Range */}
          <Paper
            variant="outlined"
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              bgcolor: "rgba(26,32,53,0.2)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255,255,255,0.03)",
            }}
          >
            {MATCH_RANGE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                size="small"
                onClick={() => setMatchRange(opt.value as MatchRange)}
                title={opt.description}
                sx={{
                  height: 20,
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  bgcolor: matchRange === opt.value ? "rgba(201,151,58,0.12)" : "transparent",
                  color: matchRange === opt.value ? "#C9973A" : "#64748B",
                  "&:hover": { color: matchRange === opt.value ? "#C9973A" : "#CBD5E1" },
                }}
              />
            ))}
          </Paper>

          {/* AI Status */}
          <Paper
            variant="outlined"
            sx={{
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              gap: 1.5,
              px: 1.5,
              py: 0.75,
              bgcolor: "rgba(26,32,53,0.2)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255,255,255,0.03)",
            }}
          >
            <Chip
              icon={
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: whisperLoaded ? "#10B981" : "#475569",
                    filter: whisperLoaded ? "drop-shadow(0 0 6px rgba(16,185,129,0.6))" : "none",
                  }}
                />
              }
              label={`WHISPER ${whisperLoaded ? "✓" : "⟳"}`}
              size="small"
              sx={{
                height: 20,
                fontSize: 9,
                fontFamily: "'JetBrains Mono Variable', monospace",
                bgcolor: "transparent",
                color: whisperLoaded ? "#34D399" : "#64748B",
              }}
            />
            <Chip
              icon={
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: semanticLoaded ? "#818CF8" : "#475569",
                    filter: semanticLoaded ? "drop-shadow(0 0 6px rgba(129,140,248,0.6))" : "none",
                  }}
                />
              }
              label={`MINILM ${semanticLoaded ? "✓" : "⟳"}`}
              size="small"
              sx={{
                height: 20,
                fontSize: 9,
                fontFamily: "'JetBrains Mono Variable', monospace",
                bgcolor: "transparent",
                color: semanticLoaded ? "#818CF8" : "#64748B",
              }}
            />
          </Paper>

          <Tooltip title="Model status">
            <Typography
              sx={{
                display: { xs: "none", lg: "inline-flex" },
                fontSize: 9,
                color: "text.disabled",
                fontFamily: "'JetBrains Mono Variable', monospace",
                cursor: "help",
                borderBottom: "1px dotted",
                borderColor: "rgba(100,116,139,0.6)",
                "&:hover": { color: "#CBD5E1" },
                transition: "color 0.15s",
              }}
            >
              models
            </Typography>
          </Tooltip>
          <Box
            sx={{
              display: { xs: "none", lg: "block" },
              position: "relative",
              "&:hover > .MuiPaper-root": { display: "block" },
            }}
          >
            <Box
              className="MuiPaper-root"
              sx={{
                display: "none",
                position: "absolute",
                top: "100%",
                right: 0,
                mt: 1,
                zIndex: 50,
              }}
            >
              <AiStatusChip />
            </Box>
          </Box>

          {queue.length > 0 && (
            <Button
              size="small"
              onClick={() => setQueueDrawerOpen(!queueDrawerOpen)}
              sx={{
                display: { lg: "none" },
                fontSize: 9,
                fontFamily: "'JetBrains Mono Variable', monospace",
                color: "#FBBF24",
                bgcolor: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                "&:hover": { bgcolor: "rgba(245,158,11,0.15)" },
              }}
            >
              Queue ·{" "}
              <Box component="span" sx={{ fontWeight: 700, ml: 0.25 }}>
                {queue.length}
              </Box>
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            onClick={launchProjection}
            sx={{
              fontSize: { xs: 9, md: 10 },
              px: 2,
              borderColor: isProjectorConnected ? "rgba(16,185,129,0.3)" : "rgba(201,151,58,0.3)",
              color: isProjectorConnected ? "#34D399" : "#C9973A",
              bgcolor: "rgba(26,32,53,0.4)",
              "&:hover": {
                bgcolor: "rgba(201,151,58,0.08)",
                borderColor: "#C9973A",
              },
            }}
          >
            {isProjectorConnected ? "Display Linked" : "Launch Projector"}
          </Button>

          <Button
            size="small"
            variant={isListening ? "outlined" : "contained"}
            onClick={handleToggleMic}
            startIcon={
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: isListening ? "#F43F5E" : "#64748B",
                  animation: isListening ? "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" : "none",
                  filter: isListening ? "drop-shadow(0 0 6px rgba(244,63,94,0.8))" : "none",
                }}
              />
            }
            sx={{
              fontSize: { xs: 9, md: 11 },
              px: { xs: 1, md: 1.5 },
              borderColor: isListening ? "rgba(244,63,94,0.3)" : "rgba(51,65,85,0.5)",
              color: isListening ? "#FB7185" : "#CBD5E1",
              bgcolor: isListening ? "rgba(244,63,94,0.1)" : "rgba(30,41,59,0.5)",
              "&:hover": isListening
                ? { bgcolor: "rgba(244,63,94,0.15)" }
                : { bgcolor: "rgba(51,65,85,0.5)" },
              boxShadow: isListening ? "0 0 16px rgba(244,63,94,0.15)" : "none",
              ".MuiButton-startIcon": { mr: { xs: 0.5, md: 0.75 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
              {isListening ? "Mute" : "Mic"}
            </Box>
          </Button>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderColor: "rgba(51,65,85,1)", display: { xs: "none", md: "block" } }}
          />

          <Button
            variant="contained"
            disabled={!displayVerse}
            onClick={handlePushLive}
            sx={{
              fontSize: { xs: 9, md: 11 },
              px: { xs: 1.5, md: 2 },
              background: "linear-gradient(135deg, #C9973A, #FFD580)",
              boxShadow: displayVerse
                ? "0 0 20px rgba(201,151,58,0.25), 0 4px 12px rgba(201,151,58,0.15)"
                : "none",
              "&:hover:not(:disabled)": {
                background: "linear-gradient(135deg, #C9973A, #FFD580)",
                transform: "scale(1.02)",
              },
              "&:active:not(:disabled)": { transform: "scale(0.98)" },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Push Live
            </Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
              →
            </Box>
          </Button>
        </Box>
      </Paper>

      {/* MAIN */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" },
          gap: { xs: 2, md: 3 },
          p: { xs: 1.5, md: 3 },
          overflowY: "auto",
          overflow: { md: "hidden" },
        }}
      >
        {/* LEFT */}
        <Box
          sx={{
            gridColumn: { xs: "span 12", md: "span 4", lg: "span 3" },
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Live Transcript */}
          <GlassPaper
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: 200,
              height: { md: 280 },
              p: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.5,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                pb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 4,
                    height: 16,
                    borderRadius: 1,
                    background:
                      "linear-gradient(180deg, rgba(52,211,153,0.8) 0%, rgba(52,211,153,0.2) 100%)",
                  }}
                />
                <CinemaLabel>Live Transcript</CinemaLabel>
                <Typography
                  sx={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: "rgba(100,116,139,0.7)",
                  }}
                >
                  {formatSessionTime()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isProcessing && (
                  <Chip
                    label="PROCESSING"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 8,
                      fontFamily: "'JetBrains Mono Variable', monospace",
                      bgcolor: "transparent",
                      color: "#FBBF24",
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}
                <Chip
                  label={isListening ? "LISTENING" : "OFFLINE"}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    bgcolor: isListening ? "rgba(16,185,129,0.1)" : "rgba(30,41,59,0.5)",
                    color: isListening ? "#34D399" : "#64748B",
                    border: isListening
                      ? "1px solid rgba(16,185,129,0.2)"
                      : "1px solid rgba(255,255,255,0.04)",
                  }}
                />
                <Button
                  size="small"
                  onClick={() => setTranscriptView(transcriptView === "live" ? "history" : "live")}
                  sx={{
                    minWidth: 0,
                    px: 1,
                    py: 0.25,
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    color: transcriptView === "history" ? "#C9973A" : "#64748B",
                    bgcolor: transcriptView === "history" ? "rgba(201,151,58,0.2)" : "transparent",
                    border:
                      transcriptView === "history"
                        ? "1px solid rgba(201,151,58,0.3)"
                        : "1px solid transparent",
                    "&:hover": { color: "#CBD5E1", borderColor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  {transcriptView === "live" ? "History" : "Live"}
                </Button>
              </Box>
            </Box>

            {/* Waveform */}
            <Box sx={{ height: 48, mb: 1.5, display: "flex", alignItems: "flex-end", gap: "1px" }}>
              {(() => {
                const fft = frequencyData;
                const barCount = 50;
                const isActive = isListening && fft.length > 0;
                const step = fft.length > 0 ? Math.max(1, Math.floor(fft.length / barCount)) : 1;
                return Array.from({ length: barCount }, (_, i) => {
                  let height;
                  if (isActive) {
                    const bin = Math.min(i * step, fft.length - 1);
                    const val = fft[bin] / 255;
                    height = Math.max(4, Math.min(100, Math.pow(val, 0.6) * 100));
                  } else height = 6 + (i % 5) * 2;
                  const intensity = height / 100;
                  const color = !isActive
                    ? "#1E293B"
                    : intensity > 0.7
                      ? `hsl(160,80%,${45 + intensity * 25}%)`
                      : intensity > 0.4
                        ? `hsl(330,85%,${45 + intensity * 20}%)`
                        : `hsl(340,80%,${35 + intensity * 30}%)`;
                  return (
                    <Box
                      key={i}
                      sx={{
                        flex: 1,
                        borderRadius: "2px",
                        transition: "height 0.075s",
                        height: `${height}%`,
                        background: color,
                        minHeight: "2px",
                        opacity: isActive ? 0.7 + intensity * 0.3 : 0.2,
                        boxShadow: isActive ? `0 0 ${6 + height * 0.06}px ${color}` : "none",
                      }}
                    />
                  );
                });
              })()}
            </Box>

            <Box
              ref={transcriptRef}
              sx={{
                flex: 1,
                overflowY: "auto",
                fontFamily: "'JetBrains Mono Variable', monospace",
                fontSize: 11,
                lineHeight: 1.6,
                color: "text.secondary",
                pr: 0.5,
                minHeight: 0,
              }}
            >
              {transcriptView === "history" ? (
                <TranscriptHistoryView
                  history={transcriptHistory}
                  onSwitchLive={() => setTranscriptView("live")}
                />
              ) : isListening ? (
                <Box>
                  {transcript && (
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        fontSize: 11,
                      }}
                    >
                      {transcript}
                      {recentChunk && transcript.includes(recentChunk) && (
                        <Box
                          component="span"
                          sx={{
                            color: "#60A5FA",
                            fontWeight: 500,
                            bgcolor: "rgba(59,130,246,0.05)",
                            px: 0.5,
                            borderRadius: 0.5,
                          }}
                        >
                          {recentChunk}
                        </Box>
                      )}
                    </Typography>
                  )}
                  {recentChunk && !transcript?.includes(recentChunk) && (
                    <Typography
                      sx={{
                        color: "#60A5FA",
                        fontWeight: 500,
                        bgcolor: "rgba(59,130,246,0.05)",
                        px: 0.5,
                        borderRadius: 0.5,
                        animation: "pulse 2s infinite",
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        fontSize: 11,
                      }}
                    >
                      {recentChunk}
                    </Typography>
                  )}
                  {detectedVerse && (
                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                        pt: 1,
                      }}
                    >
                      <Chip
                        label="✓ Detected"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono Variable', monospace",
                          bgcolor: "transparent",
                          color: "#34D399",
                          p: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          color: "#fff",
                          fontWeight: 500,
                          fontFamily: "'JetBrains Mono Variable', monospace",
                          fontSize: 9,
                        }}
                      >
                        {detectedVerse.reference}
                      </Typography>
                      <Typography
                        sx={{
                          color: "text.disabled",
                          fontFamily: "'JetBrains Mono Variable', monospace",
                          fontSize: 9,
                        }}
                      >
                        · 94% confidence
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography
                  sx={{
                    color: "text.disabled",
                    fontStyle: "italic",
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono Variable', monospace",
                  }}
                >
                  Vocal capture hardware unlinked. Trigger mic connection above.
                </Typography>
              )}
            </Box>
          </GlassPaper>

          {/* Engine Infrastructure */}
          <GlassPaper
            sx={{
              p: 2,
              flex: 1,
              fontFamily: "'JetBrains Mono Variable', monospace",
              fontSize: 10,
              color: "text.secondary",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                pb: 1,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 12,
                  borderRadius: 1,
                  background: "linear-gradient(180deg, #C9973A 0%, rgba(201,151,58,0.3) 100%)",
                }}
              />
              <CinemaLabel>Engine Infrastructure</CinemaLabel>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.5,
              }}
            >
              <Typography
                sx={{
                  color: "text.disabled",
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  fontSize: 9,
                }}
              >
                Match Range
              </Typography>
              <Select
                value={matchRange}
                onChange={(e) => setMatchRange(e.target.value as MatchRange)}
                size="small"
                sx={{
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  color: "#CBD5E1",
                  height: 24,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.06)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(201,151,58,0.4)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(201,151,58,0.4)",
                  },
                  "& .MuiSelect-icon": { color: "#64748B", fontSize: 16 },
                }}
              >
                {MATCH_RANGE_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    sx={{ fontSize: 10, fontFamily: "'JetBrains Mono Variable', monospace" }}
                  >
                    {opt.label} — {opt.description}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}
            >
              <Typography
                sx={{
                  color: "text.disabled",
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  fontSize: 9,
                }}
              >
                Whisper ASR
              </Typography>
              <Chip
                label={whisperLoaded ? "Connected" : "Loading"}
                size="small"
                icon={
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: whisperLoaded ? "#10B981" : "#475569",
                      filter: whisperLoaded ? "drop-shadow(0 0 6px rgba(16,185,129,0.6))" : "none",
                    }}
                  />
                }
                sx={{
                  height: 20,
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  bgcolor: "transparent",
                  color: whisperLoaded ? "#34D399" : "text.disabled",
                }}
              />
            </Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}
            >
              <Typography
                sx={{
                  color: "text.disabled",
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  fontSize: 9,
                }}
              >
                Embedder
              </Typography>
              <Chip
                label={semanticLoaded ? "Vector Ready" : "Loading"}
                size="small"
                icon={
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: semanticLoaded ? "#818CF8" : "#475569",
                      filter: semanticLoaded
                        ? "drop-shadow(0 0 6px rgba(129,140,248,0.6))"
                        : "none",
                    }}
                  />
                }
                sx={{
                  height: 20,
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  bgcolor: "transparent",
                  color: semanticLoaded ? "#818CF8" : "text.disabled",
                }}
              />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography
                sx={{
                  color: "text.disabled",
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  fontSize: 9,
                }}
              >
                Core
              </Typography>
              <Chip
                label="React 19 + TS 5.8"
                size="small"
                sx={{
                  height: 20,
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  bgcolor: "transparent",
                  color: "rgba(129,140,248,0.8)",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pt: 1,
                borderTop: "1px solid rgba(255,255,255,0.04)",
                mt: 1,
              }}
            >
              <Typography
                sx={{
                  color: "text.disabled",
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  fontSize: 9,
                }}
              >
                Session
              </Typography>
              <Typography
                sx={{
                  color: "text.primary",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  fontSize: 9,
                }}
              >
                {formatSessionTime()}
              </Typography>
            </Box>
          </GlassPaper>

          {/* Scripture Search */}
          <GlassPaper sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                pb: 1,
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 12,
                  borderRadius: 1,
                  background:
                    "linear-gradient(180deg, rgba(52,211,153,0.8) 0%, rgba(52,211,153,0.2) 100%)",
                }}
              />
              <CinemaLabel>Scripture Search</CinemaLabel>
            </Box>

            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                const val = searchInputRef.current?.value.trim();
                if (val) {
                  searchReferences(val);
                  setSelectedSearchRef(null);
                  searchInputRef.current!.value = "";
                }
              }}
              sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
            >
              <TextField
                inputRef={searchInputRef}
                placeholder="Quote, topic, or reference…"
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono Variable', monospace",
                    bgcolor: "rgba(26,32,53,0.6)",
                    color: "#E2E8F0",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.06)" },
                    "&:hover fieldset": { borderColor: "rgba(201,151,58,0.4)" },
                    "&.Mui-focused fieldset": { borderColor: "rgba(201,151,58,0.4)" },
                  },
                  "& .MuiOutlinedInput-input": { py: 0.75 },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                sx={{ px: 1.5, py: 0.75, fontSize: 9, minWidth: 0, flexShrink: 0 }}
              >
                Find
              </Button>
            </Box>

            {searchResults.length > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  maxHeight: 260,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.75,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  pt: 1.5,
                }}
              >
                {searchResults.slice(0, 10).map((v) => {
                  const ref = v.reference || v.ref || "";
                  const text = v.text || "";
                  const isSelected = ref === selectedSearchRef;
                  return (
                    <Button
                      key={ref}
                      fullWidth
                      onClick={async () => {
                        setSelectedSearchRef(ref);
                        await searchPreview(text ? `${ref} ${text}` : ref);
                        findRelated(text || ref);
                      }}
                      sx={{
                        justifyContent: "flex-start",
                        textAlign: "left",
                        p: 1,
                        borderRadius: 1.5,
                        textTransform: "none",
                        bgcolor: isSelected ? "rgba(201,151,58,0.1)" : "rgba(26,32,53,0.3)",
                        border: isSelected
                          ? "1px solid rgba(201,151,58,0.3)"
                          : "1px solid transparent",
                        "&:hover": {
                          bgcolor: "rgba(26,32,53,0.6)",
                          borderColor: "rgba(255,255,255,0.06)",
                        },
                        display: "block",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 9,
                            fontWeight: 600,
                            flexShrink: 0,
                            color: isSelected ? "#C9973A" : "text.primary",
                          }}
                        >
                          {ref}
                        </Typography>
                        {(v as any).score != null && (
                          <Typography
                            sx={{
                              fontSize: 7,
                              fontFamily: "'JetBrains Mono Variable', monospace",
                              color: "text.disabled",
                              ml: "auto",
                              flexShrink: 0,
                            }}
                          >
                            {(v as any).score}%
                          </Typography>
                        )}
                      </Box>
                      {text && (
                        <Typography
                          sx={{
                            fontSize: 8,
                            color: "text.secondary",
                            lineHeight: 1.5,
                            mt: 0.25,
                            textAlign: "left",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          &ldquo;{text}&rdquo;
                        </Typography>
                      )}
                    </Button>
                  );
                })}
              </Box>
            )}

            {relatedReferences.length > 0 && selectedSearchRef && (
              <Box sx={{ mt: 1, borderTop: "1px solid rgba(255,255,255,0.04)", pt: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 2,
                      height: 12,
                      borderRadius: 1,
                      background: "linear-gradient(180deg, #4F6BFF 0%, rgba(79,107,255,0.3) 100%)",
                    }}
                  />
                  <CinemaLabel>Related</CinemaLabel>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {relatedReferences.slice(0, 5).map((r) => {
                    const ref = r.reference || r.ref || "";
                    if (ref === selectedSearchRef) return null;
                    return (
                      <Button
                        key={ref}
                        fullWidth
                        onClick={async () => {
                          setSelectedSearchRef(ref);
                          await searchPreview(ref);
                        }}
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          p: 0.75,
                          borderRadius: 0.5,
                          textTransform: "none",
                          bgcolor: "rgba(99,102,241,0.05)",
                          border: "1px solid rgba(99,102,241,0.1)",
                          "&:hover": { bgcolor: "rgba(99,102,241,0.1)" },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            color: "#A5B4FC",
                          }}
                        >
                          {ref}
                        </Typography>
                        {r.text && (
                          <Typography
                            sx={{
                              fontSize: 7,
                              color: "text.secondary",
                              lineHeight: 1.5,
                              mt: 0.25,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            &ldquo;{r.text}&rdquo;
                          </Typography>
                        )}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
            )}
          </GlassPaper>
        </Box>

        {/* RIGHT */}
        <Box sx={{ gridColumn: { xs: "span 12", md: "span 8", lg: "span 9" } }}>
          {mode === "Scripture" ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", lg: "row" },
                gap: { xs: 2, md: 3 },
                alignItems: { lg: "flex-start" },
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                  gap: { xs: 2, md: 3 },
                }}
              >
                {/* PREVIEW */}
                <GlassPaper
                  sx={{
                    borderRadius: 4,
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": { borderColor: "rgba(201,151,58,0.3)" },
                  }}
                >
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
                        <Button
                          size="small"
                          onClick={() => navigateVerse("prev")}
                          sx={{
                            fontSize: 9,
                            color: "#94A3B8",
                            bgcolor: "rgba(30,41,59,0.5)",
                            border: "1px solid rgba(51,65,85,0.5)",
                            "&:hover": { color: "#fff" },
                          }}
                        >
                          &larr; Prev
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            const v = chapterVerses[previewIdx] || displayVerse;
                            if (v) addToQueue(v);
                            navigateVerse("next");
                          }}
                          sx={{
                            fontSize: 9,
                            color: "#94A3B8",
                            bgcolor: "rgba(30,41,59,0.5)",
                            border: "1px solid rgba(51,65,85,0.5)",
                            "&:hover": { color: "#fff" },
                          }}
                        >
                          Next &rarr;
                        </Button>
                        <Divider
                          orientation="vertical"
                          flexItem
                          sx={{ borderColor: "rgba(255,255,255,0.1)" }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!displayVerse}
                          onClick={handlePushLive}
                          sx={{ fontSize: 9 }}
                        >
                          Transmit Live &rarr;
                        </Button>
                      </>
                    }
                  />
                </GlassPaper>

                {/* LIVE */}
                <Paper
                  sx={{
                    borderRadius: 4,
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "transparent",
                    border: "2px solid rgba(239,68,68,0.25)",
                    boxShadow: currentLiveVerse
                      ? "0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(239,68,68,0.08)"
                      : "0 8px 32px rgba(0,0,0,0.45)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: { xs: 2, md: 2.5 },
                      pt: 2,
                      pb: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: currentLiveVerse ? "#EF4444" : "#475569",
                          animation: currentLiveVerse ? "ping 1s infinite" : "none",
                          filter: currentLiveVerse
                            ? "drop-shadow(0 0 8px rgba(239,68,68,0.8))"
                            : "none",
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#EF4444",
                        }}
                      >
                        Live Feed
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {currentLiveVerse && (
                        <Button
                          size="small"
                          onClick={handleClearLive}
                          sx={{
                            fontSize: 9,
                            color: "#94A3B8",
                            bgcolor: "rgba(30,41,59,0.5)",
                            border: "1px solid rgba(51,65,85,0.5)",
                            "&:hover": { color: "#fff" },
                          }}
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        size="small"
                        onClick={openProjector}
                        sx={{
                          fontSize: 9,
                          color: "#94A3B8",
                          bgcolor: "rgba(30,41,59,0.5)",
                          border: "1px solid rgba(51,65,85,0.5)",
                          "&:hover": { color: "#fff" },
                          gap: 0.5,
                        }}
                      >
                        Project
                        <Typography sx={{ fontSize: 7 }} component="span">
                          ↗
                        </Typography>
                      </Button>
                    </Box>
                  </Box>
                  <VersePanel
                    kind="live"
                    verse={currentLiveVerse}
                    translation={TRANSLATIONS[translation]}
                  />
                  {currentLiveVerse && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        fontSize: 9,
                        color: "#EF4444",
                        pb: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "#EF4444",
                          animation: "pulse 2s infinite",
                        }}
                      />
                      <span>LIVE</span>
                      <Typography color="text.disabled" component="span">
                        ·
                      </Typography>
                      <Typography color="text.secondary" component="span">
                        {formatSessionTime()}
                      </Typography>
                    </Box>
                  )}
                  {!currentLiveVerse && queue.length > 0 && (
                    <Box
                      sx={{
                        textAlign: "center",
                        fontSize: 9,
                        color: "text.secondary",
                        pb: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Typography color="#FFD580" component="span">
                        ●
                      </Typography>
                      <Typography
                        sx={{ ml: 0.5, fontSize: 9, color: "text.secondary" }}
                        component="span"
                      >
                        {queue.length} verse{queue.length > 1 ? "s" : ""} in queue
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>

              {/* QUEUE — right sidebar */}
              <Box
                sx={{
                  width: 220,
                  flexShrink: 0,
                  display: { xs: "none", lg: "flex" },
                  flexDirection: "column",
                  bgcolor: "rgba(10,15,30,0.4)",
                  borderRadius: 2,
                  maxHeight: "calc(100vh - 120px)",
                  overflow: "hidden",
                  position: "relative",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "5%",
                    bottom: "5%",
                    width: 1,
                    background: "linear-gradient(180deg, transparent, rgba(201,151,58,0.25), transparent)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 1,
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 3,
                      height: 12,
                      borderRadius: 1,
                      background: "linear-gradient(180deg, #FFD580 0%, rgba(201,151,58,0.3) 100%)",
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#FFD580",
                      fontFamily: "'JetBrains Mono Variable', monospace",
                    }}
                  >
                    Queue
                  </Typography>
                  {queue.length > 0 && (
                    <Chip
                      label={queue.length}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: 8,
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        bgcolor: "rgba(30,41,59,0.5)",
                        color: "#94A3B8",
                      }}
                    />
                  )}
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                    p: 1,
                    overflowY: "auto",
                    minHeight: 0,
                  }}
                >
                  {queue.length === 0 ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        sx={{ fontSize: 9, color: "text.disabled", fontStyle: "italic" }}
                      >
                        Remaining verses appear here
                      </Typography>
                    </Box>
                  ) : (
                    queue.map((v, i) => (
                      <Paper
                        key={`${v.reference || v.ref}-${i}`}
                        variant="outlined"
                        onClick={() => {
                          projectVerse(v);
                          removeFromQueue(i);
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: "rgba(26,32,53,0.3)",
                          borderColor: "rgba(45,58,92,0.15)",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "all 0.15s",
                          "&:hover": {
                            bgcolor: "rgba(201,151,58,0.08)",
                            borderColor: "rgba(201,151,58,0.2)",
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: "#C9973A",
                            fontFamily: "'JetBrains Mono Variable', monospace",
                            flexShrink: 0,
                          }}
                        >
                          {v.reference || v.ref}
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Box>
                {queue.length > 0 && (
                  <Box
                    sx={{
                      px: 1.5,
                      pb: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Button
                      fullWidth
                      size="small"
                      variant="contained"
                      onClick={() => {
                        projectVerse(queue[0]);
                        removeFromQueue(0);
                      }}
                      sx={{ py: 0.5, fontSize: 9 }}
                    >
                      Project Next &rarr;
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          ) : mode === "Music" ? (
            <GlassPaper
              sx={{
                height: "100%",
                borderRadius: 4,
                p: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: 48, mb: 2, opacity: 0.2 }}>🎵</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#CBD5E1", mb: 1 }}>
                Music Mode
              </Typography>
              <Typography
                sx={{ fontSize: 11, color: "text.secondary", maxWidth: 400, lineHeight: 1.6 }}
              >
                Queue and display song lyrics, chord charts, and worship media. Connect your CCLI or
                song library to get started.
              </Typography>
              <Chip
                label="Coming Soon"
                size="small"
                sx={{
                  mt: 3,
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  bgcolor: "transparent",
                  color: "#475569",
                }}
              />
            </GlassPaper>
          ) : (
            <GlassPaper
              sx={{
                height: "100%",
                borderRadius: 4,
                p: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: 48, mb: 2, opacity: 0.2 }}>📺</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#CBD5E1", mb: 1 }}>
                Media Mode
              </Typography>
              <Typography
                sx={{ fontSize: 11, color: "text.secondary", maxWidth: 400, lineHeight: 1.6 }}
              >
                Play video backgrounds, sermon slides, and presentation media alongside your
                scripture projection feed.
              </Typography>
              <Chip
                label="Coming Soon"
                size="small"
                sx={{
                  mt: 3,
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  bgcolor: "transparent",
                  color: "#475569",
                }}
              />
            </GlassPaper>
          )}
        </Box>
      </Box>

      {/* Queue Drawer — mobile */}
      <Drawer
        anchor="right"
        open={queueDrawerOpen}
        onClose={() => setQueueDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 288,
              bgcolor: "rgba(13,20,38,0.96)",
              backdropFilter: "blur(16px)",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            pt: 2,
            pb: 1,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 4,
                height: 12,
                borderRadius: 1,
                background: "linear-gradient(180deg, #FFD580 0%, rgba(201,151,58,0.3) 100%)",
              }}
            />
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#FFD580",
              }}
            >
              Queue
            </Typography>
            {queue.length > 0 && (
              <Chip
                label={queue.length}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono Variable', monospace",
                  bgcolor: "rgba(30,41,59,0.5)",
                  color: "#94A3B8",
                }}
              />
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => setQueueDrawerOpen(false)}
            sx={{
              fontSize: 9,
              color: "#94A3B8",
              bgcolor: "rgba(30,41,59,0.5)",
              border: "1px solid rgba(51,65,85,0.5)",
              borderRadius: 1,
              p: 0.5,
              "&:hover": { color: "#fff" },
            }}
          >
            Close
          </IconButton>
        </Box>
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 2.5,
            pb: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {queue.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: 10, color: "text.disabled", fontStyle: "italic" }}>
                Queue is empty
              </Typography>
            </Box>
          ) : (
            queue.map((v, i) => (
              <Paper
                key={`${v.reference || v.ref}-${i}`}
                variant="outlined"
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: "rgba(26,32,53,0.4)",
                  borderColor: "rgba(45,58,92,0.2)",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#C9973A",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.reference || v.ref}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 9,
                      color: "text.secondary",
                      lineHeight: 1.5,
                      mt: 0.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {v.text}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, pt: 0.25 }}
                >
                  <Button
                    size="small"
                    onClick={() => {
                      projectVerse(v);
                      removeFromQueue(i);
                      setQueueDrawerOpen(false);
                    }}
                    sx={{ px: 1, py: 0.5, fontSize: 8, minWidth: 0 }}
                  >
                    Live
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => removeFromQueue(i)}
                    sx={{
                      fontSize: 8,
                      color: "#64748B",
                      bgcolor: "rgba(30,41,59,0.5)",
                      border: "1px solid rgba(51,65,85,0.5)",
                      borderRadius: 1,
                      p: 0.5,
                      "&:hover": { color: "#fff" },
                    }}
                  >
                    &times;
                  </IconButton>
                </Box>
              </Paper>
            ))
          )}
        </Box>
        {queue.length > 0 && (
          <Box sx={{ px: 2.5, pb: 2, flexShrink: 0 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                projectVerse(queue[0]);
                removeFromQueue(0);
                setQueueDrawerOpen(false);
              }}
              sx={{ py: 1, fontSize: 9 }}
            >
              Project Next &rarr;
            </Button>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Transcript History View
// ---------------------------------------------------------------------------

function TranscriptHistoryView({
  history,
  onSwitchLive,
}: {
  history: TranscriptSegment[];
  onSwitchLive: () => void;
}) {
  if (history.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "text.disabled",
        }}
      >
        <Typography sx={{ fontSize: 10, fontStyle: "italic", color: "text.disabled" }}>
          No transcript history for today.
        </Typography>
        <Button
          onClick={onSwitchLive}
          sx={{ mt: 1, fontSize: 9, color: "#C9973A", "&:hover": { color: "#FFD580" } }}
        >
          &larr; Back to Live
        </Button>
      </Box>
    );
  }

  const groups = new Map<string, TranscriptSegment[]>();
  for (const seg of history) {
    const d = new Date(seg.timestamp);
    const key = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(seg);
  }

  const clearHistory = useSoundStore((s) => s.clearHistory);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          pb: 0.75,
        }}
      >
        <Typography
          sx={{
            fontSize: 9,
            color: "text.disabled",
            fontFamily: "'JetBrains Mono Variable', monospace",
          }}
        >
          {history.length} segment{history.length !== 1 ? "s" : ""}
        </Typography>
        <Button
          onClick={clearHistory}
          sx={{ fontSize: 8, color: "#475569", "&:hover": { color: "#FB7185" } }}
        >
          Clear all
        </Button>
      </Box>
      {[...groups.entries()].map(([label, segments]) => (
        <Box key={label}>
          <Typography
            sx={{
              fontSize: 9,
              color: "text.disabled",
              fontFamily: "'JetBrains Mono Variable', monospace",
              mb: 0.75,
              textTransform: "uppercase",
            }}
          >
            {label}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {segments.map((seg) => {
              const t = new Date(seg.timestamp);
              const time = t.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              return (
                <Paper
                  key={seg.id}
                  variant="outlined"
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    p: 0.75,
                    borderRadius: 0.5,
                    bgcolor: "rgba(26,32,53,0.3)",
                    borderColor: "transparent",
                    "&:hover": { borderColor: "rgba(255,255,255,0.04)" },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 8,
                      color: "#475569",
                      fontFamily: "'JetBrains Mono Variable', monospace",
                      mt: 0.25,
                      flexShrink: 0,
                      width: 56,
                      textAlign: "right",
                    }}
                  >
                    {time}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: "#CBD5E1",
                      lineHeight: 1.5,
                      overflowWrap: "break-word",
                      minWidth: 0,
                    }}
                  >
                    {seg.text}
                  </Typography>
                  {seg.detectedRef && (
                    <Chip
                      label={seg.detectedRef}
                      size="small"
                      sx={{
                        flexShrink: 0,
                        fontSize: 8,
                        fontFamily: "'JetBrains Mono Variable', monospace",
                        color: "#34D399",
                        bgcolor: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        mt: 0.25,
                        height: 18,
                      }}
                    />
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      ))}
      <Button
        onClick={onSwitchLive}
        sx={{
          fontSize: 9,
          color: "#C9973A",
          display: "block",
          mt: 1,
          textAlign: "left",
          "&:hover": { color: "#FFD580" },
        }}
      >
        &larr; Back to Live
      </Button>
    </Box>
  );
}
