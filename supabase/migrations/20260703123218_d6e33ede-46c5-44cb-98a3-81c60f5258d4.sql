CREATE TABLE IF NOT EXISTS public.sofia_conversas (
  id bigint generated always as identity primary key,
  telefone text not null,
  role text not null check (role in ('user','assistant')),
  conteudo text not null,
  criado_em timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_sofia_conversas_tel_data
  ON public.sofia_conversas (telefone, criado_em desc);

GRANT ALL ON public.sofia_conversas TO service_role;

ALTER TABLE public.sofia_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to sofia_conversas"
  ON public.sofia_conversas FOR ALL
  USING (false) WITH CHECK (false);