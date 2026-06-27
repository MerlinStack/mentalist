import { useProjectionListener } from '../hooks/useProjection'

const themes: Record<string, { bg: string; text: string; accent: string }> = {
  dark: { bg: '#0F0F0F', text: '#f1f5f9', accent: '#8b5cf6' },
  light: { bg: '#f8fafc', text: '#0f172a', accent: '#6b3fa0' },
  warm: { bg: '#1c1917', text: '#fef3c7', accent: '#f59e0b' },
}

const fontSizeMap: Record<string, string> = {
  medium: 'text-4xl',
  large: 'text-6xl',
  xlarge: 'text-8xl',
}

export default function ProjectionPage() {
  const { currentVerse, theme, fontSize, showReference, showTranslation } =
    useProjectionListener()

  const config = themes[theme] || themes.dark
  const sizeClass = fontSizeMap[fontSize] || fontSizeMap.large

  if (!currentVerse) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: config.bg }}
      >
        <div className="text-center opacity-30">
          <div
            className="text-6xl mb-4 font-display"
            style={{ color: config.text }}
          >
            D'
          </div>
          <p className="text-xl" style={{ color: config.text }}>
            Waiting for verse...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-16"
      style={{ backgroundColor: config.bg }}
    >
      <div
        className={`max-w-4xl text-center transition-all duration-700 opacity-100 scale-100`}
      >
        <p
          className={`leading-relaxed font-[Georgia,serif] mb-8 ${sizeClass}`}
          style={{ color: config.text }}
        >
          {currentVerse.text}
        </p>

        {showReference && currentVerse.reference && (
          <p
            className="font-sans tracking-wider"
            style={{ color: config.accent, fontSize: '1.125rem' }}
          >
            {currentVerse.reference}
          </p>
        )}

        {showTranslation && currentVerse.translation && (
          <span
            className="font-sans text-xs uppercase tracking-widest px-2 py-0.5 rounded border inline-block mt-2"
            style={{
              color: config.accent,
              borderColor: config.accent + '66',
            }}
          >
            {currentVerse.translation}
          </span>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.accent}, transparent)`,
        }}
      />

      <div className="fixed top-4 right-4 flex items-center gap-1.5 opacity-20
                      hover:opacity-60 transition-opacity">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-white font-mono">D'mentalist Live</span>
      </div>
    </div>
  )
}
