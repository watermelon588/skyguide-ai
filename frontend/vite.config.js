import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // Two entries: the SPA, and the phone companion (align.html) — a
      // deliberately tiny bundle so the phone at the telescope never
      // downloads the dashboard app.
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        align: fileURLToPath(new URL("./align.html", import.meta.url)),
      },
    },
  },
  server: {
    // Bind on all interfaces (0.0.0.0) so phones on the same Wi-Fi (LAN mode)
    // and Cloudflare tunnels can reach the dev server.
    host: true,
    port: 5173,
    // Allow requests proxied through a Cloudflare tunnel (dynamic *.trycloudflare.com
    // hostnames). Disables Vite's host check — acceptable for dev/demo only.
    allowedHosts: true,
  },
});
