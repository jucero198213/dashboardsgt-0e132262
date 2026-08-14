import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import type { Notificacao } from "@/lib/notificacoesApi";

const TIPO_ICON: Record<string, typeof Bell> = {
  novo_chamado: AlertCircle,
  resposta_chamado: MessageSquare,
  status_chamado: RefreshCw,
};

const TIPO_COLOR: Record<string, string> = {
  novo_chamado: "text-blue-400",
  resposta_chamado: "text-emerald-400",
  status_chamado: "text-amber-400",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const { notificacoes, naoLidas, ler, lerTodas } = useNotificacoes();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = async (n: Notificacao) => {
    if (!n.lida) await ler(n.id);
    if (n.referencia_id) {
      navigate("/chamados");
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notificações"
        className={`relative flex items-center transition-all duration-150 rounded-lg ${
          collapsed ? "justify-center p-2.5 mx-auto" : "gap-2.5 w-full px-4 py-2.5"
        }`}
        style={{ color: "var(--sb-text-secondary)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--sb-row-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
      >
        <Bell className="h-4 w-4 shrink-0" />
        {naoLidas > 0 && (
          <span className="absolute flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                style={collapsed ? { top: 4, right: 8 } : { top: 6, left: 26 }}>
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
        {!collapsed && <span className="text-[12px] font-medium">Notificações</span>}
      </button>

      {open && (
        <div
          className={`absolute z-50 w-[320px] overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(0,0,0,0.5)] ${
            collapsed ? "left-[calc(100%+8px)] bottom-0" : "left-2 right-2 bottom-[calc(100%+6px)]"
          }`}
          style={{ background: "var(--sb-menu-bg)", borderColor: "var(--sb-border-medium)" }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "var(--sb-border-subtle)" }}>
            <span className="text-[12px] font-semibold" style={{ color: "var(--sb-text-primary)" }}>
              Notificações
            </span>
            {naoLidas > 0 && (
              <button
                onClick={() => lerTodas()}
                className="flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: "var(--sb-accent)" }}
              >
                <CheckCheck className="h-3 w-3" /> Marcar tudo
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: "var(--sb-text-faint)" }} />
                <p className="text-[12px]" style={{ color: "var(--sb-text-faint)" }}>Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.slice(0, 20).map((n) => {
                const Icon = TIPO_ICON[n.tipo] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: n.lida ? "transparent" : "color-mix(in srgb, var(--sb-accent) 5%, transparent)",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--sb-input-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = n.lida ? "transparent" : "color-mix(in srgb, var(--sb-accent) 5%, transparent)")}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${TIPO_COLOR[n.tipo] ?? "text-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-medium truncate" style={{ color: "var(--sb-text-primary)" }}>
                          {n.titulo}
                        </p>
                        {!n.lida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />}
                      </div>
                      {n.mensagem && (
                        <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--sb-text-faint)" }}>
                          {n.mensagem}
                        </p>
                      )}
                      <p className="text-[10px] mt-1" style={{ color: "var(--sb-text-faint)" }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.lida && (
                      <button
                        onClick={(e) => { e.stopPropagation(); ler(n.id); }}
                        title="Marcar como lida"
                        className="mt-0.5 p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <Check className="h-3 w-3" style={{ color: "var(--sb-text-faint)" }} />
                      </button>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
