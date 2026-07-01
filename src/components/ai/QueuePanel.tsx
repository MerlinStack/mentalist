import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import { GlassPaper, CinemaLabel } from "../styled";
import type { Verse } from "../../api/bible";

interface QueuePanelProps {
  queue: Verse[];
  onProject: (v: Verse) => void;
  onRemove: (i: number) => void;
  onProjectNext: () => void;
}

export default function QueuePanel({ queue, onProject, onRemove, onProjectNext }: QueuePanelProps) {
  return (
    <GlassPaper
      sx={{
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        borderRadius: 4,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 1.5, flexShrink: 0 }}>
        <Box
          sx={{
            width: 4,
            height: 12,
            borderRadius: 1,
            background: "linear-gradient(180deg, #FFD580 0%, rgba(201,151,58,0.3) 100%)",
          }}
        />
        <CinemaLabel
          sx={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#FFD580",
          }}
        >
          Queue
        </CinemaLabel>
        {queue.length > 0 && (
          <Chip
            label={queue.length}
            size="small"
            sx={{
              height: 18,
              fontSize: 9,
              fontFamily: "'JetBrains Mono Variable', monospace",
              bgcolor: "rgba(30,41,59,0.5)",
              color: "#94A3B8",
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          px: 2.5,
          pb: 2,
          overflowX: "auto",
          overflowY: "hidden",
          flexShrink: 0,
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-track": { bgcolor: "rgba(255,255,255,0.02)", borderRadius: 2 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.08)", borderRadius: 2 },
        }}
      >
        {queue.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              py: 1.5,
              width: "100%",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 10,
                color: "#475569",
                fontFamily: '"JetBrains Mono Variable", monospace',
                fontStyle: "italic",
              }}
            >
              Queue is empty
            </Typography>
          </Box>
        ) : (
          queue.map((v, i) => {
            const ref = v.reference || v.ref || "";
            return (
              <Paper
                key={`${ref}-${i}`}
                variant="outlined"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: "rgba(26,32,53,0.4)",
                  borderColor: "rgba(45,58,92,0.2)",
                  minWidth: 200,
                  maxWidth: 200,
                  flexShrink: 0,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#C9973A",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ref}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 9,
                      color: "#94A3B8",
                      mt: 0.25,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.text}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
                  <Button
                    size="small"
                    onClick={() => onProject(v)}
                    sx={{ px: 0.75, py: 0.25, fontSize: 8, minWidth: 0, color: "#94A3B8" }}
                  >
                    Live
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => onRemove(i)}
                    sx={{
                      fontSize: 8,
                      color: "#64748B",
                      bgcolor: "rgba(30,41,59,0.5)",
                      border: "1px solid rgba(51,65,85,0.5)",
                      borderRadius: 1,
                      p: 0.5,
                      "&:hover": { color: "#fff" },
                    }}
                  >
                    &times;
                  </IconButton>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {queue.length > 0 && (
        <Box sx={{ px: 2.5, pb: 2, flexShrink: 0 }}>
          <Button variant="contained" onClick={onProjectNext} sx={{ py: 0.75, px: 2, fontSize: 9 }}>
            Project Next &rarr;
          </Button>
        </Box>
      )}
    </GlassPaper>
  );
}
