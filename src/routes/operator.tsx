import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useProjectionStore } from "../store/projectionStore";
import { useSoundStore } from "../store/soundStore";
import { useOrchestrator } from "../hooks/useOrchestrator";
import type { Verse } from "../api/bible";
import { MATCH_RANGE_OPTIONS } from "../utils/distance";
import type { MatchRange } from "../utils/distance";
import { lookupEngine } from "../services/scriptureLookup";
import { parseScriptureReference } from "../utils/scriptureParser";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import SearchIcon from "@mui/icons-material/Search";
import MicIcon from "@mui/icons-material/Mic";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CircleIcon from "@mui/icons-material/Circle";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import LaunchIcon from "@mui/icons-material/Launch";

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
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const prevDetectedRef = useRef<string | null>(null);

  const {
    isListening,
    isProcessing,
    audioLevel,
    transcript,
    detectedVerse,
    error,
    whisperLoaded,
    semanticLoaded,
    startListening,
    stopListening,
    pushToProjection,
    searchUtterance,
  } = useOrchestrator();

  const matchRange = useSoundStore((s) => s.matchRange);
  const setMatchRange = useSoundStore((s) => s.setMatchRange);

  const queue = useProjectionStore((s) => s.queue);
  const addToQueue = useProjectionStore((s) => s.addToQueue);
  const removeFromQueue = useProjectionStore((s) => s.removeFromQueue);
  const projectVerse = useProjectionStore((s) => s.projectVerse);
  const currentVerse = useProjectionStore((s) => s.currentVerse);

  const [mode, setMode] = useState<(typeof MODES)[number]>("Scripture");
  const [translation, setTranslation] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chapterVerses, setChapterVerses] = useState<{ verse: number; text: string }[]>([]);
  const [currentChapterRef, setCurrentChapterRef] = useState("");

  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => channelRef.current?.close();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const sourceRef = useRef<string | null>(null);
  useEffect(() => {
    const src = currentVerse || detectedVerse;
    if (!src) { console.log("[chapter] no src"); return; }
    const s = src as any;
    let ref = s.ref || s.reference || "";
    if (!ref || ref === sourceRef.current) { console.log("[chapter] skip dup", ref); return; }
    sourceRef.current = ref;
    let book = s.book;
    let chapter = s.chapter;
    let verse = s.verse;
    if (!book || !chapter) {
      const parsed = parseScriptureReference(ref);
      if (parsed.length > 0) {
        book = parsed[0].book;
        chapter = parsed[0].chapter;
        verse = parsed[0].verse || 1;
      }
    }
    console.log("[chapter] got ref", ref, "book", book, "ch", chapter, "vs", verse);
    if (book && chapter) {
      try {
        const all = lookupEngine.getChapter(book, chapter);
        console.log("[chapter] getChapter returned", all?.length, "verses");
        const remaining = all
          .filter((v) => v.v > (verse || 0))
          .map((v) => ({ verse: v.v, text: v.t }));
        console.log("[chapter] remaining", remaining?.length);
        setChapterVerses(remaining);
        setCurrentChapterRef(`${book} ${chapter}`);
      } catch (e) {
        console.warn("Failed to load chapter verses:", e);
      }
    }
  }, [currentVerse, detectedVerse]);

  const handlePushLive = () => {
    if (detectedVerse) {
      projectVerse(detectedVerse as any);
      pushToProjection(detectedVerse as any);
      channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse: detectedVerse });
      try { localStorage.setItem("mentalist_projection_verse", JSON.stringify(detectedVerse)); } catch {}
    }
  };

  const togglingRef = useRef(false);
  const handleToggleMic = () => {
    if (togglingRef.current) return;
    togglingRef.current = true;
    if (isListening) stopListening();
    else startListening();
    setTimeout(() => { togglingRef.current = false; }, 500);
  };

  const formatTime = () => {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchUtterance(searchQuery.trim());
      setSearchQuery("");
    }
  };

  const displayVerse = detectedVerse;
  const confidenceScore = 94;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", overflow: "hidden", position: "relative" }}>
      
      {/* Floating Orbs */}
      <Box sx={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <Box sx={{ position: "absolute", top: "5%", left: "10%", width: 500, height: 500, borderRadius: "50%", opacity: 0.06, filter: "blur(72px)", bgcolor: "#3B82F6", animation: "float 22s ease-in-out infinite" }} />
        <Box sx={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", opacity: 0.04, filter: "blur(72px)", bgcolor: "#1D4ED8", animation: "float 28s ease-in-out infinite reverse" }} />
        <Box sx={{ position: "absolute", top: "50%", right: "40%", width: 300, height: 300, borderRadius: "50%", opacity: 0.03, filter: "blur(72px)", bgcolor: "#FFFFFF", animation: "float 18s ease-in-out infinite 5s" }} />
      </Box>

      {/* HEADER */}
      <Box sx={{ position: "relative", zIndex: 10, height: 64, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", backdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "space-between", px: { xs: 2, md: 4 } }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "12px", background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#FFFFFF", boxShadow: "0 4px 16px rgba(59,130,246,0.25)" }}>
            D
          </Box>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.02em" }}>D'mentalist</Typography>
            <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.2 }}>AI SCRIPTURE ENGINE v1.2</Typography>
          </Box>

          <Stack direction="row" spacing={0.5} sx={{ display: { xs: "none", md: "flex" }, ml: 4, borderLeft: "1px solid rgba(255,255,255,0.04)", pl: 3 }}>
            {MODES.map((tab) => (
              <Box
                key={tab}
                component="button"
                onClick={() => setMode(tab)}
                sx={{
                  px: 2.5, py: 1, borderRadius: "8px", fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.05em", border: "none",
                  cursor: "pointer", transition: "all 0.2s", fontFamily: '"Inter", sans-serif',
                  color: mode === tab ? "#60A5FA" : "rgba(255,255,255,0.4)",
                  bgcolor: mode === tab ? "rgba(59,130,246,0.08)" : "transparent",
                  "&:hover": { color: mode === tab ? "#60A5FA" : "rgba(255,255,255,0.7)" },
                }}
              >
                {tab}
              </Box>
            ))}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {/* AI Status */}
          <Stack direction="row" spacing={1.5} sx={{ display: { xs: "none", lg: "flex" }, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: "rgba(255,255,255,0.4)", px: 2, py: 0.75, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CircleIcon sx={{ fontSize: 6, color: whisperLoaded ? "#10B981" : "rgba(255,255,255,0.15)", animation: whisperLoaded ? "pulse-green 2s ease-in-out infinite" : "none" }} />
              <Box component="span" sx={{ color: whisperLoaded ? "#34D399" : "inherit" }}>WHISPER</Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CircleIcon sx={{ fontSize: 6, color: semanticLoaded ? "#818CF8" : "rgba(255,255,255,0.15)", animation: semanticLoaded ? "pulse-green 2s ease-in-out infinite" : "none" }} />
              <Box component="span" sx={{ color: semanticLoaded ? "#818CF8" : "inherit" }}>MINILM</Box>
            </Box>
          </Stack>

          {/* Mic Toggle */}
          <Box
            component="button"
            onClick={handleToggleMic}
            sx={{
              display: "flex", alignItems: "center", gap: 1, px: 2, py: 1,
              borderRadius: "8px", fontSize: 11, fontWeight: 600, border: "1px solid",
              cursor: "pointer", transition: "all 0.2s",
              bgcolor: isListening ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.02)",
              color: isListening ? "#EF4444" : "rgba(255,255,255,0.5)",
              borderColor: isListening ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.04)",
              "&:hover": { bgcolor: isListening ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)" },
            }}
          >
            {isListening ? (
              <VolumeOffIcon sx={{ fontSize: 14 }} />
            ) : (
              <MicIcon sx={{ fontSize: 14 }} />
            )}
            <Box sx={{ display: { xs: "none", sm: "block" } }}>{isListening ? "Mute" : "Mic"}</Box>
          </Box>

          {/* Queue */}
          <Box
            component="button"
            onClick={() => setQueueDrawerOpen(true)}
            sx={{
              px: 2, py: 1, borderRadius: "8px", fontSize: 11, fontWeight: 600,
              border: "2px solid rgba(255,255,255,0.04)", cursor: "pointer",
              transition: "all 0.2s", fontFamily: '"Inter", sans-serif',
              bgcolor: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.5)",
              display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1,
              "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
            }}
          >
            <ClearAllIcon sx={{ fontSize: 14 }} /> Queue ({queue.length})
          </Box>

        </Stack>
      </Box>

      {/* MAIN LAYOUT */}
      <Box sx={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", p: { xs: 2, md: 3 }, height: "calc(100vh - 64px)", overflow: "hidden" }}>
        
        {/* Top Section — 3-column board row */}
        <Box sx={{ display: "flex", flexDirection: "row", gap: 3, height: 280, overflow: "hidden" }}>
          
          {/* COLUMN 1: Telemetry & Controls */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          
          {/* Live Transcript */}
          <Card sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: 200, flex: 1 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", pb: 1.5, mb: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <MicIcon sx={{ fontSize: 14, color: isListening ? "#10B981" : "rgba(255,255,255,0.2)", animation: isListening ? "pulse-green 2s ease-in-out infinite" : "none" }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>Live Transcript</Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                {isProcessing && <CircleIcon sx={{ fontSize: 8, color: "#60A5FA", animation: "pulse-gold 1s ease-in-out infinite" }} />}
                <Chip
                  label={isListening ? "LISTENING" : "OFFLINE"}
                  size="small"
                  color={isListening ? "secondary" : "default"}
                  sx={{ height: 20, fontSize: 9 }}
                />
                <Typography sx={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: "rgba(255,255,255,0.25)" }}>{formatTime()}</Typography>
              </Stack>
            </Stack>

            {/* Waveform */}
            <Box sx={{ height: 40, display: "flex", alignItems: "flex-end", gap: "2px", mb: 1.5, px: 1, py: 0.5, bgcolor: "rgba(0,0,0,0.25)", borderRadius: 1 }}>
              {Array.from({ length: 36 }, (_, i) => {
                const active = isListening && audioLevel > 3;
                const wave = Math.sin((i / 36) * Math.PI * 2 + Date.now() / 200) * 0.5 + 0.5;
                const h = active ? Math.max(10, Math.min(100, audioLevel * 0.8 * (0.5 + wave * 0.5))) : 8 + (i % 5) * 4;
                const intensity = h / 100;
                const color = active
                  ? intensity > 0.6 ? "#10B981" : intensity > 0.3 ? "#60A5FA" : "#3B82F6"
                  : "rgba(255,255,255,0.06)";
                return (
                  <Box
                    key={i}
                    sx={{
                      flex: 1, borderRadius: "2px", transition: "height 0.08s", height: `${h}%`,
                      bgcolor: color, boxShadow: active && h > 25 ? `0 0 8px ${color}` : "none",
                    }}
                  />
                );
              })}
            </Box>

            {/* Transcript Text */}
            <Box ref={transcriptRef} sx={{ flex: 1, overflowY: "auto", fontFamily: '"JetBrains Mono", monospace', fontSize: 11, lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
              {transcript ? (
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{transcript}</Typography>
              ) : (
                <Typography sx={{ color: "rgba(255,255,255,0.2)", fontStyle: "italic", fontSize: 10 }}>
                  {isListening ? "Awaiting vocal input..." : "Mic offline. Toggle mic above."}
                </Typography>
              )}
            </Box>

            {detectedVerse && (
              <Box sx={{ mt: 1, pt: 1.5, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: 10 }}>
                  <CircleIcon sx={{ fontSize: 6, color: "#10B981" }} />
                  <Box component="span" sx={{ color: "#34D399", fontWeight: 600 }}>Detected:</Box>
                  <Box component="span" sx={{ color: "#fff", fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                    {(detectedVerse as any).reference || (detectedVerse as any).ref}
                  </Box>
                  <Box component="span" sx={{ color: "rgba(255,255,255,0.25)" }}>· {confidenceScore}%</Box>
                  <Chip label="regex" size="small" sx={{ height: 16, fontSize: 8 }} />
                </Stack>
              </Box>
            )}
          </Card>

          {/* Engine Infrastructure */}
          <Card sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)", pb: 1.5, mb: 1.5 }}>
              Engine Infrastructure
            </Typography>

            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: '"JetBrains Mono", monospace' }}>Match Range</Typography>
              <Stack direction="row" spacing={0.5}>
                {MATCH_RANGE_OPTIONS.map((opt) => (
                  <Box
                    key={opt.value}
                    component="button"
                    onClick={() => setMatchRange(opt.value as MatchRange)}
                    sx={{
                      px: 1.5, py: 0.5, borderRadius: "4px", fontSize: 9, fontWeight: 700,
                      fontFamily: '"JetBrains Mono", monospace', textTransform: "capitalize",
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      bgcolor: matchRange === opt.value ? "#3B82F6" : "rgba(255,255,255,0.03)",
                      color: matchRange === opt.value ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                      "&:hover": { color: matchRange === opt.value ? "#FFFFFF" : "rgba(255,255,255,0.6)" },
                    }}
                  >
                    {opt.value}
                  </Box>
                ))}
              </Stack>
            </Stack>

            <Box sx={{ "& > div": { display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5, fontSize: 11 } }}>
              <Box><Box component="span" sx={{ color: "rgba(255,255,255,0.3)" }}>Whisper ASR</Box><Box component="span" sx={{ color: whisperLoaded ? "#34D399" : "rgba(255,255,255,0.3)" }}><CircleIcon sx={{ fontSize: 6, ml: 1, mr: 0.5, color: whisperLoaded ? "#10B981" : "inherit" }} />{whisperLoaded ? "Connected" : "Loading"}</Box></Box>
              <Box><Box component="span" sx={{ color: "rgba(255,255,255,0.3)" }}>Embedder</Box><Box component="span" sx={{ color: semanticLoaded ? "#818CF8" : "rgba(255,255,255,0.3)" }}><CircleIcon sx={{ fontSize: 6, ml: 1, mr: 0.5, color: semanticLoaded ? "#818CF8" : "inherit" }} />{semanticLoaded ? "Vector Ready" : "Loading"}</Box></Box>
              <Box><Box component="span" sx={{ color: "rgba(255,255,255,0.3)" }}>Core Engine</Box><Box component="span" sx={{ color: "rgba(255,255,255,0.6)" }}>React 19 + TS 5.8</Box></Box>
              <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.04)", mt: 1, pt: 1.5, fontSize: 10 }}>
                <Box component="span" sx={{ color: "rgba(255,255,255,0.2)" }}>Session Runtime</Box>
                <Box component="span" sx={{ color: "rgba(255,255,255,0.4)", fontFamily: '"JetBrains Mono", monospace' }}>{formatTime()}</Box>
              </Box>
            </Box>
          </Card>

          {/* Manual Search */}
          <Card sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)", pb: 1.5, mb: 1.5 }}>
              Manual Search
            </Typography>
            <Box component="form" onSubmit={handleSearch} sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Quote, topic, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button type="submit" variant="contained" color="primary" sx={{ minWidth: "unset", px: 2.5, fontSize: 11, fontWeight: 600 }}>
                Find
              </Button>
            </Box>
          </Card>

          {error && (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Typography sx={{ fontSize: 10, color: "#EF4444", fontFamily: '"JetBrains Mono", monospace' }}>{error}</Typography>
            </Box>
          )}
        </Box>

        {/* COLUMN 2: Preview */}
        <Box sx={{ width: 320, height: 280, flexShrink: 0, p: 2, display: "flex", flexDirection: "column" }}>
        <Card sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          
          {/* Preview Header */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", pb: 1.5 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Box sx={{ position: "relative", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle cx="22" cy="22" r="18" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray={113} strokeDashoffset={113 - (113 * confidenceScore) / 100} strokeLinecap="round" />
                </svg>
                <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: "#10B981" }}>{confidenceScore}%</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)" }}>Confidence</Typography>
                <Chip label="tier: regex" size="small" sx={{ height: 16, fontSize: 8, mt: 0.5 }} />
              </Box>
            </Stack>

            <Box sx={{ bgcolor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 2, px: 2, py: 1, textAlign: "right" }}>
              <Typography sx={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)" }}>Next Expected</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: "#60A5FA", mt: 0.25 }}>
                {(displayVerse as any)?.reference || "—"}
              </Typography>
            </Box>
          </Stack>

          {/* Verse Display */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 4, py: 2 }}>
            {displayVerse ? (
              <>
                <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: "#60A5FA", letterSpacing: "0.2em", textTransform: "uppercase", mb: 2 }}>
                  — {(displayVerse as any).reference || (displayVerse as any).ref} · {TRANSLATIONS[translation]} —
                </Typography>
                <Typography sx={{ fontFamily: '"Georgia", serif', fontStyle: "italic", fontSize: { xs: 18, md: 22 }, lineHeight: 1.8, color: "rgba(255,255,255,0.95)", fontWeight: 400 }}>
                    <Box component="span" sx={{ fontSize: 11, fontFamily: '"Inter", sans-serif', fontWeight: 800, mr: 1, color: "#60A5FA", verticalAlign: "super" }}>
                    {(displayVerse as any).verse}
                  </Box>
                  "{(displayVerse as any).text}"
                </Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: '"JetBrains Mono", monospace', fontStyle: "italic" }}>
                  Awaiting scripture input...
                </Typography>
                <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.15)", mt: 1 }}>
                  Speak a verse or type in the search bar
                </Typography>
              </>
            )}
          </Box>

          {/* Preview Controls */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", pt: 2 }}>
            <Stack direction="row" spacing={1}>
              <Box
                component="button"
                sx={{
                  display: "flex", alignItems: "center", gap: 0.5, px: 2, py: 0.75, borderRadius: "8px",
                  fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase",
                  border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.2s",
                  bgcolor: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.4)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" },
                }}
              >
                <ChevronLeftIcon sx={{ fontSize: 14 }} /> Prev
              </Box>
              <Box
                component="button"
                sx={{
                  display: "flex", alignItems: "center", gap: 0.5, px: 2, py: 0.75, borderRadius: "8px",
                  fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase",
                  border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.2s",
                  bgcolor: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.4)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" },
                }}
              >
                Next <ChevronRightIcon sx={{ fontSize: 14 }} />
              </Box>
            </Stack>

            <Button
              variant="contained"
              color="primary"
              disabled={!displayVerse}
              onClick={handlePushLive}
              sx={{ px: 4, py: 1, fontSize: 11, fontWeight: 700, borderRadius: "8px" }}
            >
              Transmit Live
            </Button>
          </Stack>
        </Card>
        </Box>

        {/* COLUMN 3: Live Feed & Queue */}
        <Box sx={{ width: 320, height: 280, flexShrink: 0, p: 2, display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden", flex: 1 }}>
          
          {/* Live Feed */}
          <Card sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", bgcolor: "rgba(239,68,68,0.04)", borderColor: "error.main" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <CircleIcon sx={{ fontSize: 8, color: currentVerse ? "#EF4444" : "rgba(255,255,255,0.15)", animation: currentVerse ? "pulse-red 1.5s ease-in-out infinite" : "none" }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#EF4444" }}>Live Projector Feed</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Box
                  component="button"
                  sx={{ fontSize: 9, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', px: 1.5, py: 0.5, borderRadius: "4px", border: "none", cursor: "pointer", transition: "all 0.2s", bgcolor: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", "&:hover": { bgcolor: "rgba(255,255,255,0.06)" } }}
                >
                  Clear
                </Box>
                <Box
                  component="button"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 9, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace', px: 1.5, py: 0.5, borderRadius: "4px", border: "none", cursor: "pointer", transition: "all 0.2s", bgcolor: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)", "&:hover": { bgcolor: "rgba(255,255,255,0.06)" } }}
                >
                  Project <LaunchIcon sx={{ fontSize: 10 }} />
                </Box>
              </Stack>
            </Stack>

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 4 }}>
              {currentVerse ? (
                <>
                  <Typography sx={{ fontFamily: '"Georgia", serif', fontSize: { xs: 15, md: 18 }, lineHeight: 1.7, color: "rgba(255,255,255,0.9)", fontStyle: "italic" }}>
                    "{currentVerse.text}"
                  </Typography>
                  <Typography sx={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", mt: 2 }}>
                    {currentVerse.reference}
                  </Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontFamily: '"JetBrains Mono", monospace', fontStyle: "italic" }}>
                  Nothing projected
                </Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", pt: 1.5 }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: "rgba(239,68,68,0.6)", fontFamily: '"JetBrains Mono", monospace' }}>
                {currentVerse ? "LIVE BROADCAST" : "STANDBY"}
              </Typography>
              <Typography sx={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: "rgba(255,255,255,0.2)" }}>{formatTime()}</Typography>
            </Box>
          </Card>

          {/* Queue */}
          <Card sx={{ p: 2, display: "flex", flexDirection: "column", flexShrink: 0, maxHeight: "40%" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ClearAllIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>Queue</Typography>
              </Stack>
              <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{chapterVerses.length}</Box>
            </Stack>

            <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
              {chapterVerses.length === 0 ? (
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>No remaining verses</Typography>
                </Box>
              ) : (
                chapterVerses.slice(0, 5).map((v) => (
                  <Box key={v.verse} sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: "#60A5FA" }}>
                        {currentChapterRef}.{v.verse}
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{v.text}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            {chapterVerses.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => {
                  const next = chapterVerses[0];
                  const ref = `${currentChapterRef}:${next.verse}`;
                  addToQueue({ reference: ref, text: next.text } as any);
                  setChapterVerses((prev) => prev.slice(1));
                }}
                sx={{ mt: 1.5, py: 1, fontSize: 11, fontWeight: 600, borderRadius: "8px" }}
              >
                Project Next →
              </Button>
            )}
          </Card>
        </Box>
        </Box>
        </Box>

        {/* Horizontal divider */}
        <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.08)", my: 2, flexShrink: 0 }} />

        {/* Scripture section below divider */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "row", gap: 3, overflow: "hidden", ml: "auto", maxWidth: 664 }}>
          <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, pt: 1.5, pb: 1, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>
                Scripture
              </Typography>
              <Chip label="KJV" size="small" color="primary" sx={{ height: 18, fontSize: 8, fontWeight: 700 }} />
            </Stack>
            <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1 }}>
              {chapterVerses.length > 0 ? (
                <>
                  <Typography sx={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: "rgba(255,255,255,0.3)", mb: 1 }}>
                    Remaining verses from {currentChapterRef}
                  </Typography>
                  {chapterVerses.map((v) => (
                    <Box key={v.verse} sx={{ display: "flex", gap: 1, mb: 0.75 }}>
                      <Typography sx={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: "#60A5FA", fontWeight: 700, minWidth: 24, flexShrink: 0 }}>
                        {v.verse}
                      </Typography>
                      <Typography sx={{ fontSize: 10, lineHeight: 1.5, color: "rgba(255,255,255,0.65)" }}>
                        {v.text}
                      </Typography>
                    </Box>
                  ))}
                </>
              ) : (
                <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontStyle: "italic", textAlign: "center", mt: 6 }}>
                  Detected chapter verses will appear here
                </Typography>
              )}
            </Box>
          </Card>
        </Box>

      {/* Mobile Queue Drawer */}
      {queueDrawerOpen && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 1200, display: { md: "none" } }}>
          <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setQueueDrawerOpen(false)} />
          <Box sx={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 320, bgcolor: "rgba(11,15,28,0.95)", backdropFilter: "blur(24px)", borderLeft: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px 0 0 16px", display: "flex", flexDirection: "column", animation: "slide-up 0.25s ease-out" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 3, pt: 3, pb: 2, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <ClearAllIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.3)" }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>Queue</Typography>
                <Box sx={{ width: 20, height: 20, borderRadius: "6px", bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{queue.length}</Box>
              </Stack>
              <IconButton onClick={() => setQueueDrawerOpen(false)} size="small" sx={{ color: "rgba(255,255,255,0.3)" }}>
                <Box component="span" sx={{ fontSize: 12 }}>✕</Box>
              </IconButton>
            </Stack>
            <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              {queue.map((v, i) => (
                <Box key={i} sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: "#60A5FA" }}>{v.reference || v.ref}</Typography>
                    <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineClamp: 2, fontStyle: "italic" }}>{v.text}</Typography>
                  </Box>
                  <Box
                    component="button"
                    onClick={() => { projectVerse(v); removeFromQueue(i); setQueueDrawerOpen(false); }}
                    sx={{ px: 2.5, py: 1, fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', border: "none", borderRadius: "6px", cursor: "pointer", bgcolor: "#3B82F6", color: "#FFFFFF", "&:hover": { opacity: 0.9 } }}
                  >
                    Live
                  </Box>
                </Box>
              ))}
            </Box>
            {queue.length > 0 && (
              <Box sx={{ px: 3, pb: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => { projectVerse(queue[0]); removeFromQueue(0); setQueueDrawerOpen(false); }}
                  sx={{ py: 1.5, fontSize: 11, fontWeight: 700, borderRadius: "8px" }}
                >
                  Project Next →
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
    </Box>
  );
}
