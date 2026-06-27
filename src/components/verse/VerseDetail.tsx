import { useScriptureStore } from '../../store/scriptureStore'
import { useProjection } from '../../hooks/useProjection'
import { useProjectionStore } from '../../store/projectionStore'
import CrossReferences from './CrossReferences'
import Button from '../shared/Button'
import Badge from '../shared/Badge'

export default function VerseDetail() {
  const { activeVerse, setActiveVerse } = useScriptureStore()
  const { projectVerse } = useProjection()
  const addToQueue = useProjectionStore((s) => s.addToQueue)

  if (!activeVerse) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted p-8 text-center">
        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="text-sm">Select a verse to view details</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="primary" className="text-xs">{activeVerse.ref}</Badge>
          <button
            onClick={() => setActiveVerse(null)}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-lighter"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-lg leading-relaxed text-text-primary font-serif mt-4">
          {activeVerse.text}
        </p>
      </div>

      <div className="p-6 space-y-4 flex-1 overflow-y-auto">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => projectVerse(activeVerse)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Project
          </Button>
          <Button size="sm" variant="secondary" onClick={() => addToQueue(activeVerse)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add to Queue
          </Button>
        </div>

        {(activeVerse as any).tags && (activeVerse as any).tags.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {(activeVerse as any).tags.map((tag: string) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        <CrossReferences verse={activeVerse} />
      </div>
    </div>
  )
}
