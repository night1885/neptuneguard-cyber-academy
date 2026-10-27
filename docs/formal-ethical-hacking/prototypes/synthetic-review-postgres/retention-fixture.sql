-- Add-on to fixture.sql, owned disposable CI only. Never an academy migration.
BEGIN;
DO $$ BEGIN
  IF current_database()<>'synthetic_review_test' OR current_user<>'synthetic_review_admin'
    OR current_setting('server_version_num')::int/10000 NOT IN (16,18)
    OR to_regclass('synthetic_review_ci.records') IS NULL THEN
    RAISE EXCEPTION 'Explicit base CI fixture required';
  END IF;
  IF EXISTS(SELECT 1 FROM synthetic_review_ci.records) OR EXISTS(SELECT 1 FROM synthetic_review_ci.assignments) THEN
    RAISE EXCEPTION 'Unpopulated base fixture required';
  END IF;
END $$;
CREATE TABLE synthetic_review_ci.report_clock (
  singleton boolean PRIMARY KEY CHECK(singleton), at_time timestamptz NOT NULL CHECK(isfinite(at_time))
);
INSERT INTO synthetic_review_ci.report_clock VALUES(true,'2000-01-01T00:00:00Z');
CREATE FUNCTION synthetic_review_ci.guard_clock() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,synthetic_review_ci AS $$ BEGIN
  IF NEW.at_time<OLD.at_time THEN RAISE EXCEPTION 'Clock regression'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER monotonic_fixture_clock BEFORE UPDATE ON synthetic_review_ci.report_clock
FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.guard_clock();
CREATE TABLE synthetic_review_ci.report_state (
  record_id uuid PRIMARY KEY REFERENCES synthetic_review_ci.records ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
  status text NOT NULL DEFAULT 'working' CHECK(status IN ('working','submitted','changes-requested','review-recorded')),
  current_report uuid
);
CREATE TABLE synthetic_review_ci.report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES synthetic_review_ci.records ON DELETE CASCADE,
  submission_revision integer NOT NULL CHECK(submission_revision>0),
  submitted_at timestamptz NOT NULL CHECK(isfinite(submitted_at)),
  expires_at timestamptz NOT NULL CHECK(isfinite(expires_at)),
  body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 4096 AND octet_length(body)<=8192),
  CHECK(expires_at-submitted_at=interval '24 hours'), UNIQUE(record_id,submission_revision)
);
ALTER TABLE synthetic_review_ci.report_state ADD FOREIGN KEY(current_report)
  REFERENCES synthetic_review_ci.report_snapshots ON DELETE SET NULL;
CREATE TABLE synthetic_review_ci.report_feedback (
  report_id uuid PRIMARY KEY REFERENCES synthetic_review_ci.report_snapshots ON DELETE CASCADE,
  revision integer NOT NULL, actor text NOT NULL,
  decision text NOT NULL CHECK(decision IN ('changes-requested','review-recorded')),
  body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 4096 AND octet_length(body)<=8192)
);
CREATE TABLE synthetic_review_ci.report_audit (
  report_id uuid REFERENCES synthetic_review_ci.report_snapshots ON DELETE CASCADE,
  revision integer, actor text NOT NULL, event text NOT NULL CHECK(event IN ('submit','review')),
  PRIMARY KEY(report_id,revision)
);
CREATE TABLE synthetic_review_ci.report_receipts (
  record_id uuid REFERENCES synthetic_review_ci.records ON DELETE CASCADE,
  actor text, request_id text, fingerprint bytea NOT NULL,
  report_id uuid NOT NULL REFERENCES synthetic_review_ci.report_snapshots ON DELETE CASCADE,
  reply jsonb NOT NULL, PRIMARY KEY(record_id,actor,request_id)
);
CREATE TABLE synthetic_review_ci.report_copy (
  report_id uuid PRIMARY KEY REFERENCES synthetic_review_ci.report_snapshots ON DELETE CASCADE,
  copy_ref text NOT NULL UNIQUE CHECK(copy_ref ~ '^demo-copy-[a-z0-9-]{1,40}$'),
  state text NOT NULL CHECK(state IN ('pending','failed','confirmed'))
);
CREATE FUNCTION synthetic_review_ci.immutable_report() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,synthetic_review_ci AS $$ BEGIN RAISE EXCEPTION 'Immutable report revision'; END $$;
CREATE TRIGGER immutable_snapshot BEFORE UPDATE ON synthetic_review_ci.report_snapshots
FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.immutable_report();
CREATE TRIGGER immutable_feedback BEFORE UPDATE ON synthetic_review_ci.report_feedback
FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.immutable_report();
CREATE FUNCTION synthetic_review_ci.fixture_now() RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$ DECLARE t timestamptz; BEGIN
  SELECT at_time INTO STRICT t FROM synthetic_review_ci.report_clock WHERE singleton FOR SHARE; RETURN t;
