import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface VerseData {
  text: string;
  reference?: string;
  ref?: string;
  translation?: string;
  theme?: string | null;
  fontSize?: string | null;
}

const themes: Record<string, { bg: string; text: string; accent: string }> = {
  dark: { bg: "#000000", text: "#FFFFFF", accent: "#4F6BFF" },
  light: { bg: "#FFFFFF", text: "#1A1A2E", accent: "#4F6BFF" },
  warm: { bg: "#2D1B00", text: "#FFE4B5", accent: "#FFD580" },
};

const fontSizeMap: Record<string, number> = { medium: 28, large: 42, xlarge: 64 };

export const Route = createFileRoute("/project")({
  head: () => ({
    meta: [
      { title: "D'mentalist — Projection Output" },
      { name: "description", content: "Second-screen projection output" },
    ],
  }),
  component: ProjectOutput,
});

function ProjectOutput() {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [config, setConfig] = useState(themes.dark);
  const [fontPx, setFontPx] = useState(42);
  const [visible, setVisible] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("scriptureflow-projection");
    channelRef.current.onmessage = (event) => {
      const { type, verse: v, theme, fontSize } = event.data;

      if (type === "PROJECT_VERSE" && v) {
        setVerse(v);
        setVisible(false);
        requestAnimationFrame(() => setVisible(true));
        if (v.theme && themes[v.theme]) setConfig(themes[v.theme]);
        else if (theme && themes[theme]) setConfig(themes[theme]);
        if (v.fontSize && fontSizeMap[v.fontSize]) setFontPx(fontSizeMap[v.fontSize]);
        else if (fontSize && fontSizeMap[fontSize]) setFontPx(fontSizeMap[fontSize]);
      }

      if (type === "CLEAR") {
        setVerse(null);
      }

      if (type === "SET_THEME" && themes[theme]) {
        setConfig(themes[theme]);
      }

      if (type === "SET_FONT_SIZE" && fontSizeMap[fontSize]) {
        setFontPx(fontSizeMap[fontSize]);
      }
    };

    return () => channelRef.current?.close();
  }, []);

  if (!verse) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: config.bg,
        }}
      >
        <Box sx={{ textAlign: "center", opacity: 0.5 }}>
          <Typography
            sx={{ fontSize: 64, mb: 4, fontFamily: '"Georgia", serif' }}
            color={config.text as any}
          >
            ✝
          </Typography>
          <Typography sx={{ fontSize: 24 }} color={config.text as any}>
            Waiting for verse...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, md: 4, lg: 8 },
        bgcolor: config.bg,
        color: config.text,
        position: "relative",
      }}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: "auto",
          textAlign: "center",
          transition: "all 0.5s",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.95)",
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Georgia", serif',
            fontSize: fontPx,
            lineHeight: 1.5,
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
          color={config.text as any}
        >
          {verse.text}
        </Typography>
        {(verse.reference || verse.ref) && (
          <Typography
            sx={{ mt: 8, opacity: 0.7, fontSize: Math.round(fontPx * 0.4) }}
            color={config.text as any}
          >
            &mdash; {verse.reference || verse.ref}
            {verse.translation && ` (${verse.translation})`}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${config.accent}, transparent)`,
        }}
      />

      <Box
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          opacity: 0.2,
          "&:hover": { opacity: 0.6 },
          transition: "opacity 0.2s",
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: config.accent,
            animation: "pulse 2s infinite",
          }}
        />
        <Typography
          sx={{ fontSize: 12, fontFamily: '"JetBrains Mono Variable", monospace' }}
          color={config.text as any}
        >
          D'mentalist Live
        </Typography>
      </Box>
    </Box>
  );
}
