import MuiButton from "@mui/material/Button";
import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<MuiButtonProps, "variant" | "size"> {
  variant?: Variant;
  size?: Size;
}

const variantMap: Record<Variant, MuiButtonProps["color"]> = {
  primary: "primary",
  secondary: "secondary",
  ghost: "info",
  accent: "primary",
  danger: "error",
};

const sizeMap: Record<Size, MuiButtonProps["size"]> = {
  sm: "small",
  md: "medium",
  lg: "large",
};

export default function Button({
  variant = "primary",
  size = "md",
  sx,
  ...props
}: ButtonProps) {
  return (
    <MuiButton
      variant={variant === "accent" ? "contained" : variant === "ghost" ? "text" : "contained"}
      color={variantMap[variant]}
      size={sizeMap[size]}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        borderRadius: 2,
        ...(variant === "accent" && {
          background: "linear-gradient(135deg, #C9973A 0%, #FFD580 100%)",
          color: "#080D1C",
          "&:hover": { background: "linear-gradient(135deg, #D4A44A 0%, #FFE08A 100%)" },
        }),
        ...(variant === "ghost" && {
          background: "transparent",
          color: "#94A3B8",
          "&:hover": { background: "rgba(255,255,255,0.04)", color: "#F1F5F9" },
        }),
        ...(variant === "secondary" && {
          background: "rgba(255,255,255,0.04)",
          color: "#F1F5F9",
          border: "1px solid rgba(255,255,255,0.10)",
          "&:hover": { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.20)" },
        }),
        ...sx,
      }}
      {...props}
    />
  );
}
