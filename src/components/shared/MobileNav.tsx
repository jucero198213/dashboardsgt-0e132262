import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MenuDrawerContent } from "./MenuDrawerContent";

/**
 * MobileNav — Drawer lateral (sm:hidden) acionado pelo header das páginas.
 * Conteúdo do drawer em MenuDrawerContent (compartilhado com a BottomNav),
 * driven por APP_NAV + Acesso Rápido. Permanece em sync com a sidebar.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.04] transition-all active:scale-90 hover:border-white/[0.18] hover:bg-white/[0.08] sm:hidden shrink-0"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Menu className="h-[18px] w-[18px] text-slate-400" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[88vw] max-w-[330px] border-r p-0 [background:var(--sgt-menu-bg)]"
        style={{ borderColor: "var(--sgt-border-medium)", color: "var(--sgt-text-primary)" }}
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <MenuDrawerContent onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
