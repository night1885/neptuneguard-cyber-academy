-- Disposable synthetic provenance add-on. Not an academy migration or live adapter.
BEGIN;
DO $$ BEGIN
  IF current_database()<>'synthetic_review_test' OR current_user<>'synthetic_review_admin'
    OR current_setting('server_version_num')::int/10000 NOT IN (16,18)
    OR to_regclass('synthetic_review_ci.report_snapshots') IS NULL THEN
    RAISE EXCEPTION 'Explicit retention CI fixture required';
  END IF;
  IF EXISTS(SELECT 1 FROM synthetic_review_ci.report_snapshots) THEN
    RAISE EXCEPTION 'Unpopulated retention fixture required';
  END IF;
END $$;
CREATE TABLE synthetic_review_ci.report_sources (
  report_id uuid PRIMARY KEY REFERENCES synthetic_review_ci.report_snapshots ON DELETE CASCADE,
  guild_id text NOT NULL CHECK(guild_id ~ '^[0-9]{17,20}$'),
  channel_id text NOT NULL CHECK(channel_id ~ '^[0-9]{17,20}$'),
  message_id text NOT NULL CHECK(message_id ~ '^[0-9]{17,20}$'),
  source_created_at_ms bigint NOT NULL CHECK(source_created_at_ms BETWEEN 0 AND 8640000000000000),
  body_digest text NOT NULL CHECK(body_digest ~ '^[a-f0-9]{64}$'),
  UNIQUE(guild_id,channel_id,message_id)
);
CREATE TRIGGER immutable_source BEFORE UPDATE ON synthetic_review_ci.report_sources
FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.immutable_report();
CREATE FUNCTION synthetic_review_ci.source_envelope(i uuid,s uuid,rev integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE p synthetic_review_ci.report_snapshots; src synthetic_review_ci.report_sources; r synthetic_review_ci.records;
BEGIN
  SELECT * INTO STRICT p FROM synthetic_review_ci.report_snapshots WHERE id=s AND record_id=i;
  SELECT * INTO STRICT src FROM synthetic_review_ci.report_sources WHERE report_id=s;
  SELECT * INTO STRICT r FROM synthetic_review_ci.records WHERE id=i;
  IF p.expires_at<=synthetic_review_ci.fixture_now()
    OR src.body_digest<>encode(sha256(convert_to(p.body,'UTF8')),'hex') THEN
    RAISE EXCEPTION 'Unavailable';
  END IF;
  RETURN jsonb_build_object('ok',true,'reportId',p.id,'recordId',i,'learnerId',r.owner,
    'revision',rev,'digest',src.body_digest,
    'submittedAtMs',(extract(epoch FROM p.submitted_at)*1000)::bigint,
    'expiresAtMs',(extract(epoch FROM p.expires_at)*1000)::bigint,
    'sourceGuildId',src.guild_id,'sourceChannelId',src.channel_id,
    'sourceMessageId',src.message_id,'sourceCreatedAtMs',src.source_created_at_ms);
END $$;
CREATE FUNCTION synthetic_review_ci.submit_source_report(a text,w text,c text,e text,i uuid,v integer,k text,
  body text,g text,ch text,m text,created_ms bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records; old synthetic_review_ci.report_receipts;
  src synthetic_review_ci.report_sources; response jsonb; s uuid; at_time timestamptz;
BEGIN
  IF g IS NULL OR g !~ '^[0-9]{17,20}$' OR ch IS NULL OR ch !~ '^[0-9]{17,20}$'
    OR m IS NULL OR m !~ '^[0-9]{17,20}$' OR created_ms IS NULL OR created_ms<0
    OR created_ms>8640000000000000 OR body IS NULL OR char_length(body)>2000
    THEN RAISE EXCEPTION 'Unavailable'; END IF;
  r:=synthetic_review_ci.lock_authorized(a,w,c,e,i,'submit');
  at_time:=synthetic_review_ci.fixture_now();
  IF created_ms>(extract(epoch FROM at_time)*1000)::bigint THEN RAISE EXCEPTION 'Unavailable'; END IF;
  SELECT * INTO old FROM synthetic_review_ci.report_receipts WHERE record_id=i AND actor=a AND request_id=k;
  IF FOUND THEN
    SELECT * INTO src FROM synthetic_review_ci.report_sources WHERE report_id=old.report_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable'; END IF;
    IF src.guild_id<>g OR src.channel_id<>ch OR src.message_id<>m OR src.source_created_at_ms<>created_ms THEN
      RETURN jsonb_build_object('ok',false,'reason','conflict');
    END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM synthetic_review_ci.report_sources WHERE guild_id=g AND channel_id=ch AND message_id=m) THEN
      RETURN jsonb_build_object('ok',false,'reason','conflict');
    END IF;
  END IF;
  response:=synthetic_review_ci.apply_report(a,w,c,e,i,v,k,'submit',body,NULL,NULL);
  IF response->>'ok' IS DISTINCT FROM 'true' THEN RETURN response; END IF;
  s:=(response->>'reportId')::uuid;
  IF old.report_id IS NULL THEN
    INSERT INTO synthetic_review_ci.report_sources VALUES(s,g,ch,m,created_ms,encode(sha256(convert_to(body,'UTF8')),'hex'));
  END IF;
  RETURN synthetic_review_ci.source_envelope(i,s,(response->>'revision')::integer);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('ok',false,'reason','conflict');
  WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
CREATE FUNCTION synthetic_review_ci.source_receipt(a text,w text,c text,e text,i uuid,k text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records; old synthetic_review_ci.report_receipts;
BEGIN
  r:=synthetic_review_ci.lock_authorized(a,w,c,e,i,'submit');
  SELECT * INTO old FROM synthetic_review_ci.report_receipts WHERE record_id=i AND actor=a AND request_id=k;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN synthetic_review_ci.source_envelope(i,old.report_id,(old.reply->>'revision')::integer);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
CREATE FUNCTION synthetic_review_ci.read_source_report(a text,w text,c text,e text,i uuid,s uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records; p synthetic_review_ci.report_snapshots; rev integer;
BEGIN
  r:=synthetic_review_ci.lock_authorized(a,w,c,e,i,'read');
  SELECT * INTO STRICT p FROM synthetic_review_ci.report_snapshots WHERE id=s AND record_id=i;
  SELECT submission_revision INTO rev FROM synthetic_review_ci.report_snapshots WHERE id=s;
  RETURN synthetic_review_ci.source_envelope(i,s,rev)||jsonb_build_object('body',p.body);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
CREATE FUNCTION synthetic_review_ci.review_source_report(a text,w text,c text,e text,i uuid,v integer,k text,
  body text,decision text,s uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records; response jsonb;
BEGIN
  r:=synthetic_review_ci.lock_authorized(a,w,c,e,i,'review');
  PERFORM synthetic_review_ci.source_envelope(i,s,v);
  response:=synthetic_review_ci.apply_report(a,w,c,e,i,v,k,'review',body,decision,s);
  IF response->>'ok' IS DISTINCT FROM 'true' THEN RETURN response; END IF;
  RETURN synthetic_review_ci.source_envelope(i,s,(response->>'revision')::integer);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
REVOKE EXECUTE ON FUNCTION synthetic_review_ci.apply_report(text,text,text,text,uuid,integer,text,text,text,text,uuid)
FROM synthetic_review_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA synthetic_review_ci FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  synthetic_review_ci.submit_source_report(text,text,text,text,uuid,integer,text,text,text,text,text,bigint),
  synthetic_review_ci.source_receipt(text,text,text,text,uuid,text),
  synthetic_review_ci.read_source_report(text,text,text,text,uuid,uuid),
  synthetic_review_ci.review_source_report(text,text,text,text,uuid,integer,text,text,text,uuid)
TO synthetic_review_worker;
COMMIT;
