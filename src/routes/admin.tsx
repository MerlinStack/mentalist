import { createFileRoute } from "@tanstack/react-router";
import AdminPage from "../pages/AdminPage";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "D'mentalist — Admin" }, { name: "description", content: "Admin panel" }],
  }),
  component: AdminPage,
});
