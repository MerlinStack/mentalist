import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import Button from '../components/shared/Button'

const SCRIPTURES = [
  { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son' },
  { ref: 'Psalm 23:4', text: 'Yea, though I walk through the valley of the shadow of death' },
  { ref: 'Romans 8:28', text: 'All things work together for good to them that love God' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me' },
  { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD' },
]

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'AI Scripture Search',
    desc: 'Type any partial quote. Our semantic engine finds the exact verse across translations.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Real-time Sound Detection',
    desc: 'The console listens during service. Verses are detected and queued automatically.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Instant Projection',
    desc: 'One click pushes scripture to the big screen. Queue verses ahead of service.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    title: 'Multi-translation',
    desc: 'KJV, NIV, ESV, NKJV and more. Switch instantly without losing your queue.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Offline-capable AI',
    desc: 'Whisper and MiniLM run locally in-browser via WebGPU. No cloud dependency.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: 'Fully Customisable',
    desc: 'Theme engine, font sizes, projection layouts — tailor every detail to your sanctuary.',
  },
]

function TypewriterScripture() {
  const [index, setIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const current = SCRIPTURES[index].text
    const timeout = isDeleting
      ? 25
      : charIndex === current.length
        ? 2500
        : 45

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < current.length) {
        setCharIndex((c) => c + 1)
      } else if (!isDeleting && charIndex === current.length) {
        setIsDeleting(true)
      } else if (isDeleting && charIndex > 0) {
        setCharIndex((c) => c - 1)
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false)
        setIndex((i) => (i + 1) % SCRIPTURES.length)
      }
    }, timeout)

    return () => clearTimeout(timer)
  }, [charIndex, isDeleting, index])

  return (
    <span>
      &ldquo;{SCRIPTURES[index].text.slice(0, charIndex)}
      <span className="animate-pulse text-[#C9973A]">|</span>&rdquo;
    </span>
  )
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[10%] left-[15%] w-[min(400px,80vw)] h-[min(400px,80vw)] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #C9973A 0%, transparent 70%)', animation: 'float 20s ease-in-out infinite' }} />
      <div className="absolute bottom-[20%] right-[10%] w-[min(500px,90vw)] h-[min(500px,90vw)] rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #4F6BFF 0%, transparent 70%)', animation: 'float 25s ease-in-out infinite reverse' }} />
      <div className="absolute top-[40%] right-[30%] w-[min(300px,60vw)] h-[min(300px,60vw)] rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)', animation: 'float 18s ease-in-out infinite 5s' }} />
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#080D1C] overflow-x-hidden overflow-y-auto font-sans selection:bg-[#C9973A]/30">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .animate-float { animation: float 20s ease-in-out infinite; }
        .animate-scanline { animation: scanline 8s linear infinite; }
      `}</style>

      {/* Ambient glow orbs */}
      <FloatingOrbs />

      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]">
        <div className="w-full h-1 bg-white animate-scanline" />
      </div>

      {/* ─── NAV ─── */}
      <nav className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18 py-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9973A] to-[#FFD580] flex items-center justify-center shadow-lg shadow-[#C9973A]/20">
                <span className="text-[#080D1C] font-bold text-base font-sans">D</span>
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">D'mentalist</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate({ to: '/app' })}
                className="text-sm text-[#94A3B8] hover:text-white transition-colors px-3 py-2"
              >
                Sign In
              </button>
              <Button size="sm" onClick={() => navigate({ to: '/app' })}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 flex flex-col items-center justify-center px-4 pt-16 pb-20 text-center min-h-[calc(100vh-4rem)]">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9973A]/10 border border-[#C9973A]/20 text-[#FFD580] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD580] animate-pulse" />
            Now available for churches worldwide
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl font-semibold text-white tracking-tight leading-tight">
            The Word.
            <br />
            <span className="text-[#FFD580]">Instantly.</span>
          </h1>

          {/* Typewriter */}
          <div className="max-w-2xl mx-auto">
            <div className="p-5 rounded-2xl bg-[#1A2035]/40 backdrop-blur-xl border border-[#2D3A5C]/40 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
              <p className="text-lg sm:text-xl font-serif leading-relaxed text-white/90 italic min-h-[3.5rem]">
                <TypewriterScripture />
              </p>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-[#94A3B8] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  Whisper ASR
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F6BFF]" />
                  MiniLM Semantic
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9973A]" />
                  Real-time Detection
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate({ to: '/app' })}>
              Get Started
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate({ to: '/project' })}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              See it live
            </Button>
          </div>
        </div>

        {/* ─── LIVE DEMO MOCKUP ─── */}
        <div className="relative mt-20 w-full max-w-6xl mx-auto px-4">
          <div className="rounded-2xl bg-[#1A2035]/30 backdrop-blur-xl border border-[#2D3A5C]/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#2D3A5C]/40 bg-[#0A0F1E]/60">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
              <div className="ml-4 px-3 py-1 rounded-md bg-[#0A0F1E] text-xs text-[#94A3B8] font-mono border border-[#2D3A5C]/20">
                operator.dmentalist.app
              </div>
            </div>

            {/* Mockup content */}
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Audio panel */}
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#1A2035]/40 border border-[#2D3A5C]/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Acoustic Gain</span>
                      <span className="text-[10px] md:text-[11px] font-mono text-[#C9973A]">64%</span>
                    </div>
                    <div className="flex items-end gap-px h-8">
                      {[20, 35, 50, 70, 85, 95, 100, 90, 75, 55, 40, 25, 30, 45, 60, 75, 85, 70, 50, 35].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-[#C9973A]/60 transition-all" style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }} />
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] md:text-[11px] font-mono text-[#10B981]">● LIVE</span>
                      <span className="text-[10px] md:text-[11px] font-mono text-[#64748B]">Threshold: 64%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1A2035]/40 border border-[#2D3A5C]/40">
                    <p className="text-xs font-mono text-[#E2E8F0] leading-relaxed">
                      <span className="text-[#94A3B8]">…and we know that all things</span>{' '}
                      <span className="text-[#4F6BFF] font-medium">work together for good</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] md:text-[11px] flex-wrap">
                      <span className="text-[#10B981]">✓ Detected:</span>
                      <span className="text-white font-medium">Romans 8:28</span>
                      <span className="text-[#64748B]">· 94% confidence</span>
                    </div>
                  </div>
                </div>

                {/* Center: Preview */}
                <div className="p-6 rounded-xl bg-[#1A2035]/40 border border-[#2D3A5C]/40 flex flex-col items-center justify-center text-center min-h-[200px]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] md:text-[11px] font-bold tracking-widest uppercase text-[#4F6BFF] font-mono px-2 py-0.5 bg-[#4F6BFF]/10 rounded border border-[#4F6BFF]/20">
                      Preview
                    </span>
                    <span className="text-[10px] md:text-[11px] text-[#64748B]">Next: John 3:16</span>
                  </div>
                  <span className="text-[11px] md:text-xs font-bold tracking-widest uppercase text-[#FFD580] font-mono px-2 py-0.5 rounded-full bg-[#FFD580]/10 border border-[#FFD580]/20 mb-3">
                    Romans 8:28 — KJV
                  </span>
                  <p className="text-sm md:text-base font-serif leading-relaxed text-white font-medium italic">
                    &ldquo;And we know that all things work together for good to them that love God&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-4 text-[10px] md:text-[11px] text-[#64748B]">
                    <span>Confidence: <span className="text-[#10B981] font-bold">94%</span></span>
                  </div>
                </div>

                {/* Right: Live */}
                <div className="p-6 rounded-xl border-2 border-[#EF4444]/30 bg-black/40 flex flex-col items-center justify-center text-center min-h-[200px]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-ping" />
                    <span className="text-[10px] md:text-[11px] font-bold tracking-widest uppercase text-[#EF4444] font-mono">
                      Live Projector
                    </span>
                  </div>
                  <p className="text-base md:text-lg font-serif leading-relaxed text-white font-semibold">
                    {`"For God so loved the world..."`}
                  </p>
                  <span className="text-[10px] md:text-xs font-mono text-[#4F6BFF] tracking-wider mt-3 uppercase font-bold">
                    John 3:16
                  </span>
                  <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-[#EF4444] mt-3 flex-wrap">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                    <span>LIVE</span>
                    <span className="text-[#64748B]">·</span>
                    <span className="text-[#94A3B8] font-mono">00:24:17</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '10K+', label: 'Verses detected' },
            { value: '500+', label: 'Churches using it' },
            { value: '99.7%', label: 'Detection accuracy' },
            { value: '<200ms', label: 'Avg. latency' },
          ].map((stat, i) => (
            <div key={i} className="p-5 rounded-xl bg-[#1A2035]/30 backdrop-blur-md border border-[#2D3A5C]/30 text-center hover:border-[#C9973A]/20 transition-all duration-300">
              <div className="text-2xl sm:text-3xl font-bold text-[#FFD580]">{stat.value}</div>
              <div className="text-xs text-[#94A3B8] mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Everything you need for<br />
            <span className="text-[#FFD580]">worship tech</span>
          </h2>
          <p className="text-[#94A3B8] mt-3 max-w-xl mx-auto text-sm">
            From voice detection to big-screen projection — one console, zero friction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="group p-6 rounded-xl bg-[#1A2035]/20 backdrop-blur-sm border border-[#2D3A5C]/20 
                         hover:bg-[#1A2035]/40 hover:border-[#C9973A]/20 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center mb-4 group-hover:bg-[#C9973A]/20 group-hover:scale-105 transition-all">
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIAL ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 pb-24">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#1A2035]/30 backdrop-blur-xl border border-[#2D3A5C]/40 text-center">
          <svg className="w-8 h-8 mx-auto text-[#C9973A]/40 mb-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10H0z" />
          </svg>
          <blockquote className="text-lg sm:text-xl text-white/80 font-serif italic leading-relaxed mb-6 max-w-2xl mx-auto">
            &ldquo;We use D'mentalist every Sunday. It catches verses from the pastor's sermon
            in real-time and projects them before he finishes the reference. Our
            congregation has never been more engaged with the Word.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9973A] to-[#FFD580] flex items-center justify-center text-xs font-bold text-[#080D1C]">
              DM
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Daniel Martins</p>
              <p className="text-xs text-[#94A3B8]">Media Director, Calvary Worship Centre, Lagos</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-24">
        <div className="p-10 sm:p-14 rounded-2xl bg-gradient-to-br from-[#C9973A]/10 via-[#4F6BFF]/5 to-transparent border border-[#C9973A]/20 text-center backdrop-blur-sm">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
            Ready to transform your service?
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-8">
            Join hundreds of churches using D'mentalist for real-time scripture projection.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate({ to: '/app' })}>
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate({ to: '/app' })}>
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-[#2D3A5C]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9973A] to-[#FFD580] flex items-center justify-center">
                <span className="text-[#080D1C] font-bold text-xs">D</span>
              </div>
              <span className="text-sm font-semibold text-white">D'mentalist</span>
              <span className="text-xs text-[#64748B]">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-[#64748B]">
              <a href="#" className="hover:text-[#94A3B8] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#94A3B8] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#94A3B8] transition-colors">Docs</a>
              <span className="text-[#64748B]">For the proclamation of the Gospel</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
