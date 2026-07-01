import { useCallback, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useScriptureStore } from "../../store/scriptureStore";
import { useSoundStore } from "../../store/soundStore";
import { CinemaLabel, GlassPaper } from "../styled";

interface AudioControlsProps {
  onToggleMic?: () => void;
  isListening?: boolean;
  isProcessing?: boolean;
  audioLevel?: number;
}

export default function AudioControls({ onToggleMic, isListening: externalListening, isProcessing: externalProcessing, audioLevel: externalLevel }: AudioControlsProps) {
  const storeListening = useSoundStore((s) => s.isListening);
  const storeProcessing = useSoundStore((s) => s.isProcessing);
  const storeAudioLevel = useSoundStore((s) => s.audioLevel);
  const storeTranscript = useSoundStore((s) => s.transcript);
  const storeError = useSoundStore((s) => s.error);
  const whisperLoaded = useSoundStore((s) => s.whisperModelLoaded);
  const semanticLoaded = useSoundStore((s) => s.semanticModelLoaded);

  const isListening = externalListening ?? storeListening;
  const isProcessing = externalProcessing ?? storeProcessing;
  const audioLevel = externalLevel ?? storeAudioLevel;

  const handleToggle = useCallback(() => {
    onToggleMic?.();
  }, [onToggleMic]);

  const levelColor = isListening
    ? audioLevel > 60
      ? "#F43F5E"
      : audioLevel > 30
        ? "#FBBF24"
        : "#34D399"
    : "#475569";

  return (
    <GlassPaper
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 2,
        minWidth: 180,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CinemaLabel>Audio</CinemaLabel>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: whisperLoaded ? "#34D399" : "#475569" }} />
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: semanticLoaded ? "#818CF8" : "#475569" }} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Tooltip title={isListening ? "Stop listening" : "Start listening"}>
          <Button
            variant={isListening ? "outlined" : "contained"}
            size="small"
            onClick={handleToggle}
            startIcon={
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: isListening ? "#F43F5E" : "#64748B",
                  animation: isListening ? "ping 1s cubic-bezier(0,0,0.2,1) infinite" : "none",
                }}
              />
            }
            sx={{
              fontSize: 10,
              px: 1.5,
              borderColor: isListening ? "rgba(244,63,94,0.3)" : "rgba(255,255,255,0.07)",
              color: isListening ? "#FB7185" : "#CBD5E1",
              bgcolor: isListening ? "rgba(244,63,94,0.1)" : "rgba(26,32,53,0.3)",
            }}
          >
            {isListening ? "Mute" : "Mic"}
          </Button>
        </Tooltip>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(30,41,59,0.6)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${Math.min(audioLevel, 100)}%`,
                height: "100%",
                borderRadius: 2,
                bgcolor: levelColor,
                transition: "all 0.15s ease",
              }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: 9,
              fontFamily: '"JetBrains Mono Variable", monospace',
              color: levelColor,
              minWidth: 24,
              textAlign: "right",
            }}
          >
            {audioLevel}
          </Typography>
        </Box>
      </Box>

      {isProcessing && (
        <CinemaLabel sx={{ fontSize: 8, color: "#FBBF24", animation: "pulse 2s infinite" }}>
          Processing...
        </CinemaLabel>
      )}

      {storeError && (
        <CinemaLabel sx={{ fontSize: 8, color: "#FB7185" }}>
          {storeError}
        </CinemaLabel>
      )}

      {storeTranscript && (
        <Typography
          sx={{
            fontSize: 9,
            color: "#64748B",
            fontFamily: '"JetBrains Mono Variable", monospace',
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 200,
          }}
        >
          {storeTranscript}
        </Typography>
      )}
    </GlassPaper>
  );
}
