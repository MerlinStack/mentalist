import type { Verse } from '../../api/bible';

interface VersePanelProps {
  kind: 'preview' | 'live';
  verse: Verse | null;
  nextRef?: string | null;
  translation?: string;
  actions?: React.ReactNode;
}

export default function VersePanel({ kind, verse, nextRef, translation, actions }: VersePanelProps) {
  const isLive = kind === 'live';

  if (!verse) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
        <p className="text-xs text-slate-500 font-mono italic">
          {isLive ? 'Nothing projected yet' : 'Awaiting audio or search input...'}
        </p>
        {!isLive && (
          <p className="text-[10px] text-slate-600 font-sans max-w-xs">
            Scripture spoken or typed will display here for operator confirmation before live push.
          </p>
        )}
      </div>
    );
  }

  const ref = verse.reference || verse.ref || '';
  const text = verse.text || '';
  const verseNum = verse.verse;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Confidence / NEXT deck — glassmorphic */}
      {!isLive && (
        <div className="mx-4 mt-3 mb-1 rounded-lg bg-[#1A2035]/30 backdrop-blur-md border border-white/[0.04] px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0">
                  <path
                    d="M18 4 A14 14 0 1 1 17.99 4"
                    fill="none"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 4 A14 14 0 1 1 17.99 4"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="44"
                    strokeDashoffset="2.64"
                    className="animate-confidence-arc"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))' }}
                  />
                  <text x="18" y="21" textAnchor="middle" fill="#10B981"
                    fontSize="9" fontWeight="700" fontFamily="JetBrains Mono, monospace"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))' }}>
                    94%
                  </text>
                </svg>
                <div>
                  <div className="text-cinema-label">Confidence</div>
                  <div className="text-[10px] font-mono text-emerald-400/60 mt-0.5">tier: regex</div>
                </div>
              </div>
            {nextRef && (
              <>
                <div className="w-px h-8 bg-white/5" />
                <div className="flex items-center gap-2.5">
                  <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-[#C9973A] to-[#C9973A]/30" />
                  <div>
                    <div className="text-cinema-label">Next</div>
                    <button
                      onClick={() => {}}
                      className="text-sm font-bold text-slate-300 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 bg-transparent border-none p-0 mt-0.5 text-left cursor-pointer"
                    >
                      {nextRef} <span className="text-[#C9973A]">&rarr;</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Verse display — cinematic */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-6 min-h-0 animate-fadeIn">
        <div className="w-full max-w-lg">
          {/* Reference bar with gold gradient rules */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{
              background: 'linear-gradient(90deg, transparent, rgba(201, 151, 58, 0.2), rgba(201, 151, 58, 0.35))',
            }} />
            <span className="text-cinema-reference" style={{ letterSpacing: '0.25em' }}>
              {ref}{translation ? `  ·  ${translation}` : ''}
            </span>
            <div className="flex-1 h-px" style={{
              background: 'linear-gradient(90deg, rgba(201, 151, 58, 0.35), rgba(201, 151, 58, 0.2), transparent)',
            }} />
          </div>

          <p
            className="font-serif leading-relaxed text-[#F1F5F9] italic mx-auto"
            style={{ fontSize: isLive ? 23 : 19, lineHeight: 1.85, letterSpacing: '0.01em' }}
          >
            {verseNum && (
              <span
                className="font-sans font-bold align-super"
                style={{ fontSize: '0.6em', color: '#C9973A', marginRight: 5, filter: 'drop-shadow(0 0 4px rgba(201, 151, 58, 0.3))' }}
              >
                {verseNum}
              </span>
            )}
            &ldquo;{text}&rdquo;
          </p>
        </div>
      </div>

      {/* Actions bar */}
      {actions && (
        <div className="flex items-center justify-center gap-2 px-5 pb-4 pt-2 shrink-0 border-t border-white/5">
          {actions}
        </div>
      )}
    </div>
  );
}
