-- Add 'diretoria' value to the app_role enum.
-- Must run in its own migration so the new value is committed before
-- any DML referencing it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretoria';
