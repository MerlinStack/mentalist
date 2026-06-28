import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: [],
  },
  worker: {
    format: "es",
  },
  server: {
    proxy: {
      "/api/bible": {
        target: "https://bible-api.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bible/, ""),
      },
    },
  },
});
