import { useRef } from 'react'
import { useSoundMode } from '../../hooks/useSoundMode'
import { useSoundStore } from '../../store/soundStore'
import { fetchMultipleVerses } from '../../api/bible'
import { useScriptureStore } from '../../store/scriptureStore'
import { useProjectionStore } from '../../store/projectionStore'
import { getApiCode } from '../../data/versions'
import AudioMeter from './AudioMeter'
import LiveTranscript from './LiveTranscript'
import Button from '../shared/Button'
import type { Verse } from '../../api/bible'

const SENSITIVITY_OPTS = ['low', 'medium', 'high'] as const

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i
  .test(navigator.userAgent)

interface SoundModePanelProps {
  collapsed?: boolean;
}

export default function SoundModePanel({ collapsed }: SoundModePanelProps) {
  const { startListening, stopListening } = useSoundMode()
  const isListening = useSoundStore((s) => s.isListening)
  const isProcessing = useSoundStore((s) => s.isProcessing)
  const sensitivity = useSoundStore((s) => s.sensitivity)
  const setSensitivity = useSoundStore((s) => s.setSensitivity)
  const error = useSoundStore((s) => s.error)
  const detectedVerse = useSoundStore((s) => s.detectedVerse)
  const transcript = useSoundStore((s) => s.transcript)
  const setDetectedVerse = useSoundStore((s) => s.setDetectedVerse)

  const { activeTranslation, setResults, setQuery, setActiveVerse } = useScriptureStore()
  const bcRef = useRef<BroadcastChannel | null>(null)

  if (!bcRef.current) {
    bcRef.current = new BroadcastChannel('dmentalist-projection')
  }

  const handleProject = async () => {
    const ref = detectedVerse?.reference || detectedVerse?.ref
    if (!ref) return

    try {
      const translation = getApiCode(activeTranslation)
      const verses = await fetchMultipleVerses([ref], translation)
      if (verses.length === 0) return

      const verse = verses[0]
      const verseData: Verse = {
        text: verse.text,
        ref: verse.ref || '',
        reference: verse.ref || '',
        translation: verse.translation,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
      }

      setResults(verses)
      setQuery(ref)
      setActiveVerse(verse)

      useProjectionStore.getState().projectVerse(verseData)
      bcRef.current!.postMessage({ type: 'PROJECT_VERSE', verse: verseData })

      setDetectedVerse(null)
    } catch (e) {
      console.error('Manual project error:', e)
    }
  }

  const handleDismiss = () => setDetectedVerse(null)

  if (collapsed) {
    const micColor = isListening ? 'text-red-400' : 'text-text-muted'
    return (
      <div className="flex flex-col items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isListening ? 'bg-red-500/20' : 'bg-surface-lighter'}`} title="Sound Mode">
          <svg className={`w-4 h-4 ${micColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
            isListening ? 'bg-red-500/20 text-red-400' : 'bg-primary text-white'
          }`}
          title={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? 'OFF' : 'ON'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/5 bg-surface-lighter/50 overflow-hidden">

      {isMobile && (
        <div className="px-4 pt-3">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent">
            Sound Mode works best on desktop Chrome or Edge.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4
                 m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Sound Mode</span>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-400 max-w-[160px] text-right">{error}</span>}
          <Button
            size="sm"
            variant={isListening ? 'danger' : 'primary'}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? 'OFF' : 'ON'}
          </Button>
        </div>
      </div>

      {isListening && (
        <div className="px-4 pb-4 space-y-4">

          {/* Sensitivity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-muted">Auto-project sensitivity</label>
              <span className="text-xs text-text-primary font-medium capitalize">
                {sensitivity}
              </span>
            </div>
            <div className="flex gap-1 mb-1">
              {SENSITIVITY_OPTS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setSensitivity(opt)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sensitivity === opt
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-lighter'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {sensitivity === 'high'   && 'Projects automatically on any detected verse, even uncertain ones.'}
              {sensitivity === 'medium' && 'Auto-projects high and medium confidence. Waits for your confirmation on low.'}
              {sensitivity === 'low'    && 'Only auto-projects when Claude is highly confident. Always safe.'}
            </p>
          </div>

          {/* Volume meter */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <AudioMeter />
            </div>
            <span className="text-xs font-mono text-text-muted w-8 text-right tabular-nums">
              {Math.round(useSoundStore.getState().audioLevel)}%
            </span>
          </div>

          {/* Live transcript */}
          <LiveTranscript />

          {/* Detection notification */}
          {detectedVerse && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-primary-light font-semibold">
                  Detected verse ready:
                </span>
                <span className="text-[10px] uppercase tracking-wide font-medium text-emerald-400">
                  {useSoundStore.getState().confidence}% confidence
                </span>
              </div>

              <p className="text-sm font-semibold text-text-primary mb-1">
                {detectedVerse.reference || detectedVerse.ref}
              </p>

              {detectedVerse.text && (
                <p className="text-xs text-text-secondary italic mb-2">
                  "{detectedVerse.text?.slice(0, 80)}..."
                </p>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={handleProject}>
                  Project now
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDismiss}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
