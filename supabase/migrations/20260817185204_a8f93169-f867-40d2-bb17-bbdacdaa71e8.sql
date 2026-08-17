CREATE TABLE public.login_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  email text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_history_user_created ON public.login_history (user_id, created_at DESC);
CREATE INDEX idx_login_history_created ON public.login_history (created_at DESC);

GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT INSERT ON public.login_history TO anon;
GRANT ALL ON public.login_history TO service_role;

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem historico de acessos" ON public.login_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Autenticados registram acessos" ON public.login_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Visitantes registram falhas de login" ON public.login_history
  FOR INSERT TO anon WITH CHECK (user_id IS NULL AND event = 'login_failed');