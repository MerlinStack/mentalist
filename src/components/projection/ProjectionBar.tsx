import { useProjectionStore } from '../../store/projectionStore'
import { useProjection } from '../../hooks/useProjection'
import Button from '../shared/Button'

export default function ProjectionBar() {
  const { currentVerse, queue, projectNext } = useProjectionStore()
  const { projectVerse, clearProjection } = useProjection()
  const isActive = currentVerse !== null

  if (!isActive && queue.length === 0) return null

  return (
    <div className="sticky bottom-0 border-t border-white/5 bg-surface/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <svg className="w-4 h-4 shrink-0 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider shrink-0">
              NOW SHOWING
            </span>
            {currentVerse ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-text-primary truncate">{currentVerse.text}</span>
                <span className="text-xs text-text-muted shrink-0">— {currentVerse.ref}</span>
                {currentVerse.translation && (
                  <span className="text-[10px] text-text-muted uppercase shrink-0">({currentVerse.translation})</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-text-muted">Queue ready</span>
            )}
            {queue.length > 0 && (
              <span className="text-[10px] text-text-muted bg-surface-lighter px-1.5 py-0.5 rounded-full shrink-0">
                {queue.length} queued
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {queue.length > 0 && !isActive && (
              <Button size="sm" variant="secondary" onClick={projectNext}>
                Next
              </Button>
            )}
            {isActive && (
              <Button size="sm" variant="ghost" onClick={clearProjection}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
