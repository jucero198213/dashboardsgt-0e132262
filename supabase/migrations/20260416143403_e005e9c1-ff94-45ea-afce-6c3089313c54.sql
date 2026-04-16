
CREATE TABLE public.first_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.first_access_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can view codes
CREATE POLICY "Admins can view first_access_codes"
ON public.first_access_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert codes
CREATE POLICY "Admins can insert first_access_codes"
ON public.first_access_codes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update codes
CREATE POLICY "Admins can update first_access_codes"
ON public.first_access_codes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
