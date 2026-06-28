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
      {/* Confidence / NEXT deck */}
      {!isLive && (
        <div className="flex items-center gap-6 px-5 pt-4 pb-2 shrink-0">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Confidence</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">94%</div>
          </div>
          {nextRef && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Next</div>
              <button
                onClick={() => {}}
                className="text-sm font-bold text-slate-400 hover:text-white transition bg-transparent border-none p-0 mt-0.5 text-left cursor-pointer decoration-dotted underline-offset-2 underline decoration-white/10"
              >
                {nextRef} &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Verse display */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-6 min-h-0">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-px bg-[#C9973A]/15" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#C9973A]">
              {ref}{translation ? ` · ${translation}` : ''}
            </span>
            <div className="flex-1 h-px bg-[#C9973A]/15" />
          </div>

          <p
            className="font-serif leading-relaxed text-[#F1F5F9] italic mx-auto"
            style={{ fontSize: isLive ? 22 : 18, lineHeight: 1.8 }}
          >
            {verseNum && (
              <span
                className="font-sans font-bold align-super opacity-80"
                style={{ fontSize: '0.65em', color: '#C9973A', marginRight: 6 }}
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
