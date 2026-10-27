-- Disposable synthetic CI fixture. Never install as an academy migration.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'synthetic_review_test' OR current_user <> 'synthetic_review_admin'
     OR current_setting('server_version_num')::int / 10000 NOT IN (16,18) THEN
    RAISE EXCEPTION 'Disposable fixture identity required';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
      AND c.relkind IN ('r','p','v','m','f')) THEN
    RAISE EXCEPTION 'Empty disposable database required';
  END IF;
END $$;
CREATE SCHEMA synthetic_review_ci;
REVOKE ALL ON SCHEMA synthetic_review_ci FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE TEMPORARY ON DATABASE synthetic_review_test FROM PUBLIC;
CREATE TABLE synthetic_review_ci.assignments (
  actor text CHECK (actor ~ '^demo-[a-z0-9-]{1,40}$'),
  workspace text CHECK (workspace = 'demo-workspace'),
  course text CHECK (course = 'demo-ethical-hacking'),
  exercise text CHECK (exercise = 'demo-first-practical'),
  active boolean NOT NULL,
  PRIMARY KEY (actor,workspace,course,exercise)
);
CREATE TABLE synthetic_review_ci.records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner text NOT NULL, workspace text NOT NULL, course text NOT NULL, exercise text NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  status text NOT NULL DEFAULT 'working' CHECK (status IN ('working','submitted','changes-requested','review-recorded')),
  evidence text CHECK (char_length(evidence) BETWEEN 1 AND 4096 AND octet_length(evidence) <= 8192),
  feedback text CHECK (char_length(feedback) BETWEEN 1 AND 4096 AND octet_length(feedback) <= 8192),
  FOREIGN KEY (owner,workspace,course,exercise) REFERENCES synthetic_review_ci.assignments,
  CHECK ((status='working' AND evidence IS NULL AND feedback IS NULL) OR
    (status='submitted' AND evidence IS NOT NULL AND feedback IS NULL) OR
    (status IN ('changes-requested','review-recorded') AND evidence IS NOT NULL AND feedback IS NOT NULL))
);
CREATE TABLE synthetic_review_ci.reviewers (
  record_id uuid REFERENCES synthetic_review_ci.records ON DELETE CASCADE,
  actor text CHECK (actor ~ '^demo-[a-z0-9-]{1,40}$'), active boolean NOT NULL,
  PRIMARY KEY (record_id,actor)
);
CREATE TABLE synthetic_review_ci.audit (
  record_id uuid REFERENCES synthetic_review_ci.records ON DELETE CASCADE,
  revision integer NOT NULL, actor text NOT NULL,
  event text NOT NULL CHECK (event IN ('create','submit','review')),
  PRIMARY KEY (record_id,revision)
);
CREATE TABLE synthetic_review_ci.receipts (
  record_id uuid REFERENCES synthetic_review_ci.records ON DELETE CASCADE,
  actor text, request_id text, fingerprint bytea NOT NULL, reply jsonb NOT NULL,
  PRIMARY KEY (record_id,actor,request_id)
);
CREATE FUNCTION synthetic_review_ci.lock_authorized(a text,w text,c text,e text,i uuid,op text)
RETURNS synthetic_review_ci.records LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records;
BEGIN
  SELECT * INTO r FROM synthetic_review_ci.records WHERE id=i FOR UPDATE;
  IF NOT FOUND OR r.workspace<>w OR r.course<>c OR r.exercise<>e OR a IS NULL
     OR op NOT IN ('read','submit','review') THEN RAISE EXCEPTION 'Unavailable'; END IF;
  PERFORM 1 FROM synthetic_review_ci.assignments WHERE actor=r.owner AND workspace=w
    AND course=c AND exercise=e AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
  IF a=r.owner THEN
    IF op='review' THEN RAISE EXCEPTION 'Unavailable'; END IF;
  ELSE
    IF op='submit' THEN RAISE EXCEPTION 'Unavailable'; END IF;
    PERFORM 1 FROM synthetic_review_ci.reviewers WHERE record_id=i AND actor=a AND active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
  END IF;
  RETURN r;
