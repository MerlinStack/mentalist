import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const SCRIPTURES = [
  { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son" },
  { ref: "Psalm 23:4", text: "Yea, though I walk through the valley of the shadow of death" },
  { ref: "Romans 8:28", text: "All things work together for good to them that love God" },
  { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me" },
  { ref: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the LORD" },
];

const FEATURES = [
  {
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    title: "AI Scripture Search",
    desc: "Type any partial quote. Our semantic engine finds the exact verse across translations.",
  },
  {
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
    title: "Real-time Sound Detection",
    desc: "The console listens during service. Verses are detected and queued automatically.",
  },
  {
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    title: "Instant Projection",
    desc: "One click pushes scripture to the big screen. Queue verses ahead of service.",
  },
  {
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />,
    title: "Multi-translation",
    desc: "KJV, NIV, ESV, NKJV and more. Switch instantly without losing your queue.",
  },
  {
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    title: "Offline-capable AI",
    desc: "Whisper and MiniLM run locally in-browser via WebGPU. No cloud dependency.",
  },
  {
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />,
    title: "Fully Customisable",
    desc: "Theme engine, font sizes, projection layouts — tailor every detail to your sanctuary.",
  },
];

function TypewriterScripture() {
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = SCRIPTURES[index].text;
    const timeout = isDeleting ? 25 : charIndex === current.length ? 2500 : 45;
    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < current.length) setCharIndex((c) => c + 1);
      else if (!isDeleting && charIndex === current.length) setIsDeleting(true);
      else if (isDeleting && charIndex > 0) setCharIndex((c) => c - 1);
      else if (isDeleting && charIndex === 0) { setIsDeleting(false); setIndex((i) => (i + 1) % SCRIPTURES.length); }
    }, timeout);
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, index]);

  return (
    <span>
      &ldquo;{SCRIPTURES[index].text.slice(0, charIndex)}
      <span style={{ animation: "pulse-gold 1s ease-in-out infinite", color: "#C9973A" }}>|</span>&rdquo;
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#080D1C", overflowX: "hidden", overflowY: "auto", fontFamily: '"Inter", sans-serif', position: "relative" }}>
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
      `}</style>

      {/* Orbs */}
      <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <Box sx={{ position: "absolute", top: "10%", left: "15%", width: "min(400px, 80vw)", height: "min(400px, 80vw)", borderRadius: "50%", opacity: 0.2, filter: "blur(72px)", background: "radial-gradient(circle, #C9973A 0%, transparent 70%)", animation: "float 20s ease-in-out infinite" }} />
        <Box sx={{ position: "absolute", bottom: "20%", right: "10%", width: "min(500px, 90vw)", height: "min(500px, 90vw)", borderRadius: "50%", opacity: 0.15, filter: "blur(72px)", background: "radial-gradient(circle, #4F6BFF 0%, transparent 70%)", animation: "float 25s ease-in-out infinite reverse" }} />
        <Box sx={{ position: "absolute", top: "40%", right: "30%", width: "min(300px, 60vw)", height: "min(300px, 60vw)", borderRadius: "50%", opacity: 0.10, filter: "blur(72px)", background: "radial-gradient(circle, #10B981 0%, transparent 70%)", animation: "float 18s ease-in-out infinite 5s" }} />
      </Box>

      {/* Scanline */}
      <Box sx={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.02 }}>
        <Box sx={{ width: "100%", height: 4, bgcolor: "#fff", animation: "scanline 8s linear infinite" }} />
      </Box>

      {/* Nav */}
      <Box component="nav" sx={{ position: "relative", zIndex: 20 }}>
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 4, lg: 6 } }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: { xs: 56, md: 64 }, py: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 1.5, background: "linear-gradient(135deg, #C9973A, #FFD580)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(201,151,58,0.2)" }}>
                <Typography sx={{ color: "#080D1C", fontWeight: 700, fontSize: 16 }}>D</Typography>
              </Box>
              <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: "-0.025em" }}>D'mentalist</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Button onClick={() => navigate({ to: "/app" })} sx={{ color: "#94A3B8", fontSize: 14, textTransform: "none", "&:hover": { color: "#fff" } }}>
                Sign In
              </Button>
              <Button variant="contained" size="small" onClick={() => navigate({ to: "/app" })}>
                Get Started
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Hero */}
      <Box component="section" sx={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", px: 2, pt: 16, pb: 20, textAlign: "center", minHeight: "calc(100vh - 4rem)" }}>
        <Box sx={{ maxWidth: 1024, mx: "auto" }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 2, py: 0.75, borderRadius: 20, bgcolor: "rgba(201,151,58,0.10)", border: "1px solid rgba(201,151,58,0.20)", mb: 4 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#FFD580", animation: "pulse-red 1.2s ease-in-out infinite" }} />
            <Typography sx={{ fontSize: 12, color: "#FFD580", fontWeight: 500 }}>Now available for churches worldwide</Typography>
          </Box>

          <Typography variant="h1" sx={{ fontSize: { xs: 36, sm: 60, md: 72 }, fontWeight: 600, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            The Word.
            <br />
            <Typography component="span" sx={{ fontSize: { xs: 36, sm: 60, md: 72 }, fontWeight: 600, color: "#FFD580" }}>Instantly.</Typography>
          </Typography>

          <Box sx={{ maxWidth: 560, mx: "auto", mt: 6 }}>
            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(26, 32, 53, 0.4)", backdropFilter: "blur(24px)", border: "1px solid rgba(45, 58, 92, 0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.37)" }}>
              <Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontFamily: '"Georgia", serif', lineHeight: 1.6, color: "rgba(255,255,255,0.9)", fontStyle: "italic", minHeight: 56 }}>
                <TypewriterScripture />
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mt: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#10B981" }} />
                  <Typography sx={{ fontSize: 11, color: "#94A3B8", fontFamily: '"JetBrains Mono Variable", monospace' }}>Whisper ASR</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#4F6BFF" }} />
                  <Typography sx={{ fontSize: 11, color: "#94A3B8", fontFamily: '"JetBrains Mono Variable", monospace' }}>MiniLM Semantic</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#C9973A" }} />
                  <Typography sx={{ fontSize: 11, color: "#94A3B8", fontFamily: '"JetBrains Mono Variable", monospace' }}>Real-time Detection</Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 2, pt: 4 }}>
            <Button variant="contained" size="large" onClick={() => navigate({ to: "/app" })} endIcon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            }>
              Get Started
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate({ to: "/project" })} startIcon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            } sx={{ borderColor: "rgba(255,255,255,0.10)", color: "#F1F5F9", "&:hover": { borderColor: "rgba(255,255,255,0.20)" } }}>
              See it live
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(45, 58, 92, 0.20)" }}>
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 4, lg: 6 }, py: 3 }}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, background: "linear-gradient(135deg, #C9973A, #FFD580)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography sx={{ color: "#080D1C", fontWeight: 700, fontSize: 11 }}>D</Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>D'mentalist</Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>© {new Date().getFullYear()}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "#64748B" }}>
              <Box component="a" href="#" sx={{ color: "inherit", "&:hover": { color: "#94A3B8" } }}>Privacy</Box>
              <Box component="a" href="#" sx={{ color: "inherit", "&:hover": { color: "#94A3B8" } }}>Terms</Box>
              <Box component="a" href="#" sx={{ color: "inherit", "&:hover": { color: "#94A3B8" } }}>Docs</Box>
              <Typography sx={{ color: "#64748B", fontSize: 12 }}>For the proclamation of the Gospel</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
