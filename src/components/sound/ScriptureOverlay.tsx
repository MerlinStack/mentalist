import { useScriptureStore } from '../../store/scriptureStore'
import { useProjectionStore } from '../../store/projectionStore'
import ConfidenceDisplay from './ConfidenceDisplay'
import type { Verse } from '../../api/bible'

const detectionBanner: Record<string, { label: string; color: string }> = {
  regex: {
    label: 'Exact Scripture Reference',
    color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
  },
  context: {
    label: 'Context-Based Detection',
    color: 'border-violet-500/30 bg-violet-500/5 text-violet-400',
  },
  semantic: {
    label: 'Semantic Similarity Match',
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  },
}

export default function ScriptureOverlay() {
  const activeVerse = useScriptureStore((s) => s.activeVerse)
  const confidence = useScriptureStore((s) => s.confidence)
  const detectionSource = useScriptureStore((s) => s.detectionSource)
  const clearDetection = useScriptureStore((s) => s.clearDetection)
  const projectVerse = useProjectionStore((s) => s.projectVerse)

  if (!activeVerse || !detectionSource) return null

  const banner = detectionBanner[detectionSource] || detectionBanner.semantic

  const handleProject = () => {
    const verseData = {
      text: activeVerse.text || '',
      ref: activeVerse.ref || activeVerse.reference,
      reference: activeVerse.reference || activeVerse.ref,
      book: activeVerse.book,
      chapter: activeVerse.chapter,
      verse: activeVerse.verse,
    } as Verse;
    projectVerse(verseData)

    const bc = new BroadcastChannel('dmentalist-projection')
    bc.postMessage({ type: 'PROJECT_VERSE', verse: verseData })
    bc.close()
  }

  return (
    <div className={`rounded-xl border ${banner.color} p-4 space-y-3 animate-slide-up`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider">
          {banner.label}
        </span>
        <ConfidenceDisplay />
      </div>

      {activeVerse.text && (
        <p className="text-sm leading-relaxed text-slate-200 italic">
          &ldquo;{activeVerse.text}&rdquo;
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">
          {activeVerse.ref || activeVerse.reference}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleProject}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 transition-all"
          >
            Project
          </button>
          <button
            onClick={clearDetection}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
