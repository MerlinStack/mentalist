import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export const GlassPaper = styled(Paper)(({ theme }) => ({
  background: "rgba(13, 20, 38, 0.60)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
  borderRadius: 12,
}));

export const CinemaLabel = styled(Typography)({
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#64748B",
});

export const CinemaReference = styled(Typography)({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#C9973A",
});

export const CinemaVerse = styled(Typography)({
  fontFamily: '"Georgia", "Times New Roman", serif',
  fontSize: 22,
  lineHeight: 1.8,
  letterSpacing: "0.01em",
  color: "#F1F5F9",
  fontStyle: "italic",
});

export const MonoText = styled(Typography)({
  fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
});
