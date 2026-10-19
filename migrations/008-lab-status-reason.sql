-- Proposed only: production execution requires separate approval.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '5s';
DO $guard$
DECLARE target oid; a record;
BEGIN
  SELECT c.oid INTO target FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='certification_lab_requests' AND c.relkind='r';
  IF target IS NULL THEN RAISE EXCEPTION 'Expected ordinary public lab table is missing'; END IF;
  LOCK TABLE public.certification_lab_requests IN ACCESS EXCLUSIVE MODE;
  SELECT atttypid,atttypmod,attnotnull,atthasdef,attgenerated,attidentity INTO a
  FROM pg_catalog.pg_attribute WHERE attrelid=target AND attname='status_reason'
    AND attnum>0 AND NOT attisdropped;
  IF FOUND THEN
    IF a.atttypid <> 'pg_catalog.text'::regtype OR a.atttypmod <> -1
       OR a.attnotnull OR a.atthasdef OR a.attgenerated <> '' OR a.attidentity <> '' THEN
      RAISE EXCEPTION 'Existing lab status_reason definition is incompatible; stop for review';
    END IF;
  ELSE
    ALTER TABLE public.certification_lab_requests ADD COLUMN status_reason TEXT;
  END IF;
END;
$guard$;
COMMIT;
