import { createFileRoute } from "@tanstack/react-router";
import { ProjectionDisplay } from "../components/projection/ProjectionDisplay";

export const Route = createFileRoute("/projection")({
  head: () => ({
    meta: [
      { title: "D'mentalist — Projection Output" },
      { name: "description", content: "Second-screen projection display" },
    ],
  }),
  component: ProjectionDisplay,
});
