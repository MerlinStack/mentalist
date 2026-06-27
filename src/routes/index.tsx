import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "../pages/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "D'mentalist — AI-powered Scripture for your church" },
      {
        name: "description",
        content:
          "AI-powered Scripture detection for live church services. Type a quote, speak a theme, or let the mic do the work.",
      },
    ],
  }),
  component: LandingPage,
});
