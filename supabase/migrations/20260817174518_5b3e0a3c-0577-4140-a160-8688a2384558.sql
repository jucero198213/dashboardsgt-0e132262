CREATE TABLE public.ticket_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_categorias TO authenticated;
GRANT ALL ON public.ticket_categorias TO service_role;
ALTER TABLE public.ticket_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorias visiveis a autenticados" ON public.ticket_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam categorias" ON public.ticket_categorias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins editam categorias" ON public.ticket_categorias FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins excluem categorias" ON public.ticket_categorias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.tickets ADD COLUMN categoria_id uuid REFERENCES public.ticket_categorias(id) ON DELETE SET NULL;

CREATE TABLE public.ticket_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  mensagem_id uuid REFERENCES public.ticket_mensagens(id) ON DELETE CASCADE,
  arquivo_url text NOT NULL,
  nome_arquivo text,
  tipo text,
  tamanho bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_anexos_ticket ON public.ticket_anexos(ticket_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_anexos TO authenticated;
GRANT ALL ON public.ticket_anexos TO service_role;
ALTER TABLE public.ticket_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anexos visiveis a autenticados" ON public.ticket_anexos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam anexos" ON public.ticket_anexos FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Autor ou admin exclui anexos" ON public.ticket_anexos FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.ticket_categorias (nome, cor) VALUES
  ('Hardware', '#38bdf8'),
  ('Software', '#a78bfa'),
  ('Rede', '#34d399'),
  ('Acesso', '#f59e0b'),
  ('Impressora', '#f472b6'),
  ('Outros', '#94a3b8');