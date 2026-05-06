import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme before React mounts to avoid flash
const savedTheme = localStorage.getItem("sgt-theme") ?? "dark";
document.documentElement.classList.add(savedTheme);

// Desregistra qualquer Service Worker antigo e limpa todos os caches.
// Em produção, public/sw.js (kill-switch) também faz a limpeza nos clientes
// que ainda têm o SW antigo registrado.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
}
if ("caches" in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}

createRoot(document.getElementById("root")!).render(<App />);
