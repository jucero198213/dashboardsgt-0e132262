-- Ajusta políticas da tabela tickets:
-- Usuários comuns podem criar e ver seus próprios chamados
-- Admins têm acesso total a todos os chamados

-- Remove políticas antigas (somente admin)
DROP POLICY IF EXISTS "Admins can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;

-- SELECT: admin vê todos; usuário vê os seus próprios
CREATE POLICY "Users can view own tickets, admins view all"
  ON public.tickets FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
  );

-- INSERT: qualquer usuário autenticado pode abrir chamado
CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: admin pode atualizar qualquer ticket; usuário só os seus (e apenas campos básicos — sem status)
CREATE POLICY "Users can update own tickets, admins update all"
  ON public.tickets FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR created_by = auth.uid()
  );

-- DELETE: somente admins
CREATE POLICY "Admins can delete tickets"
  ON public.tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
