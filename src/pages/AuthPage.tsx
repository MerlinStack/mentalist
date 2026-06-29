import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) {
    navigate({ to: "/app", replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate({ to: "/app", replace: true });
    } catch (err: any) {
      const msg = err.code ? err.code.replace("auth/", "").replace(/-/g, " ") : err.message;
      setError(msg);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await loginWithGoogle();
      navigate({ to: "/app", replace: true });
    } catch (err: any) {
      setError(err.code ? err.code.replace("auth/", "").replace(/-/g, " ") : err.message);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0F0F0F", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Box sx={{ width: "100%", maxWidth: 400 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box
            component="button"
            onClick={() => navigate({ to: "/" })}
            sx={{ display: "inline-flex", alignItems: "center", gap: 1, mb: 3, bgcolor: "transparent", border: "none", cursor: "pointer" }}
          >
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, background: "linear-gradient(135deg, #C9973A, #FFD580)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>D</Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9" }}>D'mentalist</Typography>
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9" }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </Typography>
          <Typography sx={{ fontSize: 14, color: "#94A3B8", mt: 0.5 }}>
            {mode === "login" ? "Sign in to continue" : "Start your free account"}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            autoFocus
            fullWidth
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "rgba(26, 32, 53, 0.45)",
                borderRadius: 2,
                "& fieldset": { borderColor: "rgba(255,255,255,0.10)" },
                "&:hover fieldset": { borderColor: "rgba(201,151,58,0.5)" },
                "&.Mui-focused fieldset": { borderColor: "rgba(201,151,58,0.5)", borderWidth: 1 },
              },
              "& input": { color: "#F1F5F9", fontSize: 14 },
              "& input::placeholder": { color: "#64748B", opacity: 1 },
            }}
          />
          <TextField
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            slotProps={{ htmlInput: { minLength: 6 } }}
            fullWidth
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "rgba(26, 32, 53, 0.45)",
                borderRadius: 2,
                "& fieldset": { borderColor: "rgba(255,255,255,0.10)" },
                "&:hover fieldset": { borderColor: "rgba(201,151,58,0.5)" },
                "&.Mui-focused fieldset": { borderColor: "rgba(201,151,58,0.5)", borderWidth: 1 },
              },
              "& input": { color: "#F1F5F9", fontSize: 14 },
              "& input::placeholder": { color: "#64748B", opacity: 1 },
            }}
          />
          {error && (
            <Typography sx={{ fontSize: 12, color: "#F87171", textAlign: "center", textTransform: "capitalize" }}>
              {error}
            </Typography>
          )}
          <Button type="submit" variant="contained" fullWidth sx={{ py: 1.25 }}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </Box>

        <Divider sx={{ my: 3, "&::before, &::after": { borderColor: "rgba(255,255,255,0.10)" } }}>
          <Typography sx={{ fontSize: 12, color: "#94A3B8", px: 1 }}>or continue with</Typography>
        </Divider>

        <Button
          variant="outlined"
          fullWidth
          onClick={handleGoogle}
          startIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          }
          sx={{
            py: 1.25,
            borderColor: "rgba(255,255,255,0.10)",
            color: "#F1F5F9",
            "&:hover": { borderColor: "rgba(255,255,255,0.20)", bgcolor: "rgba(255,255,255,0.04)" },
          }}
        >
          Google
        </Button>

        <Typography sx={{ fontSize: 14, color: "#94A3B8", textAlign: "center", mt: 3 }}>
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <Box component="button" onClick={() => { setMode("signup"); setError(""); }} sx={{ color: "#FFD580", bgcolor: "transparent", border: "none", cursor: "pointer", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
                Sign up
              </Box>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Box component="button" onClick={() => { setMode("login"); setError(""); }} sx={{ color: "#FFD580", bgcolor: "transparent", border: "none", cursor: "pointer", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
                Sign in
              </Box>
            </>
          )}
        </Typography>
      </Box>
    </Box>
  );
}