END $$;
CREATE FUNCTION synthetic_review_ci.create_record(a text,w text,c text,e text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records;
BEGIN
  PERFORM 1 FROM synthetic_review_ci.assignments WHERE actor=a AND workspace=w
    AND course=c AND exercise=e AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
  INSERT INTO synthetic_review_ci.records(owner,workspace,course,exercise) VALUES(a,w,c,e) RETURNING * INTO r;
  INSERT INTO synthetic_review_ci.audit VALUES(r.id,0,a,'create');
  RETURN jsonb_build_object('ok',true,'id',r.id,'revision',0,'status','working');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
CREATE FUNCTION synthetic_review_ci.read_record(a text,w text,c text,e text,i uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records;
BEGIN
  r := synthetic_review_ci.lock_authorized(a,w,c,e,i,'read');
  RETURN jsonb_build_object('ok',true,'record',to_jsonb(r));
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
CREATE FUNCTION synthetic_review_ci.mutate(a text,w text,c text,e text,i uuid,v integer,k text,op text,body text,decision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records; old synthetic_review_ci.receipts; fp bytea; result jsonb;
BEGIN
  IF k IS NULL OR k !~ '^demo-[a-z0-9-]{1,40}$' OR v IS NULL OR v<0 OR v>=2147483647
    OR op IS NULL OR op NOT IN ('submit','review') OR body IS NULL
    OR char_length(body) NOT BETWEEN 1 AND 4096 OR octet_length(body)>8192
    OR body !~ '[^[:space:]]' OR (op='submit' AND decision IS NOT NULL)
    OR (op='review' AND (decision IS NULL OR decision NOT IN ('changes-requested','review-recorded')))
    THEN RAISE EXCEPTION 'Unavailable'; END IF;
  r := synthetic_review_ci.lock_authorized(a,w,c,e,i,op);
  fp := sha256(convert_to(jsonb_build_array(v,op,body,decision)::text,'UTF8'));
  SELECT * INTO old FROM synthetic_review_ci.receipts WHERE record_id=i AND actor=a AND request_id=k;
  IF FOUND THEN
    IF old.fingerprint<>fp THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
    RETURN old.reply;
  END IF;
  IF r.revision<>v THEN RETURN jsonb_build_object('ok',false,'reason','conflict'); END IF;
  IF (op='submit' AND r.status NOT IN ('working','changes-requested')) OR
     (op='review' AND r.status<>'submitted') THEN RAISE EXCEPTION 'Unavailable'; END IF;
  UPDATE synthetic_review_ci.records SET revision=revision+1,
    status=CASE WHEN op='submit' THEN 'submitted' ELSE decision END,
    evidence=CASE WHEN op='submit' THEN body ELSE evidence END,
    feedback=CASE WHEN op='submit' THEN NULL ELSE body END WHERE id=i RETURNING * INTO r;
  INSERT INTO synthetic_review_ci.audit VALUES(i,r.revision,a,op);
  result := jsonb_build_object('ok',true,'id',i,'revision',r.revision,'status',r.status);
  INSERT INTO synthetic_review_ci.receipts VALUES(i,a,k,fp,result);
  RETURN result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA synthetic_review_ci FROM PUBLIC;
CREATE ROLE synthetic_review_worker LOGIN PASSWORD 'ci-worker-only'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
GRANT CONNECT ON DATABASE synthetic_review_test TO synthetic_review_worker;
GRANT USAGE ON SCHEMA synthetic_review_ci TO synthetic_review_worker;
GRANT EXECUTE ON FUNCTION synthetic_review_ci.create_record(text,text,text,text),
  synthetic_review_ci.read_record(text,text,text,text,uuid),
  synthetic_review_ci.mutate(text,text,text,text,uuid,integer,text,text,text,text) TO synthetic_review_worker;
COMMIT;
