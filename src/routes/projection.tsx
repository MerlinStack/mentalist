import { createFileRoute } from "@tanstack/react-router";
import ProjectionPage from "../pages/ProjectionPage";

export const Route = createFileRoute("/projection")({
  head: () => ({
    meta: [
      { title: "D'mentalist — Projection" },
      { name: "description", content: "Live scripture projection" },
    ],
  }),
  component: ProjectionPage,
});
