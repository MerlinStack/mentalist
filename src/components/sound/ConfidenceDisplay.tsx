import { useScriptureStore } from '../../store/scriptureStore'

const confidenceColor = (score: number) => {
  if (score >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (score >= 70) return 'text-violet-400 border-violet-500/30 bg-violet-500/10'
  if (score >= 40) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  return 'text-slate-400 border-slate-500/30 bg-slate-500/10'
}

const sourceLabel: Record<string, string> = {
  regex: 'Exact Match',
  context: 'Context Match',
  semantic: 'Semantic Match',
}

export default function ConfidenceDisplay() {
  const confidence = useScriptureStore((s) => s.confidence)
  const lastDetectionTime = useScriptureStore((s) => s.lastDetectionTime)
  const detectionSource = useScriptureStore((s) => s.detectionSource)
  const currentBook = useScriptureStore((s) => s.currentBook)
  const currentChapter = useScriptureStore((s) => s.currentChapter)

  if (!lastDetectionTime) return null

  const timeAgo = Math.floor((Date.now() - lastDetectionTime) / 1000)

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${confidenceColor(confidence)}`}
    >
      <span className="font-semibold">{confidence}%</span>
      <span className="opacity-60">|</span>
      <span>{sourceLabel[detectionSource || ''] || detectionSource}</span>
      {currentBook && (
        <>
          <span className="opacity-60">|</span>
          <span>{currentBook} {currentChapter}</span>
        </>
      )}
      {timeAgo < 60 && (
        <>
          <span className="opacity-60">|</span>
          <span className="tabular-nums">{timeAgo}s ago</span>
        </>
      )}
    </div>
  )
}
