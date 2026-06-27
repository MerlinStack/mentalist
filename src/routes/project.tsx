import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";

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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: config.bg }}
      >
        <div className="text-center opacity-50">
          <div className="text-6xl mb-4 font-serif">✝</div>
          <p className="text-xl" style={{ color: config.text }}>
            Waiting for verse...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-16"
      style={{ background: config.bg, color: config.text }}
    >
      <div
        className="max-w-4xl mx-auto text-center transition-all duration-500"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.95)" }}
      >
        <p
          className="leading-relaxed font-serif"
          style={{ fontSize: `${fontPx}px`, lineHeight: 1.5 }}
        >
          {verse.text}
        </p>
        {(verse.reference || verse.ref) && (
          <p className="mt-8 opacity-70" style={{ fontSize: `${Math.round(fontPx * 0.4)}px` }}>
            &mdash; {verse.reference || verse.ref}
            {verse.translation && ` (${verse.translation})`}
          </p>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${config.accent}, transparent)` }}
      />

      <div className="fixed top-4 right-4 flex items-center gap-1.5 opacity-20 hover:opacity-60 transition-opacity">
        <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
        <span className="text-xs font-mono" style={{ color: config.text }}>
          D'mentalist Live
        </span>
      </div>
    </div>
  );
}
