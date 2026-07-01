import { useNavigate } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        px: 2,
        py: 10,
        bgcolor: "#0F0F0F",
      }}
    >
      <Box sx={{ textAlign: "center", maxWidth: 480 }}>
        <Typography sx={{ fontSize: 80, fontWeight: 700, color: "rgba(139, 92, 246, 0.3)", mb: 2 }}>
          404
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#fff", mb: 1 }}>
          Page Not Found
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#94A3B8", mb: 4 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Button variant="contained" onClick={() => navigate({ to: "/" })}>
          Return Home
        </Button>
      </Box>
    </Box>
  );
}
