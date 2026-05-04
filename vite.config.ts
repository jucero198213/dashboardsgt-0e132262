import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: ["icon-192x192.png", "icon-512x512.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        skipWaiting: true,
        clientsClaim: true,
        // Cache busting - força reload em mudanças
        cleanupOutdatedCaches: true,
        // Estratégia: Network First (sempre tenta buscar novo, fallback cache)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.lovable\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lovable-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutos - cache curto!
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      manifest: {
        name: "Workspace SGT",
        short_name: "Workspace SGT",
        description: "Detalhamento Financeiro - SGTLOG",
        theme_color: "#060912",
        background_color: "#060912",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
