import { useSoundStore } from '../../store/soundStore'
import { useScriptureStore } from '../../store/scriptureStore'
import AudioMeter from './AudioMeter'

interface AudioControlsProps {
  audioLevel: number;
  onStart: () => void;
  onStop: () => void;
}

export default function AudioControls({ audioLevel, onStart, onStop }: AudioControlsProps) {
  const isListening = useSoundStore((s) => s.isListening)
  const isProcessing = useSoundStore((s) => s.isProcessing)
  const transcript = useScriptureStore((s) => s.transcript)

  return (
    <div className="rounded-xl border border-white/5 bg-surface-lighter/50 overflow-hidden">
      <div className="p-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">
            AI Audio Detection
          </span>
          {isProcessing && (
            <span className="inline-flex gap-0.5 ml-1">
              <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <button
          onClick={isListening ? onStop : onStart}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isListening
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
          }`}
        >
          {isListening ? 'STOP' : 'START'}
        </button>
      </div>

      {isListening && (
        <div className="px-4 pb-4 space-y-3">
          <AudioMeter />

          {transcript && (
            <div className="p-3 rounded-lg bg-surface/50 border border-white/5">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1 font-semibold">
                Live Transcript
              </p>
              <p className="text-sm text-text-primary leading-relaxed max-h-20 overflow-y-auto custom-scrollbar">
                {transcript}
              </p>
            </div>
          )}

          {!transcript && (
            <p className="text-xs text-text-muted italic text-center py-2">
              Waiting for speech...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
