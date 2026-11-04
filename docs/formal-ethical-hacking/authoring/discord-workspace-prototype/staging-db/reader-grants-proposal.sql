-- PROPOSAL ONLY. Requires a separately provisioned, clean, private login role.
-- No role/password creation, PUBLIC revocation, or fi_stage mutation is included.
BEGIN;
DO $guard$
DECLARE r record;
BEGIN
  IF current_database() <> 'neptuneguard_fictional_staging_db' THEN RAISE EXCEPTION 'Wrong database'; END IF;
  SELECT * INTO r FROM pg_catalog.pg_roles WHERE rolname='formal_review_staging_reader';
  IF NOT FOUND THEN RAISE EXCEPTION 'Separately approved reader role does not exist'; END IF;
  IF NOT r.rolcanlogin OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR r.rolinherit
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=r.oid)
     OR has_schema_privilege(r.oid, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Reader role has an unreviewed authority profile';
  END IF;
END;
$guard$;
GRANT CONNECT ON DATABASE neptuneguard_fictional_staging_db TO formal_review_staging_reader;
GRANT USAGE ON SCHEMA public TO formal_review_staging_reader;
GRANT SELECT ON public.certification_enrollments, public.certification_course_enrollments TO formal_review_staging_reader;
GRANT SELECT (version, content, content_sha256) ON public.certification_agreements TO formal_review_staging_reader;
DO $verify$
DECLARE item record;
BEGIN
  FOR item IN SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND ((n.nspname='public' AND c.relname ~ '^certification_') OR n.nspname='fi_stage')
  LOOP
    IF has_table_privilege('formal_review_staging_reader',item.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
      RAISE EXCEPTION 'Reader retains unreviewed table authority';
    END IF;
  END LOOP;
END;
$verify$;
COMMIT;
