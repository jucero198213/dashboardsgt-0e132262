-- 1. Adiciona coluna aberto_por
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS aberto_por uuid;

-- 2. Backfill: usa created_by quando existir
UPDATE public.tickets
SET aberto_por = created_by
WHERE aberto_por IS NULL AND created_by IS NOT NULL;

-- 3. Recria políticas RLS
DROP POLICY IF EXISTS "Admins can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

-- SELECT: admin vê tudo, usuário vê apenas os próprios
CREATE POLICY "Tickets visiveis ao admin ou ao autor"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR aberto_por = auth.uid()
);

-- INSERT: qualquer autenticado pode abrir desde que seja o autor
CREATE POLICY "Usuarios autenticados podem abrir chamados"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  aberto_por = auth.uid()
);

-- UPDATE: apenas admin
CREATE POLICY "Apenas admin pode atualizar chamados"
ON public.tickets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE: apenas admin
CREATE POLICY "Apenas admin pode excluir chamados"
ON public.tickets
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index
CREATE INDEX IF NOT EXISTS idx_tickets_aberto_por ON public.tickets(aberto_por);