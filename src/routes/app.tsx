import { createFileRoute } from "@tanstack/react-router";
import { OperatorPage } from "../pages/OperatorPage";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "D'mentalist — Console" },
      { name: "description", content: "Live scripture, music and media console." },
    ],
  }),
  component: OperatorPage,
});
