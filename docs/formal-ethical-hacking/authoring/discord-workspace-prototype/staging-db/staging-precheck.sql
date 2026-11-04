DO $guard$
BEGIN
  IF current_database() <> 'neptuneguard_fictional_staging_db' THEN
    RAISE EXCEPTION 'Wrong database: staging-only package';
  END IF;
  IF NOT has_schema_privilege(current_user, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Reviewed staging schema owner required';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname ~ '^certification_')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname ~ '^certification_') THEN
    RAISE EXCEPTION 'Certification objects already exist: stop and reconcile instead of overwriting';
  END IF;
END;
$guard$;
