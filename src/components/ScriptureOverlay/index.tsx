import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useScriptureStore } from "../../store/scriptureStore";
import { CinemaLabel, CinemaReference, GlassPaper } from "../styled";

interface ScriptureOverlayProps {
  fullscreen?: boolean;
  showConfidence?: boolean;
}

export default function ScriptureOverlay({ fullscreen = false, showConfidence = true }: ScriptureOverlayProps) {
  const activeVerse = useScriptureStore((s) => s.activeVerse);
  const confidence = useScriptureStore((s) => s.confidence);
  const currentBook = useScriptureStore((s) => s.currentBook);
  const currentChapter = useScriptureStore((s) => s.currentChapter);
  const detectionSource = useScriptureStore((s) => s.detectionSource);

  if (!activeVerse) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          p: 4,
          ...(fullscreen && { position: "fixed", inset: 0, zIndex: 9999, bgcolor: "rgba(3,7,18,0.95)" }),
        }}
      >
        <Typography sx={{ fontSize: 12, color: "#64748B", fontFamily: '"JetBrains Mono Variable", monospace', fontStyle: "italic" }}>
          Awaiting scripture detection...
        </Typography>
      </Box>
    );
  }

  const ref = activeVerse.reference || activeVerse.ref || "";
  const text = activeVerse.text || "";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 4,
        gap: 2,
        ...(fullscreen && { position: "fixed", inset: 0, zIndex: 9999, bgcolor: "rgba(3,7,18,0.95)" }),
      }}
    >
      <GlassPaper sx={{ maxWidth: 600, p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
        <CinemaReference sx={{ fontSize: 13, letterSpacing: "0.3em" }}>
          {ref}
        </CinemaReference>

        <Typography
          sx={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontStyle: "italic",
            color: "#F1F5F9",
            fontSize: "clamp(16px, 3.5vw, 24px)",
            lineHeight: 1.8,
            letterSpacing: "0.01em",
          }}
        >
          &ldquo;{text}&rdquo;
        </Typography>

        {showConfidence && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mt: 1 }}>
            <CinemaLabel>Confidence</CinemaLabel>
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: '"JetBrains Mono Variable", monospace',
                color: confidence >= 90 ? "#34D399" : confidence >= 70 ? "#FBBF24" : "#FB7185",
              }}
            >
              {confidence}%
            </Typography>
            {detectionSource && (
              <Typography sx={{ fontSize: 9, color: "#475569", fontFamily: '"JetBrains Mono Variable", monospace' }}>
                {detectionSource}
              </Typography>
            )}
          </Box>
        )}

        {(currentBook || currentChapter) && (
          <CinemaLabel sx={{ fontSize: 8 }}>
            {currentBook && `Book: ${currentBook}`}{currentBook && currentChapter ? " · " : ""}{currentChapter && `Chapter: ${currentChapter}`}
          </CinemaLabel>
        )}
      </GlassPaper>
    </Box>
  );
}
