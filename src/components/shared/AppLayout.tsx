import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

/** Layout global: sidebar overlay + container mobile-safe. */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden">
        {children}
      </div>
    </>
  );
}
