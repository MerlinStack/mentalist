import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

import appCss from "../index.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#080D1C",
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 480, textAlign: "center" }}>
        <Typography sx={{ fontSize: 72, fontWeight: 700, color: "#F1F5F9" }}>404</Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#F1F5F9", mt: 2 }}>
          Page not found
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#94A3B8", mt: 1 }}>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <Button variant="contained">Go home</Button>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#080D1C",
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 600, textAlign: "center" }}>
        <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#F1F5F9" }}>
          This page didn't load
        </Typography>
        <Typography sx={{ fontSize: 14, color: "#94A3B8", mt: 1 }}>
          Something went wrong on our end. You can try refreshing or head back home.
        </Typography>
        <Typography sx={{ fontSize: 12, color: "#ef4444", mt: 2, fontFamily: "monospace" }}>
          {error?.message || error?.toString() || "Unknown error"}
        </Typography>
        <Box sx={{ mt: 4, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button
            variant="outlined"
            href="/"
            sx={{
              borderColor: "rgba(255,255,255,0.10)",
              color: "#F1F5F9",
              "&:hover": { borderColor: "rgba(255,255,255,0.20)" },
            }}
          >
            Go home
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "D'mentalist" },
      { name: "description", content: "AI-powered Scripture detection for live church services" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <Outlet />
      <Scripts />
    </QueryClientProvider>
  );
}
