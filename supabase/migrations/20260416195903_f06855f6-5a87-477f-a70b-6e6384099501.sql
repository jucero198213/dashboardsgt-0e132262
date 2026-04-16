-- Enum para páginas controladas
CREATE TYPE public.app_page AS ENUM ('dashboard', 'indicadores');

-- Tabela de permissões por página (allowlist)
CREATE TABLE public.page_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page public.app_page NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, page)
);

ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se usuário tem acesso a uma página
-- Admin tem acesso a tudo automaticamente
CREATE OR REPLACE FUNCTION public.has_page_access(_user_id UUID, _page public.app_page)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.page_permissions
      WHERE user_id = _user_id AND page = _page
    );
$$;

-- RLS policies
CREATE POLICY "Users can view their own page permissions"
ON public.page_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all page permissions"
ON public.page_permissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert page permissions"
ON public.page_permissions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete page permissions"
ON public.page_permissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));