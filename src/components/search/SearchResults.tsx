import { useScriptureStore } from '../../store/scriptureStore'
import VerseCard from './VerseCard'
import EmptyState from '../shared/EmptyState'
import Spinner from '../shared/Spinner'

export default function SearchResults() {
  const { results, query, isSearching, searchError } = useScriptureStore()

  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (searchError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Search Error"
        description={searchError}
      />
    )
  }

  if (!query) {
    return (
      <EmptyState
        icon={<svg className="w-16 h-16 text-primary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        title="Search the Scriptures"
        description="Type a reference, keyword, or partial quote to find Bible verses. Try 'John 3:16', 'faith', or 'love is patient'."
      />
    )
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon="📖"
        title="No verses found"
        description={`No matches for "${query}". Try different keywords or switch to AI search mode for semantic matching.`}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-text-muted">
          Found {results.length} result{results.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="space-y-3">
        {results.map((verse, i) => (
          <VerseCard key={verse.ref} verse={verse} query={query} index={i} />
        ))}
      </div>
    </div>
  )
}
