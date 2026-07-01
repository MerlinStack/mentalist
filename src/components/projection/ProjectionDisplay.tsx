import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface ProjectedVerse {
  reference: string;
  text: string;
  translation: string;
}

export const ProjectionDisplay: React.FC = () => {
  const [currentVerse, setCurrentVerse] = useState<ProjectedVerse | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel("scriptureflow-projection");

    channel.onmessage = (event) => {
      if (event.data.type === "PROJECT_VERSE") {
        setIsVisible(false);
        setTimeout(() => {
          setCurrentVerse(event.data.verse);
          setIsVisible(true);
        }, 200);
      } else if (event.data.type === "CLEAR" || event.data.type === "CLEAR_PROJECTION") {
        setIsVisible(false);
        setCurrentVerse(null);
      }
    };

    if ((navigator as any).presentation?.receiver) {
      (navigator as any).presentation.receiver.connectionList.then((list: any) => {
        list.connections.forEach((connection: any) => {
          connection.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === "PROJECT_VERSE") {
              setCurrentVerse(data.verse);
              setIsVisible(true);
            }
          };
        });
      });
    }

    const KEY = "mentalist_projection_verse";
    const updateFromStorage = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data?.text) {
            setCurrentVerse(data);
            setIsVisible(true);
          }
        }
      } catch {}
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        if (e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data?.text) {
              setCurrentVerse(data);
              setIsVisible(true);
            }
          } catch {}
        } else {
          setCurrentVerse(null);
          setIsVisible(false);
        }
      }
    };

    updateFromStorage();
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(updateFromStorage, 500);

    return () => {
      channel.close();
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const verseLength = currentVerse?.text?.length || 0;
  const bodyFontSize =
    verseLength > 300
      ? { md: "2.2rem", lg: "2.8rem", xl: "3.2rem" }
      : verseLength > 150
        ? { md: "2.8rem", lg: "3.5rem", xl: "4rem" }
        : { md: "3.5rem", lg: "4.5rem", xl: "5.5rem" };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "#040711",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: { xs: 4, md: 6 },
        textAlign: "center",
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: "60vw",
          height: "60vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,151,58,0.03) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          width: "100%",
          maxWidth: "90%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          boxSizing: "border-box",
          transition:
            "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: isVisible && currentVerse ? 1 : 0,
          transform: isVisible && currentVerse ? "scale(1)" : "scale(0.98)",
          zIndex: 1,
        }}
      >
        {currentVerse && (
          <>
            <Typography
              sx={{
                fontFamily: "'Playfair Display', 'Georgia', serif",
                fontSize: bodyFontSize,
                fontWeight: 500,
                lineHeight: 1.4,
                color: "#F8FAFC",
                textShadow: "0 4px 12px rgba(0,0,0,0.5)",
                mb: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentVerse.text}
            </Typography>

            <Typography
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontSize: { md: "1.5rem", lg: "1.75rem" },
                fontWeight: 600,
                color: "#C9973A",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              {currentVerse.reference}{" "}
              {currentVerse.translation && (
                <Box
                  component="span"
                  sx={{
                    fontSize: "0.6em",
                    color: "rgba(255,255,255,0.3)",
                    ml: 1,
                    px: 1,
                    py: 0.5,
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 1,
                    verticalAlign: "middle",
                  }}
                >
                  {currentVerse.translation}
                </Box>
              )}
            </Typography>
          </>
        )}
      </Box>

      {!currentVerse && (
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.25rem",
            color: "#475569",
            zIndex: 1,
          }}
        >
          Waiting for verse...
        </Typography>
      )}
    </Box>
  );
};
