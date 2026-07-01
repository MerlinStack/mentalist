import { createFileRoute } from "@tanstack/react-router";
import { OperatorPage } from "../pages/OperatorPage";

export const Route = createFileRoute("/operator")({
  head: () => ({
    meta: [
      { title: "D'mentalist — Operator Console" },
      { name: "description", content: "Real-time production control interface." },
    ],
  }),
  component: OperatorPage,
});
