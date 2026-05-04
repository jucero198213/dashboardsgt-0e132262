// Service Worker update handler - força reload quando detecta nova versão

export function registerSWUpdateHandler() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Checa atualizações a cada 60 segundos
      setInterval(() => {
        registration.update().catch(() => {
          // Ignora erros silenciosamente
        });
      }, 60000);

      // Listener para nova versão detectada
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nova versão disponível! Força reload
            console.log('🔄 Nova versão detectada! Recarregando...');
            
            // Aguarda 500ms e recarrega
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        });
      });
    });
  }
}
