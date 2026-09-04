import { ReactNode } from "react";
import { AppSidebar, useSidebarWidth } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { AiAssistant } from "./AiAssistant";

/**
 * Layout global:
 * - Desktop: sidebar persistente à esquerda (expand/collapse) + paddingLeft dinâmico
 * - Mobile:  sem sidebar; BottomNav fixo no rodapé + pb-16 no conteúdo
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const width = useSidebarWidth();
  return (
    <>
      <AppSidebar />
      <BottomNav />
      <AiAssistant />
      <div
        className="min-h-[100dvh] max-w-full overflow-x-hidden pb-16 sm:pb-0 transition-[padding] duration-300"
        style={{ paddingLeft: `var(--sgt-sb, 0px)` }}
      >
        {/* CSS var calculada em runtime para o paddingLeft no desktop */}
        <style>{`@media (min-width: 640px){:root{--sgt-sb:${width}px}}`}</style>
        {children}
      </div>
    </>
  );
}
