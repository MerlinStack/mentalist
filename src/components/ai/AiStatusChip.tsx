import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { GlassPaper, CinemaLabel } from "../styled";
import { useSoundStore } from "../../store/soundStore";

function ModelProgress({
  label,
  loaded,
  total,
  status,
  ready,
}: {
  label: string;
  loaded: number;
  total: number;
  status: string;
  ready: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

  if (ready) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "#10B981",
            filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))",
          }}
        />
        <Typography
          sx={{
            fontSize: 10,
            color: "#34D399",
            fontFamily: '"JetBrains Mono Variable", monospace',
          }}
        >
          {label}{" "}
          <Typography component="span" sx={{ fontSize: 10, color: "#10B981" }}>
            ✓
          </Typography>
        </Typography>
      </Box>
    );
  }

  if (["progress", "download", "webgpu-fallback", "fallback"].includes(status)) {
    return (
      <Box sx={{ width: "100%" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
          <Typography
            sx={{
              fontSize: 9,
              fontFamily: '"JetBrains Mono Variable", monospace',
              color: "#FBBF24",
            }}
          >
            {["fallback", "webgpu-fallback"].includes(status) && "⟳ "}
            {label}
            {status === "webgpu-fallback" && (
              <Typography component="span" sx={{ fontSize: 8, color: "#64748B", ml: 0.5 }}>
                CPU
              </Typography>
            )}
            {status === "fallback" && (
              <Typography component="span" sx={{ fontSize: 8, color: "#64748B", ml: 0.5 }}>
                legacy
              </Typography>
            )}
          </Typography>
          <Typography
            sx={{
              fontSize: 9,
              fontFamily: '"JetBrains Mono Variable", monospace',
              color: "#94A3B8",
            }}
          >
            {pct}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: "rgba(30, 41, 59, 0.6)",
            "& .MuiLinearProgress-bar": {
              background: "linear-gradient(90deg, #F59E0B, #34D399)",
              borderRadius: 2,
            },
          }}
        />
      </Box>
    );
  }

  return null;
}

export default function AiStatusChip() {
  const whisperLoaded = useSoundStore((s) => s.whisperModelLoaded);
  const semanticLoaded = useSoundStore((s) => s.semanticModelLoaded);
  const whisperProgress = useSoundStore((s) => s.whisperProgress);
  const semanticProgress = useSoundStore((s) => s.semanticProgress);

  const hasActivity =
    ["progress", "download", "webgpu-fallback", "fallback"].includes(whisperProgress.status) ||
    ["progress", "download", "webgpu-fallback", "fallback"].includes(semanticProgress.status) ||
    !whisperLoaded ||
    !semanticLoaded;

  if (!hasActivity) return null;

  return (
    <GlassPaper sx={{ p: 1.5, minWidth: 180, "& + &": { mt: 1 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          pb: 1,
          mb: 1,
        }}
      >
        <Box
          sx={{
            width: 4,
            height: 12,
            borderRadius: 1,
            background: "linear-gradient(180deg, #C9973A 0%, rgba(201,151,58,0.3) 100%)",
          }}
        />
        <CinemaLabel>Model Downloads</CinemaLabel>
      </Box>
      <ModelProgress
        label="Whisper"
        loaded={whisperProgress.loaded}
        total={whisperProgress.total}
        status={whisperProgress.status}
        ready={whisperLoaded}
      />
      <Box sx={{ mt: 1 }}>
        <ModelProgress
          label="Embedder"
          loaded={semanticProgress.loaded}
          total={semanticProgress.total}
          status={semanticProgress.status}
          ready={semanticLoaded}
        />
      </Box>
    </GlassPaper>
  );
}
