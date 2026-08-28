ALTER TYPE public.app_page ADD VALUE IF NOT EXISTS 'ext-pneus';
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS galeria text[] NOT NULL DEFAULT '{}'::text[];