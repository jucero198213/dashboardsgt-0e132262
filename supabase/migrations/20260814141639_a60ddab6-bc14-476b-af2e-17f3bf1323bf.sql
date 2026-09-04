CREATE TYPE public.departamento AS ENUM ('ti','financeiro','operacao','rh','diretoria','compras','comercial');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  departamento public.departamento,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis visiveis a autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuario edita proprio perfil ou admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Apenas admin cria perfis" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tickets_set_updated_at();

-- TICKET MENSAGENS
CREATE TABLE public.ticket_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id),
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'resposta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_mensagens_tipo_check CHECK (tipo IN ('resposta','nota_interna','sistema'))
);
CREATE INDEX idx_ticket_mensagens_ticket ON public.ticket_mensagens(ticket_id);
GRANT SELECT, INSERT ON public.ticket_mensagens TO authenticated;
GRANT ALL ON public.ticket_mensagens TO service_role;
ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de mensagens de chamados" ON public.ticket_mensagens
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      tipo IN ('resposta','sistema')
      AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_mensagens.ticket_id
          AND (t.created_by = auth.uid() OR t.aberto_por = auth.uid())
      )
    )
  );

CREATE POLICY "Insercao de mensagens de chamados" ON public.ticket_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        tipo IN ('resposta','sistema')
        AND EXISTS (
          SELECT 1 FROM public.tickets t
          WHERE t.id = ticket_mensagens.ticket_id
            AND (t.created_by = auth.uid() OR t.aberto_por = auth.uid())
        )
      )
    )
  );

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  referencia_id UUID,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_tipo_check CHECK (tipo IN ('novo_chamado','resposta_chamado','status_chamado'))
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, lida);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver proprias notificacoes" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Atualizar proprias notificacoes" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Excluir proprias notificacoes" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- TICKETS
ALTER TABLE public.tickets ADD COLUMN departamento public.departamento;
ALTER TABLE public.tickets ADD COLUMN responsavel_id UUID REFERENCES auth.users(id);