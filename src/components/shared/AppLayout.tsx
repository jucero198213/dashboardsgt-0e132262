import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

/** Layout global: sidebar agora é overlay, não empurra o conteúdo. */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <div className="min-h-[100dvh]">
        {children}
      </div>
    </>
  );
}
