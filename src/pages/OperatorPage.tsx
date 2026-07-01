import { useCallback, useEffect, useRef, useState } from "react";
import { useSoundStore, type TranscriptSegment } from "../store/soundStore";
import { useScriptureStore } from "../store/scriptureStore";
import { useProjection } from "../hooks/useProjection";
import { useProjectionStore } from "../store/projectionStore";

import { useOrchestrator } from "../hooks/useOrchestrator";
import { usePresentationController } from "../hooks/usePresentationController";
import AiStatusChip from "../components/ai/AiStatusChip";
import VersePanel from "../components/verse/VersePanel";
import { useBibleEngine } from "../hooks/useBibleEngine";
import { BibleApiService, aoChapterToVerses, type TranslationMeta } from "../services/bibleApi";
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
import Modal from "@mui/material/Modal";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";
import { CinemaLabel, CinemaReference, GlassPaper } from "../components/styled";

const MODES = ["Scripture", "Music", "Media"] as const;

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = {
  midnight: {
    label: "Midnight",
    icon: "🌑",
    desc: "Deep black-blue. Maximum contrast.",
    bg: "rgba(3,7,18,1)",
    accent: "#C9973A",
    cardBg: "rgba(26,32,53,0.4)",
    border: "rgba(255,255,255,0.06)",
  },
  sacred: {
    label: "Sacred",
    icon: "✝️",
    desc: "Warm gold tones. Church atmosphere.",
    bg: "rgba(12,8,3,1)",
    accent: "#FFD580",
    cardBg: "rgba(40,28,8,0.5)",
    border: "rgba(201,151,58,0.15)",
  },
  slate: {
    label: "Slate",
    icon: "🪨",
    desc: "Cool neutral. Professional broadcast.",
    bg: "rgba(8,12,20,1)",
    accent: "#60A5FA",
    cardBg: "rgba(20,28,48,0.5)",
    border: "rgba(96,165,250,0.1)",
  },
  emerald: {
    label: "Emerald",
    icon: "💎",
    desc: "Teal glow. Modern stage feel.",
    bg: "rgba(2,12,12,1)",
    accent: "#34D399",
    cardBg: "rgba(8,36,32,0.5)",
    border: "rgba(52,211,153,0.1)",
  },
} as const;
type ThemeKey = keyof typeof THEMES;

interface DetectionEntry {
  ref: string;
  stage: "regex" | "semantic" | "gemma";
  confidence: number;
  time: string;
  spokenAs: string;
}

// ─── Floating background orbs ─────────────────────────────────────────────────
function FloatingOrbs({ accentColor = "#C9973A" }: { accentColor?: string }) {
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
          opacity: 0.07,
          filter: "blur(96px)",
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
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
          opacity: 0.05,
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
          opacity: 0.03,
          filter: "blur(96px)",
          background: "radial-gradient(circle, #10B981 0%, transparent 70%)",
          animation: "float 18s ease-in-out infinite 5s",
        }}
      />
      <style>{`
        @keyframes float { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-40px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.95)} }
        @keyframes ping { 75%,100%{transform:scale(2);opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes glowPulse { 0%,100%{opacity:0.8} 50%{opacity:1} }
      `}</style>
    </Box>
  );
}