END $$;
CREATE FUNCTION synthetic_review_ci.read_report(a text,w text,c text,e text,i uuid,s uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci SET timezone='UTC' AS $$
DECLARE r synthetic_review_ci.records; p synthetic_review_ci.report_snapshots; f jsonb; at_time timestamptz;
BEGIN
  r:=synthetic_review_ci.lock_authorized(a,w,c,e,i,'read'); at_time:=synthetic_review_ci.fixture_now();
  SELECT * INTO p FROM synthetic_review_ci.report_snapshots WHERE id=s AND record_id=i AND expires_at>at_time;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
  SELECT to_jsonb(x) INTO f FROM synthetic_review_ci.report_feedback x WHERE report_id=s;
  RETURN jsonb_build_object('ok',true,'report',to_jsonb(p),'feedback',f);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
CREATE FUNCTION synthetic_review_ci.apply_report(a text,w text,c text,e text,i uuid,v integer,k text,op text,body text,decision text,s uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci SET timezone='UTC' AS $$
DECLARE r synthetic_review_ci.records; h synthetic_review_ci.report_state;
  p synthetic_review_ci.report_snapshots; receipt synthetic_review_ci.report_receipts;
  at_time timestamptz; fp bytea; response jsonb;
BEGIN
  IF k IS NULL OR k !~ '^demo-[a-z0-9-]{1,40}$' OR v IS NULL OR v<0 OR v>=2147483647
    OR op IS NULL OR op NOT IN ('submit','review') OR body IS NULL
    OR char_length(body) NOT BETWEEN 1 AND 4096 OR octet_length(body)>8192 OR body !~ '[^[:space:]]'
    OR (op='submit' AND (decision IS NOT NULL OR s IS NOT NULL))
    OR (op='review' AND (s IS NULL OR decision IS NULL OR decision NOT IN ('changes-requested','review-recorded')))
    THEN RAISE EXCEPTION 'Unavailable'; END IF;
  r:=synthetic_review_ci.lock_authorized(a,w,c,e,i,op); at_time:=synthetic_review_ci.fixture_now();
  INSERT INTO synthetic_review_ci.report_state(record_id) VALUES(i) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT h FROM synthetic_review_ci.report_state WHERE record_id=i FOR UPDATE;
  fp:=sha256(convert_to(jsonb_build_array(v,op,body,decision,s)::text,'UTF8'));
  SELECT * INTO receipt FROM synthetic_review_ci.report_receipts WHERE record_id=i AND actor=a AND request_id=k;
  IF FOUND THEN
    SELECT * INTO p FROM synthetic_review_ci.report_snapshots WHERE id=receipt.report_id AND expires_at>at_time;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
    IF receipt.fingerprint<>fp THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
    RETURN receipt.reply;
  END IF;
  IF h.revision<>v THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
  IF op='submit' THEN
    IF h.status NOT IN ('working','changes-requested') THEN RAISE EXCEPTION 'Unavailable'; END IF;
    INSERT INTO synthetic_review_ci.report_snapshots(record_id,submission_revision,submitted_at,expires_at,body)
      VALUES(i,v+1,at_time,at_time+interval '24 hours',body) RETURNING * INTO p;
    INSERT INTO synthetic_review_ci.report_copy VALUES(p.id,'demo-copy-'||p.id::text,'pending');
  ELSE
    IF h.current_report IS DISTINCT FROM s THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
    IF h.status<>'submitted' THEN RAISE EXCEPTION 'Unavailable'; END IF;
    SELECT * INTO p FROM synthetic_review_ci.report_snapshots WHERE id=s AND record_id=i AND expires_at>at_time;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
    INSERT INTO synthetic_review_ci.report_feedback VALUES(p.id,v+1,a,decision,body);
  END IF;
  UPDATE synthetic_review_ci.report_state SET revision=v+1,
    status=CASE WHEN op='submit' THEN 'submitted' ELSE decision END,current_report=p.id WHERE record_id=i;
  INSERT INTO synthetic_review_ci.report_audit VALUES(p.id,v+1,a,op);
  response:=jsonb_build_object('ok',true,'reportId',p.id,'revision',v+1,
    'status',CASE WHEN op='submit' THEN 'submitted' ELSE decision END,
    'submittedAt',p.submitted_at,'expiresAt',p.expires_at);
  INSERT INTO synthetic_review_ci.report_receipts VALUES(i,a,k,fp,p.id,response);
  RETURN response;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
-- Admin-only simulation: confirmed is a fictional provider outcome, not Discord proof.
CREATE FUNCTION synthetic_review_ci.purge_report(s uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE p synthetic_review_ci.report_snapshots; parent_id uuid; copy_state text; at_time timestamptz;
BEGIN
  SELECT record_id INTO parent_id FROM synthetic_review_ci.report_snapshots WHERE id=s;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',true,'outcome','absent'); END IF;
  PERFORM 1 FROM synthetic_review_ci.records WHERE id=parent_id FOR UPDATE;
  at_time:=synthetic_review_ci.fixture_now();
  SELECT * INTO p FROM synthetic_review_ci.report_snapshots WHERE id=s FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',true,'outcome','absent'); END IF;
  IF p.expires_at>at_time THEN RETURN jsonb_build_object('ok',false,'reason','not-due'); END IF;
  SELECT state INTO copy_state FROM synthetic_review_ci.report_copy WHERE report_id=s FOR UPDATE;
  IF NOT FOUND OR copy_state<>'confirmed' THEN
    RETURN jsonb_build_object('ok',false,'reason','deletion-pending');
  END IF;
  DELETE FROM synthetic_review_ci.report_snapshots WHERE id=s;
  RETURN jsonb_build_object('ok',true,'outcome','deleted');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
-- No baseline body/read/replay route may bypass the new expiry-aware fixture functions.
REVOKE EXECUTE ON FUNCTION synthetic_review_ci.read_record(text,text,text,text,uuid),
  synthetic_review_ci.mutate(text,text,text,text,uuid,integer,text,text,text,text) FROM synthetic_review_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA synthetic_review_ci FROM PUBLIC;
GRANT EXECUTE ON FUNCTION synthetic_review_ci.read_report(text,text,text,text,uuid,uuid),
  synthetic_review_ci.apply_report(text,text,text,text,uuid,integer,text,text,text,text,uuid) TO synthetic_review_worker;
COMMIT;
