import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchNotificacoes,
  countNaoLidas,
  marcarComoLida,
  marcarTodasComoLidas,
  type Notificacao,
} from "@/lib/notificacoesApi";

export function useNotificacoes() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([fetchNotificacoes(), countNaoLidas()]);
      setNotificacoes(list);
      setNaoLidas(count);
    } catch {
      // silencia erro se tabela não existe ou RLS bloqueia
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!user) return;
    const channelName = `notifications-${user.id}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => { refreshRef.current(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);


  const ler = useCallback(
    async (id: string) => {
      await marcarComoLida(id);
      setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
      setNaoLidas((prev) => Math.max(0, prev - 1));
    },
    [],
  );

  const lerTodas = useCallback(async () => {
    await marcarTodasComoLidas();
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);
  }, []);

  return { notificacoes, naoLidas, loading, refresh, ler, lerTodas };
}
