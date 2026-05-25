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
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "vendor-react";
          }
          // Charts
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }
          // Animações (só carregado em Home)
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          // Mapa (só carregado em Operacional)
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
            return "vendor-map";
          }
          // Supabase + React Query
          if (id.includes("node_modules/@supabase") || id.includes("node_modules/@tanstack")) {
            return "vendor-data";
          }
          // Ícones
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          // Radix UI (UI primitives)
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
        },
      },
    },
  },
}));
