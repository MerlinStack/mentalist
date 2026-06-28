import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
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
    <GlassPaper sx={{ display: "flex", flexDirection: "column", maxHeight: 320 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, borderBottom: "1px solid rgba(255,255,255,0.04)", px: 2.5, py: 1.5 }}>
        <Box sx={{ width: 4, height: 12, borderRadius: 1, background: "linear-gradient(180deg, #C9973A 0%, rgba(201,151,58,0.3) 100%)" }} />
        <CinemaLabel>Projection Queue</CinemaLabel>
        <Typography sx={{ ml: "auto", fontSize: 10, color: "#64748B", fontFamily: '"JetBrains Mono Variable", monospace' }}>
          {queue.length}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 1 }}>
        {queue.length === 0 ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", py: 4 }}>
            <Typography sx={{ fontSize: 10, color: "#475569", fontFamily: '"JetBrains Mono Variable", monospace', fontStyle: "italic" }}>
              Queue is empty
            </Typography>
          </Box>
        ) : (
          queue.map((v, i) => {
            const ref = v.reference || v.ref || "";
            return (
              <Box
                key={`${ref}-${i}`}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: 1,
                  bgcolor: "rgba(26, 32, 53, 0.4)",
                  border: "1px solid rgba(45, 58, 92, 0.2)",
                  "& + &": { mt: 1 },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 600, color: "#C9973A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ref}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: "#94A3B8", mt: 0.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.text}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onProject(v)}
                    sx={{
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      fontSize: 9,
                      fontWeight: 600,
                      background: "linear-gradient(135deg, #C9973A 0%, #FFD580 100%)",
                      color: "#080D1C",
                      "&:hover": { background: "linear-gradient(135deg, #D4A44A 0%, #FFE08A 100%)" },
                    }}
                  >
                    Live
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => onRemove(i)}
                    sx={{ color: "#64748B", fontSize: 14, "&:hover": { color: "#fff" } }}
                  >
                    ×
                  </IconButton>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {queue.length > 0 && (
        <Box sx={{ px: 2.5, pb: 2, flexShrink: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={onProjectNext}
            sx={{
              py: 1,
              fontSize: 10,
              fontWeight: 600,
              background: "linear-gradient(135deg, #C9973A 0%, #FFD580 100%)",
              color: "#080D1C",
              "&:hover": { background: "linear-gradient(135deg, #D4A44A 0%, #FFE08A 100%)" },
            }}
          >
            Project Next &rarr;
          </Button>
        </Box>
      )}
    </GlassPaper>
  );
}
