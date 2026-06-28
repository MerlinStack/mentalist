import { createTheme } from "@mui/material/styles";

export const premiumConsoleTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#05070f",
      paper: "rgba(11, 15, 28, 0.65)",
    },
    primary: {
      main: "#E2B04E",
      light: "#FFD580",
      dark: "#C9973A",
    },
    secondary: {
      main: "#10B981",
      light: "#34D399",
      dark: "#059669",
    },
    error: {
      main: "#EF4444",
      light: "#F87171",
      dark: "#DC2626",
    },
    info: {
      main: "#3B82F6",
      light: "#60A5FA",
      dark: "#2563EB",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255, 255, 255, 0.6)",
      disabled: "rgba(255, 255, 255, 0.25)",
    },
  },
  typography: {
    fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif',
    body1: {
      fontFamily: '"Inter", sans-serif',
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(11, 15, 28, 0.55)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "6px",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.03)",
          backgroundImage: "none",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(226, 176, 78, 0.2), transparent)",
            opacity: 0,
            transition: "opacity 0.4s ease",
          },
          "&:hover": {
            borderColor: "rgba(226, 176, 78, 0.15)",
            boxShadow: "0 8px 40px 0 rgba(0, 0, 0, 0.5), 0 0 40px rgba(226, 176, 78, 0.03)",
            transform: "translateY(-2px)",
            "&::before": {
              opacity: 1,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(3, 5, 10, 0.6)",
          borderRadius: "10px",
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: "13px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.06)",
            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          },
          "&:hover": {
            backgroundColor: "rgba(3, 5, 10, 0.75)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(226, 176, 78, 0.3)",
              boxShadow: "0 0 20px rgba(226, 176, 78, 0.03)",
            },
          },
          "&.Mui-focused": {
            backgroundColor: "rgba(3, 5, 10, 0.8)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#E2B04E",
              borderWidth: "1px",
              boxShadow: "0 0 30px rgba(226, 176, 78, 0.06)",
            },
          },
        },
        input: {
          "&::placeholder": {
            color: "rgba(255, 255, 255, 0.25)",
            opacity: 1,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "8px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.1), transparent 60%)",
            opacity: 0,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          },
          "&:hover::after": {
            opacity: 1,
          },
        },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            background: "linear-gradient(135deg, #C9973A, #E2B04E, #FFD580)",
            color: "#080D1C",
            boxShadow: "0 4px 20px rgba(226, 176, 78, 0.25), 0 2px 8px rgba(226, 176, 78, 0.15)",
            "&:hover": {
              background: "linear-gradient(135deg, #D4A84A, #E8B85E, #FFD580)",
              boxShadow: "0 6px 30px rgba(226, 176, 78, 0.35), 0 4px 12px rgba(226, 176, 78, 0.2)",
              transform: "translateY(-2px) scale(1.01)",
            },
            "&:active": {
              transform: "translateY(0px) scale(0.98)",
              boxShadow: "0 2px 10px rgba(226, 176, 78, 0.2)",
            },
            "&:disabled": {
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgba(255, 255, 255, 0.2)",
              boxShadow: "none",
            },
          },
        },
        {
          props: { variant: "contained", color: "secondary" },
          style: {
            background: "linear-gradient(135deg, #059669, #10B981, #34D399)",
            color: "#FFFFFF",
            boxShadow: "0 4px 20px rgba(16, 185, 129, 0.25), 0 2px 8px rgba(16, 185, 129, 0.15)",
            "&:hover": {
              background: "linear-gradient(135deg, #0A7A4A, #16C98A, #3DD399)",
              boxShadow: "0 6px 30px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(16, 185, 129, 0.2)",
              transform: "translateY(-2px) scale(1.01)",
            },
            "&:active": {
              transform: "translateY(0px) scale(0.98)",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.2)",
            },
            "&:disabled": {
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgba(255, 255, 255, 0.2)",
              boxShadow: "none",
            },
          },
        },
        {
          props: { variant: "outlined", color: "primary" },
          style: {
            borderColor: "rgba(226, 176, 78, 0.3)",
            color: "#E2B04E",
            "&:hover": {
              borderColor: "#E2B04E",
              backgroundColor: "rgba(226, 176, 78, 0.05)",
              boxShadow: "0 0 30px rgba(226, 176, 78, 0.05)",
            },
          },
        },
        {
          props: { variant: "outlined", color: "error" },
          style: {
            borderColor: "rgba(239, 68, 68, 0.3)",
            color: "#EF4444",
            "&:hover": {
              borderColor: "#EF4444",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
            },
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "10px",
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          borderRadius: "6px",
          "& .MuiChip-label": {
            padding: "0 6px",
          },
        },
        filled: {
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          color: "rgba(255, 255, 255, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        },
        colorPrimary: {
          backgroundColor: "rgba(226, 176, 78, 0.1)",
          color: "#E2B04E",
          border: "1px solid rgba(226, 176, 78, 0.2)",
        },
        colorSecondary: {
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          color: "#10B981",
          border: "1px solid rgba(16, 185, 129, 0.2)",
        },
        sizeSmall: {
          height: "20px",
          fontSize: "9px",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(255, 255, 255, 0.04)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "rgba(11, 15, 28, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.04)",
          backgroundImage: "none",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "rgba(11, 15, 28, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "8px",
          fontSize: "11px",
          padding: "8px 12px",
          color: "rgba(255, 255, 255, 0.8)",
        },
        arrow: {
          color: "rgba(11, 15, 28, 0.95)",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(226, 176, 78, 0.2) transparent",
        },
        "*::-webkit-scrollbar": {
          width: "4px",
          height: "4px",
        },
        "*::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "*::-webkit-scrollbar-thumb": {
          background: "rgba(226, 176, 78, 0.2)",
          borderRadius: "4px",
          "&:hover": {
            background: "rgba(226, 176, 78, 0.4)",
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          "&::selection": {
            backgroundColor: "rgba(201, 151, 58, 0.3)",
          },
        },
      },
    },
  },
});
