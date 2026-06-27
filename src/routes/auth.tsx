import { createFileRoute } from "@tanstack/react-router";
import AuthPage from "../pages/AuthPage";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "D'mentalist — Sign In" },
      { name: "description", content: "Sign in to D'mentalist" },
    ],
  }),
  component: AuthPage,
});
