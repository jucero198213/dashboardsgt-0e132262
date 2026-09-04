const portalWindows = new Map<string, Window | null>();

/** Abre (ou reutiliza) janela externa para portais que não permitem iframe. */
export function openPortalWindow(url: string, portalId: string): Window | null {
  const width = Math.min(1400, (window.screen?.availWidth ?? 1280) - 80);
  const height = Math.min(900, (window.screen?.availHeight ?? 800) - 80);
  const left = Math.max(0, ((window.screen?.availWidth ?? width) - width) / 2);
  const top = Math.max(0, ((window.screen?.availHeight ?? height) - height) / 2);

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");

  const win = window.open(url, `sgt-portal-${portalId}`, features);
  if (win) portalWindows.set(portalId, win);
  return win;
}

export function focusPortalWindow(portalId: string): boolean {
  const win = portalWindows.get(portalId);
  if (win && !win.closed) {
    win.focus();
    return true;
  }
  portalWindows.delete(portalId);
  return false;
}

export function isPortalWindowOpen(portalId: string): boolean {
  const win = portalWindows.get(portalId);
  if (!win) return false;
  if (win.closed) {
    portalWindows.delete(portalId);
    return false;
  }
  return true;
}
