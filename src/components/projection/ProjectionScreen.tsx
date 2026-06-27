import { useProjectionStore, resolveTheme, resolveFontSize } from "../../store/projectionStore";

export default function ProjectionScreen() {
  const store = useProjectionStore();
  const { currentVerse, theme, fontSize, showReference, showTranslation } = store;

  if (!currentVerse) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#000000" }}
      >
        <div className="text-center opacity-50">
          <div className="text-6xl mb-4">✝</div>
          <p className="text-xl" style={{ color: "#94A3B8" }}>
            Waiting for verse...
          </p>
        </div>
      </div>
    );
  }

  const config = resolveTheme(theme);
  const size = resolveFontSize(fontSize);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-16"
      style={{ background: config.bg, color: config.text }}
    >
      <div className="max-w-4xl mx-auto text-center animate-fadeIn">
        <p
          className="leading-relaxed font-serif"
          style={{ fontSize: `${size}px`, lineHeight: 1.5 }}
        >
          {currentVerse.text}
        </p>
        {showReference && (
          <p className="mt-8 opacity-70" style={{ fontSize: `${Math.round(size * 0.4)}px` }}>
            — {currentVerse.reference || currentVerse.ref}
            {showTranslation && currentVerse.translation && ` (${currentVerse.translation})`}
          </p>
        )}
      </div>
    </div>
  );
}
