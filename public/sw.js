// Kill-switch service worker v3
// Objetivo: destruir qualquer SW de cache antigo e se auto-destruir

const VERSION = "kill-v3";

// Instala e assume o controle imediatamente
self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

// Ao ativar: limpa tudo e se desregistra
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Assume controle de todos os clients
      await self.clients.claim();
      // Deleta todos os caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      // Se desregistra
      await self.registration.unregister();
    })()
  );
});

// NUNCA intercepta requests — passa tudo para a rede
self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request));
});

// Responde ao SKIP_WAITING do cliente
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
