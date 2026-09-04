
CREATE OR REPLACE FUNCTION public.admin_list_tables(_caller uuid)
RETURNS TABLE(table_name text, column_count integer, row_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; cnt bigint;
BEGIN
  IF NOT public.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  FOR r IN
    SELECT t.table_name::text AS tname,
      (SELECT count(*)::int FROM information_schema.columns c
        WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS ccount
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', r.tname) INTO cnt;
    table_name := r.tname; column_count := r.ccount; row_count := cnt;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_describe_table(_caller uuid, _table text)
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text, max_length integer, is_primary_key boolean, is_foreign_key boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _table !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'invalid table name';
  END IF;
  RETURN QUERY
  SELECT c.column_name::text, c.data_type::text, c.is_nullable::text, c.column_default::text,
         c.character_maximum_length::int,
         EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage k
             ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema
           WHERE tc.table_schema='public' AND tc.table_name=_table
             AND tc.constraint_type='PRIMARY KEY' AND k.column_name = c.column_name
         ),
         EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage k
             ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema
           WHERE tc.table_schema='public' AND tc.table_name=_table
             AND tc.constraint_type='FOREIGN KEY' AND k.column_name = c.column_name
         )
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name=_table
  ORDER BY c.ordinal_position;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_read_table(_caller uuid, _table text, _page integer DEFAULT 1, _per_page integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page int := greatest(coalesce(_page,1),1);
  v_per int := least(greatest(coalesce(_per_page,50),1),100);
  v_order text;
  v_total bigint;
  v_rows jsonb;
BEGIN
  IF NOT public.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _table !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'invalid table name';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name=_table) THEN
    RAISE EXCEPTION 'table not found';
  END IF;

  SELECT c.column_name INTO v_order FROM information_schema.columns c
   WHERE c.table_schema='public' AND c.table_name=_table AND c.column_name='created_at';
  IF v_order IS NULL THEN
    SELECT c.column_name INTO v_order FROM information_schema.columns c
     WHERE c.table_schema='public' AND c.table_name=_table ORDER BY c.ordinal_position LIMIT 1;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I', _table) INTO v_total;
  EXECUTE format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY %I DESC LIMIT %s OFFSET %s) t',
                 _table, v_order, v_per, (v_page - 1) * v_per) INTO v_rows;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total, 'page', v_page, 'per_page', v_per);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_tables(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_describe_table(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_read_table(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_tables(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_describe_table(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_read_table(uuid, text, integer, integer) TO service_role;
