import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useScriptureStore } from "../store/scriptureStore";
import { useSoundStore } from "../store/soundStore";
import { useProjectionStore, themeConfig } from "../store/projectionStore";
import { TRANSLATIONS } from "../data/versions";
import { getRecentSessions } from "../lib/firestore";
import Button from "../components/shared/Button";
import Badge from "../components/shared/Badge";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

interface SessionData {
  id: string;
  date?: { toDate?: () => Date };
  verses?: Array<{ reference?: string; ref?: string; translation?: string }>;
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("stats");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const scripture = useScriptureStore();
  const sound = useSoundStore();
  const projection = useProjectionStore();

  useEffect(() => {
    if (!user) return;
    getRecentSessions((user as any).uid, 20)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, [user]);

  const totalVersesProjected = sessions.reduce(
    (sum: number, s: SessionData) => sum + (s.verses?.length || 0),
    0,
  );

  const tabs = [
    { id: "stats", label: "Usage Stats" },
    { id: "translations", label: "Translations" },
    { id: "sound", label: "Sound Mode" },
    { id: "projection", label: "Projection" },
    { id: "sessions", label: "Service Logs" },
    { id: "data", label: "Data" },
  ];

  const clearAllData = () => {
    localStorage.removeItem("scriptureflow-v1");
    localStorage.removeItem("scriptureflow-sound");
    localStorage.removeItem("scriptureflow-projection");
    localStorage.removeItem("scriptureflow-usage");
    localStorage.removeItem("scriptureflow-tts");
    localStorage.removeItem("mentalist-operator-theme");
    scripture.clearHistory();
    scripture.clearResults();
    sound.reset();
    projection.clearProjection();
    projection.setTheme("dark");
    projection.setFontSize("large");
    projection.setShowReference(true);
    projection.setShowTranslation(true);
    sound.setSensitivity("medium");
    alert("All local data cleared.");
    window.location.reload();
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, lg: 4 } }}>
      <Box sx={{ maxWidth: 896, mx: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography
              sx={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: '"Inter", system-ui, sans-serif',
                color: "#F1F5F9",
              }}
            >
              Admin
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.5 }}>
              {(user as any)?.email}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Badge variant="success">{sessions.length} sessions</Badge>
            <Button size="sm" variant="secondary" onClick={logout}>
              Sign Out
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            p: 0.5,
            borderRadius: 3,
            bgcolor: "rgba(26, 32, 53, 0.4)",
            border: "1px solid rgba(255,255,255,0.04)",
            width: "fit-content",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab) => (
            <Box
              key={tab.id}
              component="button"
              onClick={() => setActiveTab(tab.id)}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 1.5,
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: '"Inter", system-ui, sans-serif',
                bgcolor: activeTab === tab.id ? "primary.main" : "transparent",
                color: activeTab === tab.id ? "#fff" : "#64748B",
                "&:hover": activeTab === tab.id ? {} : { color: "#F1F5F9" },
                boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
              }}
            >
              {tab.label}
            </Box>
          ))}
        </Box>

        {/* Usage Stats */}
        {activeTab === "stats" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              {[
                { label: "Service Sessions", value: sessions.length },
                { label: "Verses Projected", value: totalVersesProjected },
                { label: "History Size", value: scripture.searchHistory.length },
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: "rgba(26, 32, 53, 0.4)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography sx={{ fontSize: 30, fontWeight: 700, color: "#F1F5F9", mt: 0.5 }}>
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Translation settings */}
        {activeTab === "translations" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "rgba(26, 32, 53, 0.4)",
                border: "1px solid rgba(255,255,255,0.04)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#F1F5F9" }}>
                  Translation Settings
                </Typography>
                <Typography sx={{ fontSize: 10, color: "#64748B", mt: 0.5 }}>
                  Select the active translation for searches
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {Object.entries(TRANSLATIONS).map(([id, t]) => (
                  <Box
                    key={id}
                    component="label"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      border: "1px solid",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      borderColor:
                        scripture.activeTranslation === id
                          ? "rgba(201,151,58,0.4)"
                          : "rgba(255,255,255,0.04)",
                      bgcolor:
                        scripture.activeTranslation === id
                          ? "rgba(201,151,58,0.1)"
                          : "rgba(10,15,30,0.5)",
                      "&:hover":
                        scripture.activeTranslation === id
                          ? {}
                          : { bgcolor: "rgba(26, 32, 53, 0.3)" },
                    }}
                  >
                    <Radio
                      checked={scripture.activeTranslation === id}
                      onChange={() => scripture.setTranslation(id)}
                      size="small"
                      sx={{ color: "#64748B", "&.Mui-checked": { color: "primary.main" } }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#F1F5F9" }}>
                          {t.label}
                        </Typography>
                        <Badge variant="default">{t.short}</Badge>
                      </Box>
                      <Typography sx={{ fontSize: 10, color: "#64748B" }}>
                        API: {t.apiCode}{" "}
                        {t.publicDomain ? (
                          <Box component="span" sx={{ color: "#34D399" }}>
                            (Public Domain)
                          </Box>
                        ) : (
                          <Box component="span" sx={{ color: "#C9973A" }}>
                            (Licensed — fallback used)
                          </Box>
                        )}
                      </Typography>
                    </Box>
                    {scripture.activeTranslation === id && <Badge variant="primary">Active</Badge>}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "rgba(201,151,58,0.1)",
                border: "1px solid rgba(201,151,58,0.2)",
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 500, color: "#C9973A", mb: 0.5 }}>
                ⚠ Translation Notice
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6 }}>
                bible-api.com only serves public-domain translations (KJV, WEB, Darby, ASV, YLT).
                NIV and ESV are copyrighted and require a licensed API provider like{" "}
                <Box
                  component="a"
                  href="https://scripture.api.bible"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "#818CF8", "&:hover": { textDecoration: "underline" } }}
                >
                  scripture.api.bible
                </Box>
                . Until then, selecting NIV shows WEB text, ESV shows Darby, and NKJV shows KJV.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Sound mode settings */}
        {activeTab === "sound" && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "rgba(26, 32, 53, 0.4)",
              border: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#F1F5F9" }}>
                Sound Mode Settings
              </Typography>
              <Typography sx={{ fontSize: 10, color: "#64748B", mt: 0.5 }}>
                Default detection sensitivity
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {(["low", "medium", "high"] as const).map((s) => (
                <Box
                  key={s}
                  component="button"
                  onClick={() => sound.setSensitivity(s)}
                  sx={{
                    flex: 1,
                    px: 2,
                    py: 1.5,
                    borderRadius: 1.5,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: '"Inter", system-ui, sans-serif',
                    bgcolor: sound.sensitivity === s ? "primary.main" : "rgba(10,15,30,0.5)",
                    color: sound.sensitivity === s ? "#fff" : "#64748B",
                    "&:hover":
                      sound.sensitivity === s
                        ? {}
                        : { color: "#F1F5F9", bgcolor: "rgba(26, 32, 53, 0.3)" },
                    boxShadow: sound.sensitivity === s ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  <Box sx={{ textTransform: "capitalize" }}>{s}</Box>
                  <Typography sx={{ fontSize: 9, opacity: 0.7, mt: 0.25 }}>
                    {s === "low" && "Confirm all"}
                    {s === "medium" && "Auto high"}
                    {s === "high" && "Auto all"}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Projection settings */}
        {activeTab === "projection" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "rgba(26, 32, 53, 0.4)",
                border: "1px solid rgba(255,255,255,0.04)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#F1F5F9" }}>
                  Projection Settings
                </Typography>
                <Typography sx={{ fontSize: 10, color: "#64748B", mt: 0.5 }}>
                  Default theme and font size
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 10, color: "#64748B", mb: 1, display: "block" }}>
                  Default Theme
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {Object.entries(themeConfig).map(([key, t]) => (
                    <Box
                      key={key}
                      component="button"
                      onClick={() => projection.setTheme(key as "dark" | "light" | "warm")}
                      sx={{
                        flex: 1,
                        p: 2,
                        borderRadius: 1.5,
                        border: "2px solid",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        borderColor:
                          projection.theme === key ? "primary.main" : "rgba(255,255,255,0.04)",
                        "&:hover":
                          projection.theme === key ? {} : { borderColor: "rgba(255,255,255,0.1)" },
                        bgcolor: t.bg,
                        color: t.text,
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: t.text }}>
                        {t.name}
                      </Typography>
                      <Typography sx={{ fontSize: 9, opacity: 0.7, mt: 0.25, color: t.text }}>
                        Aa
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 10, color: "#64748B", mb: 1, display: "block" }}>
                  Default Font Size
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {(["medium", "large", "xlarge"] as const).map((s) => (
                    <Box
                      key={s}
                      component="button"
                      onClick={() => projection.setFontSize(s)}
                      sx={{
                        flex: 1,
                        px: 2,
                        py: 1.5,
                        borderRadius: 1.5,
                        fontSize: 12,
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontFamily: '"Inter", system-ui, sans-serif',
                        bgcolor: projection.fontSize === s ? "primary.main" : "rgba(10,15,30,0.5)",
                        color: projection.fontSize === s ? "#fff" : "#64748B",
                        "&:hover":
                          projection.fontSize === s
                            ? {}
                            : { color: "#F1F5F9", bgcolor: "rgba(26, 32, 53, 0.3)" },
                        boxShadow:
                          projection.fontSize === s ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                      }}
                    >
                      <Box sx={{ textTransform: "capitalize" }}>{s}</Box>
                      <Typography sx={{ fontSize: 9, opacity: 0.7, mt: 0.25 }}>
                        {s === "medium" && "36px"}
                        {s === "large" && "48px"}
                        {s === "xlarge" && "64px"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={projection.showReference}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        projection.setShowReference(e.target.checked)
                      }
                      size="small"
                      sx={{ color: "#64748B", "&.Mui-checked": { color: "primary.main" } }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 12, color: "#F1F5F9" }}>
                      Show verse reference
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={projection.showTranslation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        projection.setShowTranslation(e.target.checked)
                      }
                      size="small"
                      sx={{ color: "#64748B", "&.Mui-checked": { color: "primary.main" } }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 12, color: "#F1F5F9" }}>
                      Show translation label
                    </Typography>
                  }
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Service Logs */}
        {activeTab === "sessions" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: "rgba(26, 32, 53, 0.4)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#F1F5F9", mb: 1.5 }}>
                Service Sessions
              </Typography>
              {loadingSessions ? (
                <Typography sx={{ fontSize: 12, color: "#64748B" }}>Loading sessions...</Typography>
              ) : sessions.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                  No service sessions yet. Start projecting verses to log them.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {sessions.map((s: SessionData) => {
                    const verses = s.verses;
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: "rgba(10,15,30,0.5)",
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 0.5,
                          }}
                        >
                          <Typography sx={{ fontSize: 10, color: "#64748B" }}>
                            {s.date?.toDate?.()?.toLocaleString() || "Just now"}
                          </Typography>
                          <Badge variant="default">{verses?.length || 0} verses</Badge>
                        </Box>
                        {verses && verses.length > 0 && (
                          <Box
                            sx={{ display: "flex", flexDirection: "column", gap: 0.25, mt: 0.5 }}
                          >
                            <Typography sx={{ fontSize: 10, color: "#94A3B8" }}>
                              {verses.slice(0, 3).map((v: any, i: number) => (
                                <Box key={i}>
                                  {v.reference || v.ref} — {v.translation}
                                </Box>
                              ))}
                              {verses.length > 3 && (
                                <Box sx={{ color: "#64748B" }}>+{verses.length - 3} more</Box>
                              )}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Data section */}
        {activeTab === "data" && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "rgba(26, 32, 53, 0.4)",
              border: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#F1F5F9" }}>
                Data & Storage
              </Typography>
              <Typography sx={{ fontSize: 10, color: "#64748B", mt: 0.5 }}>
                Manage application data
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                fontSize: 12,
                color: "#94A3B8",
                bgcolor: "rgba(10,15,30,0.5)",
                borderRadius: 1.5,
                p: 2,
              }}
            >
              <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>
                Search history and settings are stored locally (localStorage).
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>
                Service logs are saved to Firebase and synced across devices.
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>
                Clearing data will reset all local settings and search history.
              </Typography>
            </Box>
            <Button variant="danger" onClick={clearAllData}>
              Clear All Local Data
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
