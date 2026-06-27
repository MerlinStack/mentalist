import { createFileRoute } from "@tanstack/react-router";
import NotFoundPage from "../pages/NotFoundPage";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [{ title: "404 — Page Not Found" }],
  }),
  component: NotFoundPage,
});
