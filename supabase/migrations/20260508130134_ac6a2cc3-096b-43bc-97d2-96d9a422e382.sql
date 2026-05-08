
-- Tickets / Chamados table (admin only)
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cliente_setor TEXT,
  responsavel TEXT,
  data_chamado DATE NOT NULL,
  horario_chamado TIME,
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_andamento','concluido','cancelado')),
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_data ON public.tickets(data_chamado);
CREATE INDEX idx_tickets_status ON public.tickets(status);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Only admins can see/manage tickets
CREATE POLICY "Admins can view tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tickets"
  ON public.tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger (reuse existing function if present, else create)
CREATE OR REPLACE FUNCTION public.tickets_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_set_updated_at();