// ─── Theme Modal ──────────────────────────────────────────────────────────────
function ThemeModal({
  open,
  onClose,
  activeTheme,
  theme,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  activeTheme: ThemeKey;
  theme: (typeof THEMES)[ThemeKey];
  onSelect: (t: ThemeKey) => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 400,
          bgcolor: `${theme.bg}f7`,
          backdropFilter: "blur(24px)",
          border: `1px solid ${theme.border}`,
          borderRadius: 3,
          p: 3,
          outline: "none",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 3,
                height: 16,
                borderRadius: 1,
                background: "linear-gradient(180deg,#C9973A,rgba(201,151,58,0.2))",
              }}
            />
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#E2E8F0",
                fontFamily: "'JetBrains Mono Variable',monospace",
              }}
            >
              Display Theme
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "#64748B", "&:hover": { color: "#E2E8F0" } }}
          >
            ✕
          </IconButton>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {(Object.entries(THEMES) as [ThemeKey, (typeof THEMES)[ThemeKey]][]).map(([key, t]) => {
            const isActive = activeTheme === key;
            return (
              <Box
                key={key}
                onClick={() => {
                  onSelect(key);
                  onClose();
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: isActive ? `1px solid ${t.accent}` : "1px solid rgba(255,255,255,0.06)",
                  bgcolor: isActive ? `${t.accent}14` : "rgba(26,32,53,0.3)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: t.accent, bgcolor: `${t.accent}0a` },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontSize: 16 }}>{t.icon}</Typography>
                  <Typography
                    sx={{ fontSize: 11, fontWeight: 600, color: isActive ? t.accent : "#CBD5E1" }}
                  >
                    {t.label}
                  </Typography>
                  {isActive && (
                    <Box
                      sx={{
                        ml: "auto",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: t.accent,
                      }}
                    />
                  )}
                </Box>
                <Typography sx={{ fontSize: 9, color: "#64748B", lineHeight: 1.4 }}>
                  {t.desc}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Modal>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({
  open,
  onClose,
  matchRange,
  setMatchRange,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  matchRange: MatchRange;
  setMatchRange: (v: MatchRange) => void;
  theme: (typeof THEMES)[ThemeKey];
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 420,
          bgcolor: `${theme.bg}f7`,
          backdropFilter: "blur(24px)",
          border: `1px solid ${theme.border}`,
          borderRadius: 3,
          p: 3,
          outline: "none",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 3,
                height: 16,
                borderRadius: 1,
                background: "linear-gradient(180deg,#818CF8,rgba(129,140,248,0.2))",
              }}
            />
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#E2E8F0",
                fontFamily: "'JetBrains Mono Variable',monospace",
              }}
            >
              Engine Settings
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "#64748B", "&:hover": { color: "#E2E8F0" } }}
          >
            ✕
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Match Range */}
          <Box>
            <Typography
              sx={{
                fontSize: 9,
                color: "#64748B",
                fontFamily: "'JetBrains Mono Variable',monospace",
                mb: 0.75,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Detection Range
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              {MATCH_RANGE_OPTIONS.map((opt) => (
                <Box
                  key={opt.value}
                  onClick={() => setMatchRange(opt.value as MatchRange)}
                  sx={{
                    flex: 1,
                    p: 1,
                    borderRadius: 1.5,
                    border:
                      matchRange === opt.value
                        ? `1px solid ${theme.accent}80`
                        : `1px solid ${theme.border}`,
                    bgcolor: matchRange === opt.value ? `${theme.accent}1a` : theme.cardBg,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                    "&:hover": { borderColor: `${theme.accent}4d` },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: matchRange === opt.value ? theme.accent : "#94A3B8",
                      fontFamily: "'JetBrains Mono Variable',monospace",
                    }}
                  >
                    {opt.label}
                  </Typography>
                  <Typography sx={{ fontSize: 7, color: "#475569", mt: 0.25 }}>
                    {opt.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
          {/* Info rows */}
          {[
            { label: "Core", value: "React 19 + TS 5.8" },
            { label: "ASR Engine", value: "Whisper (local)" },
            { label: "Embedder", value: "MiniLM v2" },
            { label: "Transport", value: "BroadcastChannel" },
          ].map(({ label, value }) => (
            <Box
              key={label}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.75,
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 9,
                  color: "#64748B",
                  fontFamily: "'JetBrains Mono Variable',monospace",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 9,
                  color: "#A5B4FC",
                  fontFamily: "'JetBrains Mono Variable',monospace",
                }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Modal>
  );
}

// ─── Feature card icons & metadata ───────────────────────────────────────────
const FEATURE_CARDS = [
  {
    id: "scripture",
    label: "Scripture",
    sublabel: "DETECTION",
    icon: "📖",
    accentColor: "#34D399",
    glowColor: "rgba(52,211,153,0.12)",
    borderActive: "rgba(52,211,153,0.4)",
  },
  {
    id: "music",
    label: "Music",
    sublabel: "AUDIO ENGINE",
    icon: "🎵",
    accentColor: "#818CF8",
    glowColor: "rgba(129,140,248,0.12)",
    borderActive: "rgba(129,140,248,0.4)",
  },
  {
    id: "transcript",
    label: "Transcript",
    sublabel: "LIVE LOG",
    icon: "📝",
    accentColor: "#60A5FA",
    glowColor: "rgba(96,165,250,0.12)",
    borderActive: "rgba(96,165,250,0.4)",
  },
  {
    id: "translation",
    label: "Translation",
    sublabel: "BIBLE API",
    icon: "🌐",
    accentColor: "#C9973A",
    glowColor: "rgba(201,151,58,0.12)",
    borderActive: "rgba(201,151,58,0.4)",
  },
] as const;
type FeatureId = (typeof FEATURE_CARDS)[number]["id"];

// ─── Transcript History View ──────────────────────────────────────────────────
function TranscriptHistoryView({
  history,
  onSwitchLive,
}: {
  history: TranscriptSegment[];
  onSwitchLive: () => void;
}) {
  const clearHistory = useSoundStore((s) => s.clearHistory);
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
            fontFamily: "'JetBrains Mono Variable',monospace",
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
              fontFamily: "'JetBrains Mono Variable',monospace",
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
                      fontFamily: "'JetBrains Mono Variable',monospace",
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
                        fontFamily: "'JetBrains Mono Variable',monospace",
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

// ─── Main Component ───────────────────────────────────────────────────────────
export const OperatorPage: React.FC = () => {
  const {
    transcript,
    recentChunk,
    matchRange,
    setMatchRange,
    transcriptHistory,
    transcriptView,
    setTranscriptView,
  } = useSoundStore();
  const { results: searchResults, relatedReferences, activeVerse } = useScriptureStore();
  const { projectVerse, clearProjection, currentVerse: currentLiveVerse } = useProjection();

  const queue = useProjectionStore((s) => s.queue);
  const addToQueue = useProjectionStore((s) => s.addToQueue);
  const setQueue = useProjectionStore((s) => s.setQueue);
  const removeFromQueue = useProjectionStore((s) => s.removeFromQueue);

  const {
    isProcessing,
    audioLevel,
    isListening,
    detectedVerse,
    whisperLoaded,
    semanticLoaded,
    pushToProjection,
    searchUtterance,
    searchPreview,
    searchReferences,
    findRelated,
    frequencyData,
    startListening,
    stopListening,
  } = useOrchestrator();

  const [mode, setMode] = useState<(typeof MODES)[number]>("Scripture");
  const [aoTranslationName, setAoTranslationName] = useState("KJV");
  const aoFetchKeyRef = useRef("");
  const [elapsed, setElapsed] = useState(0);
  const [previewVerse, setPreviewVerse] = useState<Verse | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DetectionEntry[]>([]);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [selectedSearchRef, setSelectedSearchRef] = useState<string | null>(null);
  const prevDetectedRef = useRef<string | null>(null);
  const {
    launchProjection,
    isActive: isProjectorConnected,
    sendMessage,
  } = usePresentationController("/projection");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  // Holds the latest transcript text WITHOUT being a dependency of the
  // verse-detection effect below (fixes "Maximum update depth exceeded").
  const lastTranscriptTextRef = useRef(transcript);

  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const chapterBookRef = useRef<string | null>(null);
  const chapterNumRef = useRef<number | null>(null);
  const [verseHistory, setVerseHistory] = useState<Verse[]>([]);
  const [queuePage, setQueuePage] = useState(0);
  useEffect(() => {
    setQueuePage((p) => Math.min(p, Math.max(0, Math.ceil(queue.length / 10) - 1)));
  }, [queue.length]);

  // ── NEW state ──────────────────────────────────────────────────────────────
  const [activeTheme, setActiveTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem("mentalist-operator-theme");
    return saved && saved in THEMES ? (saved as ThemeKey) : "midnight";
  });
  useEffect(() => {
    localStorage.setItem("mentalist-operator-theme", activeTheme);
  }, [activeTheme]);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<FeatureId>("scripture");
  const theme = THEMES[activeTheme];

  const addToVerseHistory = useCallback((verse: Verse | null) => {
    if (!verse) return;
    const ref = verse.reference || verse.ref || "";
    if (!ref) return;
    setVerseHistory((prev) => {
      const filtered = prev.filter((v) => (v.reference || v.ref) !== ref);
      return [verse, ...filtered].slice(0, 30);
    });
  }, []);

  const {
    translations: aoTranslations,
    activeTranslation: aoActiveTranslation,
    setActiveTranslation: aoSetActiveTranslation,
    loadPassage,
    getBookCode,
  } = useBibleEngine("BSB");

  const navigateVerse = (dir: "prev" | "next") => {
    if (chapterVerses.length === 0) return;
    setPreviewIdx((i) => {
      const next =
        dir === "next"
          ? (i + 1) % chapterVerses.length
          : i === 0
            ? chapterVerses.length - 1
            : i - 1;
      addToVerseHistory(chapterVerses[next]);
      return next;
    });
  };

  useEffect(() => {
    const src = previewVerse || activeVerse || detectedVerse;
    if (!src) return;
    const book = src.book || "";
    const ch = src.chapter || 0;
    if (!book || !ch) return;
    const fetchKey = `${aoActiveTranslation}|${book}|${ch}`;
    if (
      book === chapterBookRef.current &&
      ch === chapterNumRef.current &&
      fetchKey === aoFetchKeyRef.current
    )
      return;
    const aoCode = getBookCode(book);
    if (aoCode) {
      let cancelled = false;
      BibleApiService.getChapter(aoActiveTranslation, aoCode, ch)
        .then((data) => {
          if (cancelled) return;
          const verses = aoChapterToVerses(data, book);
          setChapterVerses(verses);
          const idx = verses.findIndex((v) => v.verse === src.verse);
          setPreviewIdx(idx >= 0 ? idx : 0);
          chapterBookRef.current = book;
          chapterNumRef.current = ch;
          aoFetchKeyRef.current = fetchKey;
        })
        .catch(() => {
          if (cancelled) return;
          fallbackToKJV(book, ch, src.verse || 0);
          chapterBookRef.current = book;
          chapterNumRef.current = ch;
          aoFetchKeyRef.current = fetchKey;
        });
      return () => {
        cancelled = true;
      };
    } else {
      fallbackToKJV(book, ch, src.verse || 0);
    }
  }, [previewVerse, activeVerse, detectedVerse, aoActiveTranslation]);

  function fallbackToKJV(book: string, ch: number, verseNum: number) {
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
      const idx = verses.findIndex((v) => v.v === verseNum);
      setPreviewIdx(idx >= 0 ? idx : 0);
    }
  }

  function getTranslationLabel(code: string, translations: TranslationMeta[]): string {
    const hardcoded: Record<string, string> = {
      BSB: "Berean Standard Bible (BSB)",
      ENGWEBP: "World English Bible (WEB)",
      eng_net: "NET Bible (NET)",
    };
    if (hardcoded[code]) return hardcoded[code];
    const found = translations.find((t) => t.id === code);
    if (found) return `${found.englishName || found.name} (${found.shortName || found.id})`;
    return code;
  }

  useEffect(() => {
    setAoTranslationName(getTranslationLabel(aoActiveTranslation, aoTranslations));
  }, [aoActiveTranslation, aoTranslations]);
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript, recentChunk]);

  // Keep a ref to the latest transcript text so the verse-detection effect
  // below can read it WITHOUT depending on it (transcript changes on nearly
  // every word while listening, which was causing the update loop).
  useEffect(() => {
    lastTranscriptTextRef.current = transcript;
  }, [transcript]);

  // ─────────────────────────────────────────────────────────────────────────
  // FIXED: this used to depend on [detectedVerse, transcript] and call
  // setPreviewVerse / addToVerseHistory unconditionally on every fire, which
  // (combined with transcript updating on almost every render while
  // listening) caused "Maximum update depth exceeded". Now it depends only
  // on detectedVerse, and bails out immediately unless the detected
  // reference has actually changed.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!detectedVerse) return;
    const ref = detectedVerse.ref || detectedVerse.reference || "";
    if (!ref || ref === prevDetectedRef.current) return;

    prevDetectedRef.current = ref;
    setPreviewVerse(detectedVerse);
    addToVerseHistory(detectedVerse);

    const now = new Date();
    setDetectionHistory((prev) => [
      {
        ref,
        stage: "regex",
        confidence: 94,
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        spokenAs: lastTranscriptTextRef.current
          ? lastTranscriptTextRef.current.slice(0, 80)
          : ref,
      },
      ...prev.slice(0, 49),
    ]);
  }, [detectedVerse, addToVerseHistory]);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    return () => channelRef.current?.close();
  }, []);
  useEffect(() => {
    if (currentLiveVerse) sendMessage({ type: "PROJECT_VERSE", verse: currentLiveVerse });
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
    const aoCode = getBookCode(book);
    if (aoCode && aoActiveTranslation) {
      BibleApiService.getChapter(aoActiveTranslation, aoCode, chapter)
        .then((data) => {
          const all = aoChapterToVerses(data, book);
          setQueue(all.filter((v) => v.verse > verseNum));
        })
        .catch(() => {
          const all = lookupEngine.getChapter(book, chapter);
          if (!all || all.length === 0) return;
          setQueue(
            all
              .filter((v) => v.v > verseNum)
              .map((v) => ({
                reference: `${v.b} ${v.c}:${v.v}`,
                ref: `${v.b} ${v.c}:${v.v}`,
                text: v.t,
                book: v.b,
                chapter: v.c,
                verse: v.v,
                translation: "KJV",
              })),
          );
        });
    } else {
      const all = lookupEngine.getChapter(book, chapter);
      if (!all || all.length === 0) return;
      setQueue(
        all
          .filter((v) => v.v > verseNum)
          .map((v) => ({
            reference: `${v.b} ${v.c}:${v.v}`,
            ref: `${v.b} ${v.c}:${v.v}`,
            text: v.t,
            book: v.b,
            chapter: v.c,
            verse: v.v,
            translation: "KJV",
          })),
      );
    }
  }, [currentLiveVerse, aoActiveTranslation, setQueue]);

  const handlePushLive = () => {
    const verse = chapterVerses[previewIdx] || previewVerse || activeVerse || detectedVerse;
    if (verse) {
      addToVerseHistory(verse);
      pushToProjection(verse);
    }
  };

  const togglingRef = useRef(false);
  const handleToggleMic = () => {
    if (togglingRef.current) return;
    togglingRef.current = true;
    if (isListening) stopListening();
    else startListening();
    setTimeout(() => {
      togglingRef.current = false;
    }, 600);
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
        height: "100vh",
        overflow: "hidden",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter',system-ui,sans-serif",
        WebkitFontSmoothing: "antialiased",
        position: "relative",
        bgcolor: theme.bg,
      }}
    >
      <FloatingOrbs accentColor={theme.accent} />

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      <ThemeModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        activeTheme={activeTheme}
        theme={theme}
        onSelect={setActiveTheme}
      />
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        matchRange={matchRange}
        setMatchRange={setMatchRange}
        theme={theme}
      />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <Paper
        elevation={3}
        sx={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 1.5, md: 2.5 },
          borderRadius: 0,
          bgcolor: `${theme.bg}d9`,
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${theme.border}`,
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        {/* Left */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 } }}>
          <Box
            sx={{
              width: { xs: 26, md: 30 },
              height: { xs: 26, md: 30 },
              borderRadius: 1.5,
              background: "linear-gradient(135deg,#C9973A,#FFD580)",
              boxShadow: "0 4px 12px rgba(201,151,58,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: { xs: 10, md: 11 },
              color: "#080D1C",
              flexShrink: 0,
            }}
          >
            D
          </Box>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.01em" }}>
              D'mentalist
            </Typography>
            <Typography
              sx={{
                fontSize: 8,
                color: "text.disabled",
                fontFamily: "'JetBrains Mono Variable',monospace",
                letterSpacing: "0.05em",
              }}
            >
              AI SCRIPTURE ENGINE v1.2
            </Typography>
          </Box>

          {/* Mode tabs */}
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, v) => v && setMode(v)}
            size="small"
            sx={{
              display: { xs: "none", md: "inline-flex" },
              ml: 1,
              pl: 2,
              borderLeft: `1px solid ${theme.border}`,
              "& .MuiToggleButton-root": {
                px: 1.5,
                py: 0.4,
                fontSize: 10,
                fontWeight: 500,
                borderColor: "transparent",
                color: "#64748B",
                "&.Mui-selected": {
                  bgcolor: `${theme.accent}1f`,
                  color: theme.accent,
                  borderColor: `${theme.accent}33`,
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

          {/* ── NEW: Theme & Settings nav buttons ─────────────────────────── */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 0.75,
              ml: 1,
              pl: 1.5,
              borderLeft: "1px solid rgba(45,58,92,0.3)",
            }}
          >
            <Tooltip title="Display theme">
              <Button
                onClick={() => setThemeModalOpen(true)}
                size="small"
                sx={{
                  minWidth: 0,
                  px: 1.25,
                  py: 0.4,
                  fontSize: 9,
                  fontWeight: 500,
                  color: "#64748B",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 1.5,
                  bgcolor: "rgba(26,32,53,0.3)",
                  backdropFilter: "blur(8px)",
                  gap: 0.75,
                  "&:hover": {
                    borderColor: `${theme.accent}60`,
                    color: theme.accent,
                    bgcolor: `${theme.accent}0d`,
                  },
                  transition: "all 0.15s",
                }}
              >
                <Box sx={{ fontSize: 11 }}>🎨</Box>
                <Typography
                  sx={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono Variable',monospace",
                    fontWeight: 500,
                  }}
                >
                  Theme
                </Typography>
              </Button>
            </Tooltip>
            <Tooltip title="Engine settings">
              <Button
                onClick={() => setSettingsModalOpen(true)}
                size="small"
                sx={{
                  minWidth: 0,
                  px: 1.25,
                  py: 0.4,
                  fontSize: 9,
                  fontWeight: 500,
                  color: "#64748B",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 1.5,
                  bgcolor: "rgba(26,32,53,0.3)",
                  backdropFilter: "blur(8px)",
                  gap: 0.75,
                  "&:hover": {
                    borderColor: "rgba(129,140,248,0.4)",
                    color: "#818CF8",
                    bgcolor: "rgba(129,140,248,0.08)",
                  },
                  transition: "all 0.15s",
                }}
              >
                <Box sx={{ fontSize: 11 }}>⚙️</Box>
                <Typography
                  sx={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono Variable',monospace",
                    fontWeight: 500,
                  }}
                >
                  Settings
                </Typography>
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {/* Right */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, md: 1.25 } }}>
          <Paper
            variant="outlined"
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.4,
              bgcolor: theme.cardBg,
              backdropFilter: "blur(12px)",
              borderColor: theme.border,
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
                  fontFamily: "'JetBrains Mono Variable',monospace",
                  bgcolor: matchRange === opt.value ? `${theme.accent}1f` : "transparent",
                  color: matchRange === opt.value ? theme.accent : "#64748B",
                  "&:hover": { color: matchRange === opt.value ? theme.accent : "#CBD5E1" },
                }}
              />
            ))}
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              gap: 1.5,
              px: 1.5,
              py: 0.6,
              bgcolor: theme.cardBg,
              backdropFilter: "blur(12px)",
              borderColor: theme.border,
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
                fontFamily: "'JetBrains Mono Variable',monospace",
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
                fontFamily: "'JetBrains Mono Variable',monospace",
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
                fontFamily: "'JetBrains Mono Variable',monospace",
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
                fontFamily: "'JetBrains Mono Variable',monospace",
                color: `${theme.accent}`,
                bgcolor: `${theme.accent}1a`,
                border: `1px solid ${theme.accent}4d`,
                "&:hover": { bgcolor: `${theme.accent}26` },
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
              px: 1.5,
              borderColor: isProjectorConnected ? "rgba(16,185,129,0.3)" : `${theme.accent}4d`,
              color: isProjectorConnected ? "#34D399" : theme.accent,
              bgcolor: theme.cardBg,
              "&:hover": { bgcolor: `${theme.accent}14`, borderColor: theme.accent },
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
                  animation: isListening ? "ping 1s cubic-bezier(0,0,0.2,1) infinite" : "none",
                  filter: isListening ? "drop-shadow(0 0 6px rgba(244,63,94,0.8))" : "none",
                }}
              />
            }
            sx={{
              fontSize: { xs: 9, md: 11 },
              px: { xs: 1, md: 1.5 },
              borderColor: isListening ? "rgba(244,63,94,0.3)" : theme.border,
              color: isListening ? "#FB7185" : "#CBD5E1",
              bgcolor: isListening ? "rgba(244,63,94,0.1)" : theme.cardBg,
              "&:hover": isListening
                ? { bgcolor: "rgba(244,63,94,0.15)" }
                : { bgcolor: theme.cardBg },
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
            sx={{ borderColor: theme.border, display: { xs: "none", md: "block" } }}
          />

          <Button
            variant="contained"
            disabled={!displayVerse}
            onClick={handlePushLive}
            sx={{
              fontSize: { xs: 9, md: 11 },
              px: { xs: 1.5, md: 2 },
              background: "linear-gradient(135deg,#C9973A,#FFD580)",
              boxShadow: displayVerse
                ? "0 0 20px rgba(201,151,58,0.25),0 4px 12px rgba(201,151,58,0.15)"
                : "none",
              "&:hover:not(:disabled)": {
                background: "linear-gradient(135deg,#C9973A,#FFD580)",
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

      {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(12,1fr)" },
          gap: { xs: 2, md: 3 },
          p: { xs: 1.5, md: 3 },
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* LEFT SIDEBAR */}
        <Box
          sx={{
            gridColumn: { xs: "span 12", md: "span 4", lg: "span 3" },
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* ═══════════════════════════════════════════════════ */}
          {/* ENHANCED LIVE TRANSCRIPT WITH FREQUENCY FLOW */}
          {/* ═══════════════════════════════════════════════════ */}
          <GlassPaper
            sx={{
              display: "flex",
              flexDirection: "column",
              minHeight: 200,
              height: { md: 280 },
              p: 2,
              background: theme.cardBg,
              borderColor: theme.border,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.5,
                borderBottom: `1px solid ${theme.border}`,
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
                      "linear-gradient(180deg,rgba(52,211,153,0.8) 0%,rgba(52,211,153,0.2) 100%)",
                  }}
                />
                <CinemaLabel>Live Transcript</CinemaLabel>
                <Typography
                  sx={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono Variable',monospace",
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
                      fontFamily: "'JetBrains Mono Variable',monospace",
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
                    fontFamily: "'JetBrains Mono Variable',monospace",
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
                    fontFamily: "'JetBrains Mono Variable',monospace",
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

            {/* ─── FREQUENCY FLOW / WAVEFORM VISUALIZATION ─── */}
            <Box
              sx={{
                height: 48,
                mb: 1.5,
                display: "flex",
                alignItems: "flex-end",
                gap: "1px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {(() => {
                const fft = frequencyData;
                const barCount = 50;
                const isActive = isListening && fft && fft.length > 0;
                const step =
                  fft && fft.length > 0 ? Math.max(1, Math.floor(fft.length / barCount)) : 1;

                return Array.from({ length: barCount }, (_, i) => {
                  let height;
                  if (isActive && fft) {
                    const bin = Math.min(i * step, fft.length - 1);
                    const val = fft[bin] / 255;
                    height = Math.max(4, Math.min(100, Math.pow(val, 0.6) * 100));
                  } else {
                    height = 6 + (i % 5) * 2;
                  }

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

            {/* ─── LIVE TRANSCRIPT CONTENT ─── */}
            <Box
              ref={transcriptRef}
              sx={{
                flex: 1,
                overflowY: "auto",
                fontFamily: "'JetBrains Mono Variable',monospace",
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
                  {/* Main transcript with real-time updates */}
                  {(transcript || recentChunk) && (
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontFamily: "'JetBrains Mono Variable',monospace",
                        fontSize: 11,
                        position: "relative",
                      }}
                    >
                      {transcript}
                      {/* Glowing recent chunk effect - from first code */}
                      {recentChunk && !transcript?.includes(recentChunk) && (
                        <Box
                          component="span"
                          sx={{
                            color: "#60A5FA",
                            fontWeight: 500,
                            bgcolor: "rgba(59,130,246,0.05)",
                            px: 0.5,
                            borderRadius: 0.5,
                            position: "relative",
                            "&::after": {
                              content: '""',
                              position: "absolute",
                              bottom: -2,
                              left: 0,
                              right: 0,
                              height: "2px",
                              background: "linear-gradient(90deg, #60A5FA, transparent)",
                              animation: "pulse 1.5s ease-in-out infinite",
                            },
                          }}
                        >
                          {recentChunk}
                        </Box>
                      )}
                    </Typography>
                  )}

                  {/* Detected verse indicator */}
                  {detectedVerse && (
                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        borderTop: `1px solid ${theme.border}`,
                        pt: 1,
                      }}
                    >
                      <Chip
                        label="✓ Detected"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono Variable',monospace",
                          bgcolor: "transparent",
                          color: "#34D399",
                          p: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          color: "#fff",
                          fontWeight: 500,
                          fontFamily: "'JetBrains Mono Variable',monospace",
                          fontSize: 9,
                        }}
                      >
                        {detectedVerse.reference}
                      </Typography>
                      <Typography
                        sx={{
                          color: "text.disabled",
                          fontFamily: "'JetBrains Mono Variable',monospace",
                          fontSize: 9,
                        }}
                      >
                        · {detectedVerse.confidence || 94}% confidence
                      </Typography>
                    </Box>
                  )}

                  {/* Audio level indicator - from first code */}
                  {audioLevel !== undefined && audioLevel > 0 && (
                    <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          flex: 1,
                          height: 2,
                          background: `linear-gradient(90deg, #10B981, ${audioLevel > 0.5 ? "#F59E0B" : "#10B981"})`,
                          transition: "width 0.1s",
                          borderRadius: 1,
                          position: "relative",
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            right: 0,
                            top: -2,
                            width: 4,
                            height: 6,
                            borderRadius: 1,
                            background: audioLevel > 0.5 ? "#F59E0B" : "#10B981",
                            opacity: 0.7,
                          },
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: 8,
                          color: "text.disabled",
                          minWidth: 32,
                          textAlign: "right",
                        }}
                      >
                        {Math.round(audioLevel * 100)}%
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
                    fontFamily: "'JetBrains Mono Variable',monospace",
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
              fontFamily: "'JetBrains Mono Variable',monospace",
              fontSize: 10,
              color: "text.secondary",
              background: theme.cardBg,
              borderColor: theme.border,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderBottom: `1px solid ${theme.border}`,
                pb: 1,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 12,
                  borderRadius: 1,
                  background: "linear-gradient(180deg,#C9973A 0%,rgba(201,151,58,0.3) 100%)",
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
                  fontFamily: "'JetBrains Mono Variable',monospace",
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
                  fontFamily: "'JetBrains Mono Variable',monospace",
                  color: "#CBD5E1",
                  height: 24,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.border },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: `${theme.accent}66` },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: `${theme.accent}66`,
                  },
                  "& .MuiSelect-icon": { color: "#64748B", fontSize: 16 },
                }}
              >
                {MATCH_RANGE_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    sx={{ fontSize: 10, fontFamily: "'JetBrains Mono Variable',monospace" }}
                  >
                    {opt.label} — {opt.description}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            {[
              {
                label: "Whisper ASR",
                loaded: whisperLoaded,
                color: whisperLoaded ? "#10B981" : "#475569",
                glow: "rgba(16,185,129,0.6)",
                chipColor: whisperLoaded ? "#34D399" : "text.disabled",
                chipLabel: whisperLoaded ? "Connected" : "Loading",
              },
              {
                label: "Embedder",
                loaded: semanticLoaded,
                color: semanticLoaded ? "#818CF8" : "#475569",
                glow: "rgba(129,140,248,0.6)",
                chipColor: semanticLoaded ? "#818CF8" : "text.disabled",
                chipLabel: semanticLoaded ? "Vector Ready" : "Loading",
              },
            ].map(({ label, loaded, color, glow, chipColor, chipLabel }) => (
              <Box
                key={label}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    color: "text.disabled",
                    fontFamily: "'JetBrains Mono Variable',monospace",
                    fontSize: 9,
                  }}
                >
                  {label}
                </Typography>
                <Chip
                  label={chipLabel}
                  size="small"
                  icon={
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: color,
                        filter: loaded ? `drop-shadow(0 0 6px ${glow})` : "none",
                      }}
                    />
                  }
                  sx={{
                    height: 20,
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono Variable',monospace",
                    bgcolor: "transparent",
                    color: chipColor,
                  }}
                />
              </Box>
            ))}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography
                sx={{
                  color: "text.disabled",
                  fontFamily: "'JetBrains Mono Variable',monospace",
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
                  fontFamily: "'JetBrains Mono Variable',monospace",
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
                borderTop: `1px solid ${theme.border}`,
                mt: 1,
              }}
            >
              <Typography
                sx={{
                  color: "text.disabled",
                  fontFamily: "'JetBrains Mono Variable',monospace",
                  fontSize: 9,
                }}
              >
                Session
              </Typography>
              <Typography
                sx={{
                  color: "text.primary",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono Variable',monospace",
                  fontSize: 9,
                }}
              >
                {formatSessionTime()}
              </Typography>
            </Box>
          </GlassPaper>

          {/* Scripture Search */}
          <GlassPaper sx={{ p: 2, background: theme.cardBg, borderColor: theme.border }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderBottom: `1px solid ${theme.border}`,
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
                    "linear-gradient(180deg,rgba(52,211,153,0.8) 0%,rgba(52,211,153,0.2) 100%)",
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
                    fontFamily: "'JetBrains Mono Variable',monospace",
                    bgcolor: theme.cardBg,
                    color: "#E2E8F0",
                    "& fieldset": { borderColor: theme.border },
                    "&:hover fieldset": { borderColor: `${theme.accent}66` },
                    "&.Mui-focused fieldset": { borderColor: `${theme.accent}66` },
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
                  borderTop: `1px solid ${theme.border}`,
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
                        addToVerseHistory(v);
                        await searchPreview(text ? `${ref} ${text}` : ref);
                        findRelated(text || ref);
                      }}
                      sx={{
                        justifyContent: "flex-start",
                        textAlign: "left",
                        p: 1,
                        borderRadius: 1.5,
                        textTransform: "none",
                        bgcolor: isSelected ? `${theme.accent}1a` : theme.cardBg,
                        border: isSelected
                          ? `1px solid ${theme.accent}4d`
                          : `1px solid ${theme.border}`,
                        "&:hover": { bgcolor: theme.cardBg, borderColor: theme.border },
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
                              fontFamily: "'JetBrains Mono Variable',monospace",
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
              <Box sx={{ mt: 1, borderTop: `1px solid ${theme.border}`, pt: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 2,
                      height: 12,
                      borderRadius: 1,
                      background: "linear-gradient(180deg,#4F6BFF 0%,rgba(79,107,255,0.3) 100%)",
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
                          addToVerseHistory(r);
                          await searchPreview(ref);
                        }}
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          p: 0.75,
                          borderRadius: 0.5,
                          textTransform: "none",
                          bgcolor: theme.cardBg,
                          border: `1px solid ${theme.border}`,
                          "&:hover": { bgcolor: "rgba(99,102,241,0.1)" },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono Variable',monospace",
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

        {/* RIGHT CONTENT */}
        <Box
          sx={{
            gridColumn: { xs: "span 12", md: "span 8", lg: "span 9" },
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
            gap: 0,
          }}
        >
          {mode === "Scripture" ? (
            <>
              {/* Top panels — fixed zone, clips at the divider */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", lg: "row" },
                  gap: { xs: 2, md: 3 },
                  flex: "0 0 auto",
                  overflow: "hidden",
                  minHeight: 0,
                  maxHeight: "calc(100% - 100px)",
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" },
                    gap: { xs: 2, md: 3 },
                    overflow: "hidden",
                  }}
                >
                  {/* PREVIEW */}
                  <Box
                    sx={{
                      bgcolor: "#0B0F1C",
                      p: "14px",
                      borderRadius: "14px",
                      border: "3px solid rgba(255,255,255)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      "& .verse-text": { color: "#E2E8F0 !important" },
                      "& .verse-ref": { color: "#C9973A !important" },
                      "& .verse-next": { color: "#E2E8F0 !important" },
                      "& .MuiButton-root": {
                        bgcolor: "rgba(255,255,255,0.06) !important",
                        color: "#CBD5E1 !important",
                        border: "1px solid rgba(255,255,255,0.1) !important",
                        "&:hover": {
                          bgcolor: "rgba(255,255,255,0.1) !important",
                          color: "#F1F5F9 !important",
                        },
                      },
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
                      translation={aoTranslationName}
                      actions={
                        <>
                          <Button
                            size="small"
                            onClick={() => navigateVerse("prev")}
                            sx={{
                              fontSize: 9,
                              bgcolor: "rgba(255,255,255,0.06)",
                              color: "#CBD5E1",
                              border: "1px solid rgba(255,255,255,0.1)",
                              "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "#F1F5F9" },
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
                              bgcolor: "rgba(255,255,255,0.06)",
                              color: "#CBD5E1",
                              border: "1px solid rgba(255,255,255,0.1)",
                              "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "#F1F5F9" },
                            }}
                          >
                            Next &rarr;
                          </Button>
                          <Divider
                            orientation="vertical"
                            flexItem
                            sx={{ borderColor: "rgba(255,255,255,0.08)" }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!displayVerse}
                            onClick={handlePushLive}
                            sx={{
                              fontSize: 9,
                              bgcolor: "#C9973A",
                              color: "#fff",
                              "&:hover": { bgcolor: "#b8862d" },
                              "&.Mui-disabled": {
                                bgcolor: "rgba(255,255,255,0.06)",
                                color: "#475569",
                              },
                            }}
                          >
                            Transmit Live &rarr;
                          </Button>
                        </>
                      }
                    />
                  </Box>

                  {/* LIVE FEED */}
                  <Box
                    sx={{
                      bgcolor: "#0B0F1C",
                      p: "10px",
                      borderRadius: "14px",
                      border: "3px solid rgba(255,255,255)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      "& .verse-text": { color: "#E2E8F0 !important" },
                      "& .verse-ref": { color: "#C9973A !important" },
                      "& .MuiButton-root": {
                        bgcolor: "rgba(255,255,255,0.06) !important",
                        color: "#CBD5E1 !important",
                        border: "1px solid rgba(255,255,255,0.1) !important",
                        "&:hover": {
                          bgcolor: "rgba(255,255,255,0.1) !important",
                          color: "#F1F5F9 !important",
                        },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                        mb: 0.5,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            bgcolor: currentLiveVerse ? "#EF4444" : "#94a3b8",
                            animation: currentLiveVerse ? "ping 1s infinite" : "none",
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: currentLiveVerse ? "#EF4444" : "#94a3b8",
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
                              bgcolor: "#f1f5f9",
                              color: "#1e293b",
                              border: "1px solid #e2e8f0",
                              "&:hover": { bgcolor: "#e2e8f0", color: "#0f172a" },
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
                            bgcolor: "#f1f5f9",
                            color: "#1e293b",
                            border: "1px solid #e2e8f0",
                            "&:hover": { bgcolor: "#e2e8f0", color: "#0f172a" },
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
                      translation={aoTranslationName}
                    />
                    {currentLiveVerse && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.75,
                          fontSize: 8,
                          color: "#EF4444",
                          pt: 0.5,
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            bgcolor: "#EF4444",
                            animation: "pulse 2s infinite",
                          }}
                        />
                        <span style={{ fontSize: 8 }}>LIVE</span>
                        <Typography sx={{ fontSize: 8, color: "#94a3b8" }} component="span">
                          ·
                        </Typography>
                        <Typography sx={{ fontSize: 8, color: "#64748b" }} component="span">
                          {formatSessionTime()}
                        </Typography>
                      </Box>
                    )}
                    {!currentLiveVerse && queue.length > 0 && (
                      <Box
                        sx={{
                          textAlign: "center",
                          fontSize: 8,
                          color: "#94a3b8",
                          pt: 0.5,
                          flexShrink: 0,
                        }}
                      >
                        <Typography sx={{ color: "#94a3b8", fontSize: 8 }} component="span">
                          ●
                        </Typography>
                        <Typography
                          sx={{ ml: 0.5, fontSize: 8, color: "#64748b" }}
                          component="span"
                        >
                          {queue.length} verse{queue.length > 1 ? "s" : ""} in queue
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* QUEUE */}
                <Box
                  sx={{
                    width: 220,
                    flexShrink: 0,
                    display: { xs: "none", lg: "flex" },
                    flexDirection: "column",
                    bgcolor: theme.cardBg,
                    borderRadius: 2,
                    overflow: "hidden",
                    position: "relative",
                    border: `1px solid ${theme.border}`,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: "5%",
                      bottom: "5%",
                      width: 1,
                      background:
                        "linear-gradient(180deg,transparent,rgba(201,151,58,0.25),transparent)",
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
                      borderBottom: `1px solid ${theme.border}`,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 3,
                        height: 12,
                        borderRadius: 1,
                        background: "linear-gradient(180deg,#FFD580 0%,rgba(201,151,58,0.3) 100%)",
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#FFD580",
                        fontFamily: "'JetBrains Mono Variable',monospace",
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
                          fontFamily: "'JetBrains Mono Variable',monospace",
                          bgcolor: "rgba(30,41,59,0.5)",
                          color: "#94A3B8",
                        }}
                      />
                    )}
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 0.5,
                      p: 1,
                      overflowY: "auto",
                      minHeight: 0,
                      alignContent: "start",
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
                          gridColumn: "1 / -1",
                        }}
                      >
                        <Typography
                          sx={{ fontSize: 9, color: "text.disabled", fontStyle: "italic" }}
                        >
                          Remaining verses appear here
                        </Typography>
                      </Box>
                    ) : (
                      (() => {
                        const perPage = 10;
                        const totalPages = Math.max(1, Math.ceil(queue.length / perPage));
                        const safePage = queuePage >= totalPages ? totalPages - 1 : queuePage;
                        const start = safePage * perPage;
                        const pageItems = queue.slice(start, start + perPage);
                        return pageItems.map((v, i) => {
                          const globalIdx = start + i;
                          return (
                            <Paper
                              key={`${v.reference || v.ref}-${globalIdx}`}
                              variant="outlined"
                              onClick={() => {
                                projectVerse(v);
                                removeFromQueue(globalIdx);
                              }}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                px: 0.5,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: theme.cardBg,
                                borderColor: theme.border,
                                cursor: "pointer",
                                textAlign: "center",
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
                                  fontFamily: "'JetBrains Mono Variable',monospace",
                                }}
                              >
                                {v.reference || v.ref}
                              </Typography>
                            </Paper>
                          );
                        });
                      })()
                    )}
                  </Box>
                  {queue.length > 0 && (
                    <Box
                      sx={{
                        px: 1.5,
                        pb: 1,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box
                          component="button"
                          onClick={() => setQueuePage((p) => Math.max(0, p - 1))}
                          disabled={queuePage === 0}
                          sx={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono Variable',monospace",
                            border: "none",
                            bgcolor: "transparent",
                            color: queuePage === 0 ? "#475569" : "#C9973A",
                            cursor: queuePage === 0 ? "default" : "pointer",
                            "&:hover:not(:disabled)": { color: "#FFD580" },
                          }}
                        >
                          &larr; Prev
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono Variable',monospace",
                            color: "#64748B",
                          }}
                        >
                          {queuePage * 10 + 1}&ndash;{Math.min((queuePage + 1) * 10, queue.length)}{" "}
                          / {queue.length}
                        </Typography>
                        <Box
                          component="button"
                          onClick={() =>
                            setQueuePage((p) => Math.min(Math.ceil(queue.length / 10) - 1, p + 1))
                          }
                          disabled={(queuePage + 1) * 10 >= queue.length}
                          sx={{
                            fontSize: 8,
                            fontFamily: "'JetBrains Mono Variable',monospace",
                            border: "none",
                            bgcolor: "transparent",
                            color: (queuePage + 1) * 10 >= queue.length ? "#475569" : "#C9973A",
                            cursor: (queuePage + 1) * 10 >= queue.length ? "default" : "pointer",
                            "&:hover:not(:disabled)": { color: "#FFD580" },
                          }}
                        >
                          Next &rarr;
                        </Box>
                      </Box>
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setQueuePage(0);
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

              {/* ══════════════ MASTER DIVIDER LINE ══════════════ */}
              <Box sx={{ position: "relative", flexShrink: 0, my: 1.5, mx: -3 }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    height: "1px",
                    top: "50%",
                    background: `linear-gradient(90deg, transparent 0%, ${theme.accent}40 20%, ${theme.accent}90 50%, ${theme.accent}40 80%, transparent 100%)`,
                    filter: "blur(1px)",
                  }}
                />
                <Box
                  sx={{
                    height: "1px",
                    width: "100%",
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 8%, rgba(255,255,255,0.22) 30%, ${theme.accent}cc 50%, rgba(255,255,255,0.22) 70%, rgba(255,255,255,0.08) 92%, transparent 100%)`,
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: theme.accent,
                    boxShadow: `0 0 10px ${theme.accent}, 0 0 20px ${theme.accent}80`,
                  }}
                />
                <Typography
                  sx={{
                    position: "absolute",
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 7,
                    fontFamily: "'JetBrains Mono Variable',monospace",
                    color: `${theme.accent}99`,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  BROADCAST CONSOLE
                </Typography>
                <Typography
                  sx={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 7,
                    fontFamily: "'JetBrains Mono Variable',monospace",
                    color: "rgba(255,255,255,0.2)",
                    letterSpacing: "0.1em",
                  }}
                >
                  QUICK ACCESS
                </Typography>
              </Box>

              {/* ══════════════ FOUR FEATURE CARDS ══════════════ */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 1.5,
                  flexShrink: 0,
                }}
              >
                {FEATURE_CARDS.map((card) => {
                  const isActive = activeFeature === card.id;
                  const isTranslation = card.id === "translation";
                  return (
                    <Box
                      key={card.id}
                      onClick={() => {
                        if (isTranslation) return;
                        setActiveFeature(card.id as FeatureId);
                        if (card.id === "scripture") {
                          setMode("Scripture");
                          setTimeout(() => searchInputRef.current?.focus(), 50);
                        } else if (card.id === "music") {
                          setMode("Music");
                        } else if (card.id === "transcript") {
                          setTranscriptView("live");
                          setTimeout(
                            () =>
                              transcriptRef.current?.scrollTo({
                                top: transcriptRef.current.scrollHeight,
                                behavior: "smooth",
                              }),
                            50,
                          );
                        }
                      }}
                      sx={{
                        position: "relative",
                        p: "10px 14px",
                        borderRadius: 2,
                        border: isActive
                          ? `1px solid ${card.borderActive}`
                          : "1px solid rgba(255,255,255,0.07)",
                        bgcolor: isActive ? card.glowColor : theme.cardBg,
                        backdropFilter: "blur(12px)",
                        cursor: isTranslation ? "default" : "pointer",
                        transition: "all 0.18s ease",
                        overflow: "hidden",
                        boxShadow: isActive
                          ? `0 0 20px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`
                          : "inset 0 1px 0 rgba(255,255,255,0.03)",
                        "&:hover": isTranslation
                          ? {}
                          : {
                              borderColor: card.borderActive,
                              bgcolor: card.glowColor,
                              boxShadow: `0 0 16px ${card.glowColor}`,
                            },
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "2px",
                          borderRadius: "2px 2px 0 0",
                          background: isActive
                            ? `linear-gradient(90deg, ${card.accentColor}00, ${card.accentColor}, ${card.accentColor}00)`
                            : "transparent",
                          transition: "background 0.18s",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: isTranslation ? 0.5 : 0,
                        }}
                      >
                        <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{card.icon}</Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: 7,
                              color: isActive ? card.accentColor : "rgba(255,255,255,0.3)",
                              fontFamily: "'JetBrains Mono Variable',monospace",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              lineHeight: 1.2,
                            }}
                          >
                            {card.sublabel}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: isActive ? card.accentColor : "#94A3B8",
                              lineHeight: 1.3,
                              transition: "color 0.18s",
                            }}
                          >
                            {card.label}
                          </Typography>
                        </Box>
                        {isActive && !isTranslation && (
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              bgcolor: card.accentColor,
                              boxShadow: `0 0 8px ${card.accentColor}`,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>

                      {isTranslation && (
                        <Select
                          value={aoActiveTranslation}
                          onChange={(e) => aoSetActiveTranslation(e.target.value)}
                          variant="standard"
                          disableUnderline
                          sx={{
                            color: "#CBD5E1",
                            fontSize: 9,
                            fontWeight: 500,
                            width: "100%",
                            fontFamily: "'JetBrains Mono Variable',monospace",
                            "& .MuiSelect-icon": { color: card.accentColor, fontSize: 14 },
                            "& .MuiSelect-select": { pb: 0 },
                          }}
                        >
                          <MenuItem value="BSB" sx={{ fontSize: 10 }}>
                            Berean Standard Bible (BSB)
                          </MenuItem>
                          <MenuItem value="ENGWEBP" sx={{ fontSize: 10 }}>
                            World English Bible (WEB)
                          </MenuItem>
                          <MenuItem value="eng_net" sx={{ fontSize: 10 }}>
                            NET Bible (NET)
                          </MenuItem>
                          {aoTranslations.slice(0, 15).map((trans) => (
                            <MenuItem key={trans.id} value={trans.id} sx={{ fontSize: 10 }}>
                              {trans.englishName || trans.name} ({trans.shortName || trans.id})
                            </MenuItem>
                          ))}
                        </Select>
                      )}

                      {!isTranslation && (
                        <Typography
                          sx={{
                            fontSize: 7,
                            color: isActive ? `${card.accentColor}aa` : "rgba(255,255,255,0.15)",
                            fontFamily: "'JetBrains Mono Variable',monospace",
                            mt: 0.5,
                            transition: "color 0.18s",
                          }}
                        >
                          {isActive ? "● ACTIVE" : "○ TAP TO OPEN"}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Previous Scriptures */}
              {verseHistory.length > 0 && (
                <GlassPaper
                  sx={{
                    p: 1.5,
                    flexShrink: 0,
                    mt: 1.5,
                    background: theme.cardBg,
                    borderColor: theme.border,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      borderBottom: `1px solid ${theme.border}`,
                      pb: 0.75,
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 12,
                        borderRadius: 1,
                        background: "linear-gradient(180deg,#4F6BFF 0%,rgba(79,107,255,0.3) 100%)",
                      }}
                    />
                    <CinemaLabel>Previous Scriptures</CinemaLabel>
                    <Typography
                      sx={{
                        fontSize: 9,
                        color: "text.disabled",
                        fontFamily: "'JetBrains Mono Variable',monospace",
                        ml: "auto",
                      }}
                    >
                      {verseHistory.length}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setVerseHistory([])}
                      sx={{
                        fontSize: 8,
                        color: "#475569",
                        minWidth: 0,
                        "&:hover": { color: "#FB7185" },
                      }}
                    >
                      Clear
                    </Button>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {verseHistory.map((v) => {
                      const ref = v.reference || v.ref || "";
                      return (
                        <Paper
                          key={ref}
                          variant="outlined"
                          onClick={() => {
                            projectVerse(v);
                            pushToProjection(v);
                            channelRef.current?.postMessage({ type: "PROJECT_VERSE", verse: v });
                            try {
                              localStorage.setItem("mentalist_projection_verse", JSON.stringify(v));
                            } catch {}
                            sendMessage({ type: "PROJECT_VERSE", verse: v });
                          }}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            px: 1.25,
                            py: 0.75,
                            borderRadius: 1.5,
                            bgcolor: theme.cardBg,
                            borderColor: theme.border,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            "&:hover": {
                              bgcolor: "rgba(79,107,255,0.08)",
                              borderColor: "rgba(79,107,255,0.3)",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 2,
                              height: 20,
                              borderRadius: 1,
                              bgcolor: "#4F6BFF",
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontSize: 9,
                                fontWeight: 600,
                                color: "#A5B4FC",
                                fontFamily: "'JetBrains Mono Variable',monospace",
                              }}
                            >
                              {ref}
                            </Typography>
                            {v.text && (
                              <Typography
                                sx={{
                                  fontSize: 8,
                                  color: "text.secondary",
                                  lineHeight: 1.4,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 220,
                                }}
                              >
                                &ldquo;{v.text.slice(0, 80)}&rdquo;
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                </GlassPaper>
              )}
            </>
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
                background: theme.cardBg,
                borderColor: theme.border,
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
                  fontFamily: "'JetBrains Mono Variable',monospace",
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
                background: theme.cardBg,
                borderColor: theme.border,
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
                  fontFamily: "'JetBrains Mono Variable',monospace",
                  bgcolor: "transparent",
                  color: "#475569",
                }}
              />
            </GlassPaper>
          )}
        </Box>
      </Box>

      {/* ── MOBILE QUEUE DRAWER ─────────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={queueDrawerOpen}
        onClose={() => setQueueDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 288,
              bgcolor: `${theme.bg}f5`,
              backdropFilter: "blur(16px)",
              borderLeft: `1px solid ${theme.border}`,
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
                background: "linear-gradient(180deg,#FFD580 0%,rgba(201,151,58,0.3) 100%)",
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
                  fontFamily: "'JetBrains Mono Variable',monospace",
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
              bgcolor: theme.cardBg,
              border: `1px solid ${theme.border}`,
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
                  bgcolor: theme.cardBg,
                  borderColor: theme.border,
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
                      bgcolor: theme.cardBg,
                      border: `1px solid ${theme.border}`,
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