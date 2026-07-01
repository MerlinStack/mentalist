import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { useScriptureStore } from "../../store/scriptureStore";
import { CinemaLabel, GlassPaper } from "../styled";

interface ConfidenceDisplayProps {
  compact?: boolean;
  showLabel?: boolean;
  showSource?: boolean;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return "#34D399";
  if (confidence >= 70) return "#FBBF24";
  if (confidence >= 50) return "#FB923C";
  return "#FB7185";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 95) return "Excellent";
  if (confidence >= 90) return "Very High";
  if (confidence >= 80) return "High";
  if (confidence >= 70) return "Good";
  if (confidence >= 50) return "Fair";
  return "Low";
}

export default function ConfidenceDisplay({ compact = false, showLabel = true, showSource = true }: ConfidenceDisplayProps) {
  const confidence = useScriptureStore((s) => s.confidence);
  const detectionSource = useScriptureStore((s) => s.detectionSource);
  const activeVerse = useScriptureStore((s) => s.activeVerse);

  if (!activeVerse && confidence === 0) return null;

  const color = getConfidenceColor(confidence);

  if (compact) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: '"JetBrains Mono Variable", monospace',
            color,
          }}
        >
          {confidence}%
        </Typography>
        {showSource && detectionSource && (
          <Typography sx={{ fontSize: 8, color: "#64748B", fontFamily: '"JetBrains Mono Variable", monospace' }}>
            {detectionSource}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <GlassPaper
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 2,
        minWidth: 160,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CinemaLabel>Confidence</CinemaLabel>
        {showLabel && (
          <Typography
            sx={{
              fontSize: 9,
              fontFamily: '"JetBrains Mono Variable", monospace',
              color,
              fontWeight: 600,
            }}
          >
            {getConfidenceLabel(confidence)}
          </Typography>
        )}
      </Box>

      <Typography
        sx={{
          fontSize: 36,
          fontWeight: 700,
          fontFamily: '"JetBrains Mono Variable", monospace',
          color,
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {confidence}
        <Typography
          component="span"
          sx={{ fontSize: 16, color: "#64748B", fontWeight: 400, fontFamily: '"JetBrains Mono Variable", monospace' }}
        >
          %
        </Typography>
      </Typography>

      <LinearProgress
        variant="determinate"
        value={confidence}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: "rgba(30, 41, 59, 0.6)",
          "& .MuiLinearProgress-bar": {
            backgroundColor: color,
            borderRadius: 2,
          },
        }}
      />

      {showSource && detectionSource && (
        <CinemaLabel sx={{ fontSize: 8, mt: 0.5 }}>
          Source: {detectionSource}
        </CinemaLabel>
      )}
    </GlassPaper>
  );
}
