-- Memória de conversa da Sofia no WhatsApp (persistente).
-- Guarda o histórico por número, sobrevivendo a redeploy / cold start.
create table if not exists public.sofia_conversas (
  id        bigint generated always as identity primary key,
  telefone  text        not null,
  role      text        not null check (role in ('user', 'assistant')),
  conteudo  text        not null,
  criado_em timestamptz not null default now()
);

-- Busca rápida do histórico recente por número.
create index if not exists idx_sofia_conversas_tel_data
  on public.sofia_conversas (telefone, criado_em desc);

-- Apenas a service role (a Edge Function whatsapp-webhook) acessa esta tabela.
-- RLS ligado sem policies públicas → nenhum acesso via anon/authenticated.
alter table public.sofia_conversas enable row level security;
