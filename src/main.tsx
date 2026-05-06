import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSWUpdateHandler } from "./utils/serviceWorkerUpdate";

// Apply saved theme before React mounts to avoid flash
const savedTheme = localStorage.getItem("sgt-theme") ?? "dark";
document.documentElement.classList.add(savedTheme);

// Guard: nunca registrar SW em iframe ou preview do Lovable
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  // Em preview/iframe: desregistra qualquer SW e limpa caches para evitar conteúdo velho
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
} else {
  // Produção: ativa o handler que detecta nova versão do SW e força reload
  registerSWUpdateHandler();
}

createRoot(document.getElementById("root")!).render(<App />);
