-- Fix user_roles so each user has exactly ONE role row.
-- The original schema had UNIQUE(user_id, role), which allowed a user to
-- accumulate multiple role rows (one per role). This caused maybeSingle()
-- in fetchRole to error when a user had both a 'user' and an 'admin' row,
-- and made the upsert-based changeRole always INSERT instead of updating.

-- 1. Remove duplicate rows — keep the most recently inserted one per user.
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- 2. Replace UNIQUE(user_id, role) with UNIQUE(user_id).
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
