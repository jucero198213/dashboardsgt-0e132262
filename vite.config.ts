import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Plugin que garante que o sw.js final é o kill-switch, não o Workbox
function swKillSwitchPlugin() {
  return {
    name: "sw-kill-switch",
    closeBundle() {
      const killSwitch = `// Kill-switch: desregistra SWs e limpa caches
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil((async () => {
    await self.clients.claim();
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
    await self.registration.unregister();
  })())
);
self.addEventListener("fetch", () => {});
`;
      // Sobrescreve sw.js com o kill-switch
      const swPath = path.resolve(__dirname, "dist/sw.js");
      if (fs.existsSync(swPath)) {
        fs.writeFileSync(swPath, killSwitch);
      }
      // Neutraliza o workbox
      const workboxFiles = fs.readdirSync(path.resolve(__dirname, "dist")).filter(f => f.startsWith("workbox-"));
      workboxFiles.forEach(f => {
        fs.writeFileSync(path.resolve(__dirname, "dist", f), "// disabled");
      });
      // Neutraliza o registerSW.js para não registrar nada
      const regPath = path.resolve(__dirname, "dist/registerSW.js");
      if (fs.existsSync(regPath)) {
        fs.writeFileSync(regPath, "// SW registration disabled");
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    swKillSwitchPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
