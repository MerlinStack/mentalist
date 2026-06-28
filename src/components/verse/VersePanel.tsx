import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Verse } from "../../api/bible";
import { CinemaLabel, CinemaReference } from "../styled";

interface VersePanelProps {
  kind: "preview" | "live";
  verse: Verse | null;
  nextRef?: string | null;
  translation?: string;
  actions?: React.ReactNode;
}

export default function VersePanel({ kind, verse, nextRef, translation, actions }: VersePanelProps) {
  const isLive = kind === "live";

  if (!verse) {
    return (
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 2, py: 4 }}>
        <Typography sx={{ fontSize: 12, color: "#64748B", fontFamily: '"JetBrains Mono Variable", monospace', fontStyle: "italic" }}>
          {isLive ? "Nothing projected yet" : "Awaiting audio or search input..."}
        </Typography>
        {!isLive && (
          <Typography sx={{ fontSize: 10, color: "#475569", maxWidth: 280 }}>
            Scripture spoken or typed will display here for operator confirmation before live push.
          </Typography>
        )}
      </Box>
    );
  }

  const ref = verse.reference || verse.ref || "";
  const text = verse.text || "";
  const verseNum = verse.verse;

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {!isLive && (
        <Box
          sx={{
            mx: 2,
            mt: 1.5,
            mb: 0.5,
            borderRadius: 1,
            background: "rgba(26, 32, 53, 0.3)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.04)",
            px: 2,
            py: 1.25,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <svg width="36" height="36" viewBox="0 0 36 36">
                <path d="M18 4 A14 14 0 1 1 17.99 4" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" strokeLinecap="round" />
                <path
                  d="M18 4 A14 14 0 1 1 17.99 4"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="44"
                  strokeDashoffset="2.64"
                  style={{ animation: "confidence-arc-fill 1s ease-out forwards", filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))" }}
                />
                <text x="18" y="21" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono, monospace" style={{ filter: "drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))" }}>
                  94%
                </text>
              </svg>
              <Box>
                <CinemaLabel>Confidence</CinemaLabel>
                <Typography sx={{ fontSize: 10, fontFamily: '"JetBrains Mono Variable", monospace', color: "rgba(16,185,129,0.6)", mt: 0.25 }}>tier: regex</Typography>
              </Box>
            </Box>
            {nextRef && (
              <>
                <Box sx={{ width: 1, height: 32, bgcolor: "rgba(255,255,255,0.05)" }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 2, height: 32, borderRadius: 1, background: "linear-gradient(180deg, #C9973A 0%, rgba(201,151,58,0.3) 100%)" }} />
                  <Box>
                    <CinemaLabel>Next</CinemaLabel>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#CBD5E1",
                        cursor: "pointer",
                        mt: 0.25,
                        transition: "all 0.2s",
                        "&:hover": { color: "#fff", transform: "scale(1.02)" },
                        "&:active": { transform: "scale(0.98)" },
                      }}
                    >
                      {nextRef} <Typography component="span" sx={{ color: "#C9973A", fontSize: 14 }}>&rarr;</Typography>
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          minHeight: 0,
          animation: "fadeIn 0.4s ease-out",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 480 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 }, mb: { xs: 2, md: 3 } }}>
            <Box sx={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,151,58,0.2), rgba(201,151,58,0.35))" }} />
            <CinemaReference sx={{ fontSize: { xs: 9, md: 11 } }}>
              {ref}{translation ? `  ·  ${translation}` : ""}
            </CinemaReference>
            <Box sx={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(201,151,58,0.35), rgba(201,151,58,0.2), transparent)" }} />
          </Box>

          <Typography
            sx={{
              fontFamily: '"Georgia", "Times New Roman", serif',
              fontStyle: "italic",
              color: "#F1F5F9",
              fontSize: isLive ? "clamp(16px, 4vw, 23px)" : "clamp(14px, 3.5vw, 19px)",
              lineHeight: 1.85,
              letterSpacing: "0.01em",
            }}
          >
            {verseNum && (
              <Typography
                component="span"
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 700,
                  fontSize: "0.6em",
                  verticalAlign: "super",
                  color: "#C9973A",
                  mr: 0.5,
                  filter: "drop-shadow(0 0 4px rgba(201,151,58,0.3))",
                }}
              >
                {verseNum}
              </Typography>
            )}
            &ldquo;{text}&rdquo;
          </Typography>
        </Box>
      </Box>

      {actions && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, px: 2.5, pb: 2, pt: 1, flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
