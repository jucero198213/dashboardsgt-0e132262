import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

/** Layout global: sidebar overlay + bottom nav mobile + container mobile-safe. */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <BottomNav />
      {/* pb-16 garante que o conteúdo não fique escondido atrás do BottomNav no mobile */}
      <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden pb-16 sm:pb-0">
        {children}
      </div>
    </>
  );
}
