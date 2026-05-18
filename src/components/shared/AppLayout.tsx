import { ReactNode } from "react";
import { AppSidebar, useSidebarWidth } from "./AppSidebar";

/** Layout global: renderiza a AppSidebar fixa à esquerda e empurra o conteúdo. */
export function AppLayout({ children }: { children: ReactNode }) {
  const width = useSidebarWidth();
  return (
    <>
      <AppSidebar />
      <div
        className="min-h-[100dvh] transition-[padding] duration-300"
        style={{ paddingLeft: `var(--sgt-sb, 0px)` }}
      >
        {/* Aplica padding-left dinâmico via CSS var calculada em runtime */}
        <style>{`@media (min-width: 640px){:root{--sgt-sb:${width}px}}`}</style>
        {children}
      </div>
    </>
  );
}
