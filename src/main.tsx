import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme before React mounts to avoid flash
const savedTheme = localStorage.getItem("sgt-theme") ?? "dark";
document.documentElement.classList.add(savedTheme);

// ── Destruição total do Service Worker antigo ────────────────────────────────
// Estratégia: registra o kill-switch ativamente (sobrescreve o Workbox antigo)
// e depois desregistra tudo. Sem isso, o SW antigo intercepta e nunca sai.
if ("serviceWorker" in navigator) {
  // 1. Registra o kill-switch no mesmo path do SW antigo (/sw.js, scope /)
  //    O kill-switch se auto-destrói após ativar e limpar todos os caches
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});

  // 2. Também tenta desregistrar todos os SWs já registrados
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });

  // 3. Se ainda há SW controlando, manda mensagem para ele se matar
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
  }
}

// 4. Limpa todos os caches do browser
if ("caches" in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}

createRoot(document.getElementById("root")!).render(<App />);
