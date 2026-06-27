import { useScriptureStore } from '../../store/scriptureStore'
import { TRANSLATIONS } from '../../data/versions'

interface TranslationSwitcherProps {
  grid?: boolean;
}

export default function TranslationSwitcher({ grid }: TranslationSwitcherProps) {
  const { activeTranslation, setTranslation } = useScriptureStore()

  if (grid) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(TRANSLATIONS).map(([id, t]) => (
          <button
            key={id}
            onClick={() => setTranslation(id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTranslation === id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-lighter text-text-muted hover:text-text-primary hover:bg-surface-light'
            }`}
          >
            <div className="font-semibold">{t.short}</div>
            <div className="text-[10px] opacity-70 truncate">{t.label}</div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted">Translation:</span>
      <div className="flex bg-surface-lighter rounded-lg border border-white/10 p-0.5">
        {Object.entries(TRANSLATIONS).map(([id, t]) => (
          <button
            key={id}
            onClick={() => setTranslation(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTranslation === id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t.short}
          </button>
        ))}
      </div>
    </div>
  )
}
