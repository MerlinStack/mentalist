import type { ReactNode } from "react";
import Box from "@mui/material/Box";

type Variant = "default" | "primary" | "accent" | "success" | "warning" | "error";

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
}

const styles: Record<Variant, Record<string, string>> = {
  default: { background: "rgba(255,255,255,0.04)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.10)" },
  primary: { background: "rgba(201, 151, 58, 0.15)", color: "#FFD580", border: "1px solid rgba(201, 151, 58, 0.30)" },
  accent: { background: "rgba(201, 151, 58, 0.20)", color: "#C9973A", border: "1px solid rgba(201, 151, 58, 0.30)" },
  success: { background: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.30)" },
  warning: { background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", border: "1px solid rgba(245, 158, 11, 0.30)" },
  error: { background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.30)" },
};

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        py: 0.25,
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 1,
        ...styles[variant],
      }}
    >
      {children}
    </Box>
  );
}
