import { useScriptureStore } from '../../store/scriptureStore'
import { useProjection } from '../../hooks/useProjection'
import { useProjectionStore } from '../../store/projectionStore'
import { highlightMatches } from '../../utils/formatters'
import Badge from '../shared/Badge'
import type { Verse } from '../../api/bible'

interface VerseCardProps {
  verse: Verse;
  query: string;
  index?: number;
}

export default function VerseCard({ verse, query, index }: VerseCardProps) {
  const { setActiveVerse, activeVerse } = useScriptureStore()
  const { projectVerse } = useProjection()
  const addToQueue = useProjectionStore((s) => s.addToQueue)
  const isActive = activeVerse?.ref === verse.ref

  const confidence = (verse as any).aiData?.confidence || (verse.relevance && verse.relevance > 0.8 ? 'high' : verse.relevance && verse.relevance > 0.5 ? 'medium' : 'low')
  const confidenceColor =
    confidence === 'high' ? 'success' :
    confidence === 'medium' ? 'warning' : 'default'

  return (
    <div
      className={`group relative p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
        isActive
          ? 'border-accent/40 bg-surface-light shadow-lg shadow-accent/5 border-l-accent border-l-4'
          : 'border-white/5 bg-surface-lighter/50 hover:bg-surface-lighter hover:border-white/10'
      } animate-slide-up`}
      style={{ animationDelay: `${(index || 0) * 50}ms` }}
      onClick={() => setActiveVerse(verse)}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-muted bg-surface px-2 py-0.5 rounded">
            {verse.ref}
          </span>
          {verse.translation && (
            <Badge variant="default">{verse.translation}</Badge>
          )}
          {(verse as any).aiData?.references && (
            <Badge variant={confidenceColor as 'success' | 'warning' | 'default'}>
              {confidence}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              projectVerse(verse);
            }}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all"
            title="Project verse live"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); addToQueue(verse) }}
            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-all"
            title="Add to queue"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation() }}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface/50 transition-all"
            title="Cross-references"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>
      </div>
      <p
        className="text-base leading-relaxed text-text-primary font-serif"
        dangerouslySetInnerHTML={{
          __html: query ? highlightMatches(verse.text, query) : verse.text,
        }}
      />
      {(verse as any).tags && (verse as any).tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(verse as any).tags.slice(0, 4).map((tag: string) => (
            <Badge key={tag} variant="default">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
