import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: [
      "react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime",
      "@tanstack/react-query", "@tanstack/query-core",
    ],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // Pacotes Tauri são runtime-only no app desktop — não bundlar no build web
      external: [
        /^@tauri-apps\/.*/,
      ],
      output: {
        manualChunks: {
          // React core — raramente muda, fica em cache por muito tempo
          "vendor-react":   ["react", "react-dom", "react-router-dom"],
          // Charts — pesados e raramente mudam
          "vendor-charts":  ["recharts"],
          // Animações
          "vendor-motion":  ["framer-motion"],
          // Mapa — só carregado em Operacional
          "vendor-map":     ["leaflet", "react-leaflet"],
          // UI primitives (Radix)
          "vendor-radix":   [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-accordion",
          ],
          // Supabase + React Query
          "vendor-data":    ["@supabase/supabase-js", "@tanstack/react-query"],
          // Ícones
          "vendor-icons":   ["lucide-react"],
        },
      },
    },
  },
}));
