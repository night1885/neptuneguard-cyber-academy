-- Disposable CI add-on only. Never an academy migration or live intake activation.
BEGIN;
DO $$ BEGIN
 IF current_database()<>'synthetic_review_test' OR current_user<>'synthetic_review_admin'
  OR current_setting('server_version_num')::int/10000 NOT IN (16,18)
  OR to_regprocedure('synthetic_review_ci.rehearsal_binding(text,uuid,text)') IS NULL THEN RAISE EXCEPTION 'Owned rehearsal fixture required'; END IF;
 IF EXISTS(SELECT 1 FROM synthetic_review_ci.records) THEN RAISE EXCEPTION 'Empty rehearsal records required'; END IF;
END $$;
CREATE TABLE synthetic_review_ci.adapter_journals(
 record_id uuid PRIMARY KEY REFERENCES synthetic_review_ci.records ON DELETE CASCADE,
 guild_id text NOT NULL CHECK(guild_id ~ '^[0-9]{17,20}$'),channel_id text CHECK(channel_id ~ '^[0-9]{17,20}$'),
 operation_id uuid NOT NULL,state text NOT NULL CHECK(state IN('unprovisioned','creating','verify-pending','available','reconcile-required')),
 expires_at timestamptz NOT NULL CHECK(isfinite(expires_at)),
 report_id uuid REFERENCES synthetic_review_ci.report_snapshots ON DELETE CASCADE,
 UNIQUE(guild_id,channel_id),CHECK(state NOT IN('verify-pending','available') OR channel_id IS NOT NULL)
);
CREATE TABLE synthetic_review_ci.adapter_requests(
 record_id uuid NOT NULL REFERENCES synthetic_review_ci.records ON DELETE CASCADE,actor text NOT NULL,request_id uuid NOT NULL,
 request_key text NOT NULL,report_id uuid NOT NULL REFERENCES synthetic_review_ci.report_snapshots ON DELETE CASCADE,
 expires_at timestamptz NOT NULL CHECK(isfinite(expires_at)),PRIMARY KEY(record_id,actor,request_id),UNIQUE(record_id,actor,request_key)
);
CREATE TABLE synthetic_review_ci.adapter_draft_claims(
 record_id uuid NOT NULL REFERENCES synthetic_review_ci.records ON DELETE CASCADE,guild_id text NOT NULL,channel_id text NOT NULL,message_id text NOT NULL,
 source_created_ms bigint NOT NULL,token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),expires_at timestamptz NOT NULL CHECK(isfinite(expires_at)),
 PRIMARY KEY(guild_id,channel_id,message_id)
);
CREATE FUNCTION synthetic_review_ci.adapter_authority(a text,w text,c text,e text,i uuid,op text)
RETURNS synthetic_review_ci.records LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records;
BEGIN
 IF op IS NULL OR a IS NULL OR op NOT IN('read','submit','review') OR a NOT IN('demo-learner','demo-reviewer')
  OR (op='submit' AND a<>'demo-learner') OR (op='review' AND a<>'demo-reviewer') THEN RAISE EXCEPTION 'Unavailable'; END IF;
 r:=synthetic_review_ci.lock_authorized(a,w,c,e,i,op);
 IF r.owner<>'demo-learner' THEN RAISE EXCEPTION 'Unavailable'; END IF;RETURN r;
END $$;
CREATE FUNCTION synthetic_review_ci.adapter_create_record(a text,w text,c text,e text,g text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r jsonb;
BEGIN
 IF a IS DISTINCT FROM 'demo-learner' OR g IS NULL OR g !~ '^[0-9]{17,20}$' THEN RAISE EXCEPTION 'Unavailable';END IF;
 r:=synthetic_review_ci.create_record(a,w,c,e);IF r->>'ok' IS DISTINCT FROM 'true' THEN RETURN r;END IF;
 INSERT INTO synthetic_review_ci.adapter_journals VALUES((r->>'id')::uuid,g,NULL,gen_random_uuid(),'unprovisioned',synthetic_review_ci.fixture_now()+interval '24 hours',NULL);
 RETURN r;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_binding(a text,w text,c text,e text,i uuid,op text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records;v integer;
BEGIN r:=synthetic_review_ci.adapter_authority(a,w,c,e,i,op);SELECT revision INTO v FROM synthetic_review_ci.report_state WHERE record_id=i;
 RETURN jsonb_build_object('ok',true,'recordId',i,'learnerId',r.owner,'courseKey',r.course,'exerciseKey',r.exercise,'revision',coalesce(v,0));
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable'); END $$;
CREATE FUNCTION synthetic_review_ci.adapter_journal_read(a text,w text,c text,e text,i uuid,g text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE j synthetic_review_ci.adapter_journals;
BEGIN PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'submit');SELECT * INTO j FROM synthetic_review_ci.adapter_journals WHERE record_id=i;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable';END IF;
 IF j.guild_id<>g OR j.expires_at<=synthetic_review_ci.fixture_now() THEN RAISE EXCEPTION 'Unavailable';END IF;
 IF j.state='unprovisioned' THEN RETURN jsonb_build_object('ok',true,'journal',NULL);END IF;
 RETURN jsonb_build_object('ok',true,'journal',jsonb_strip_nulls(jsonb_build_object('state',j.state,'operationId',j.operation_id,'channelId',j.channel_id)));
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_journal_write(a text,w text,c text,e text,i uuid,g text,opid uuid,st text,ch text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE j synthetic_review_ci.adapter_journals;t timestamptz;
BEGIN
 PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'submit');t:=synthetic_review_ci.fixture_now();
 IF g IS NULL OR g !~ '^[0-9]{17,20}$' OR opid IS NULL OR st IS NULL OR st NOT IN('creating','verify-pending','available','reconcile-required')
  OR (ch IS NOT NULL AND ch !~ '^[0-9]{17,20}$') THEN RAISE EXCEPTION 'Unavailable';END IF;
 SELECT * INTO j FROM synthetic_review_ci.adapter_journals WHERE record_id=i FOR UPDATE;
 IF NOT FOUND OR j.guild_id<>g OR j.expires_at<=t THEN RAISE EXCEPTION 'Unavailable';END IF;
 IF j.state='unprovisioned' THEN
  IF st<>'creating' OR ch IS NOT NULL THEN RAISE EXCEPTION 'Unavailable';END IF;
  UPDATE synthetic_review_ci.adapter_journals SET operation_id=opid,state=st WHERE record_id=i;
 ELSE
  IF j.guild_id<>g OR j.operation_id<>opid OR j.expires_at<=t OR (j.channel_id IS NOT NULL AND j.channel_id IS DISTINCT FROM ch) THEN RAISE EXCEPTION 'Unavailable';END IF;
  IF NOT((j.state=st) OR (j.state='creating' AND st IN('verify-pending','reconcile-required')) OR (j.state='verify-pending' AND st IN('available','reconcile-required'))) THEN RAISE EXCEPTION 'Unavailable';END IF;
  UPDATE synthetic_review_ci.adapter_journals SET state=st,channel_id=ch WHERE record_id=i;
 END IF;RETURN jsonb_build_object('ok',true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_submit(a text,w text,c text,e text,i uuid,v integer,q uuid,body text,g text,ch text,m text,created_ms bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE j synthetic_review_ci.adapter_journals;old synthetic_review_ci.adapter_requests;result jsonb;k text;t timestamptz;
BEGIN
 PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'submit');t:=synthetic_review_ci.fixture_now();
 SELECT * INTO STRICT j FROM synthetic_review_ci.adapter_journals WHERE record_id=i AND guild_id=g AND channel_id=ch AND state='available' AND expires_at>t FOR UPDATE;
 IF q IS NULL OR g IS NULL OR ch IS NULL OR m IS NULL OR m !~ '^[0-9]{17,20}$' OR created_ms IS NULL OR created_ms<0 OR created_ms>8640000000000000-86400000
  OR body IS NULL OR char_length(body)>2000 OR octet_length(body)>8192 THEN RAISE EXCEPTION 'Unavailable';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(g||'|'||ch||'|'||m,0));
 k:='demo-'||substr(encode(sha256(convert_to(q::text,'UTF8')),'hex'),1,40);
 SELECT * INTO old FROM synthetic_review_ci.adapter_requests WHERE record_id=i AND actor=a AND request_id=q;
 IF NOT FOUND THEN
  IF to_timestamp(created_ms::double precision/1000)+interval '24 hours'<=t
   OR EXISTS(SELECT 1 FROM synthetic_review_ci.adapter_draft_claims WHERE guild_id=g AND channel_id=ch AND message_id=m)
   OR EXISTS(SELECT 1 FROM synthetic_review_ci.adapter_requests WHERE record_id=i AND actor=a AND request_key=k) THEN RAISE EXCEPTION 'Unavailable';END IF;
 ELSE IF old.expires_at<=t THEN RAISE EXCEPTION 'Unavailable';END IF;END IF;
 result:=synthetic_review_ci.submit_source_report(a,w,c,e,i,v,k,body,g,ch,m,created_ms);
 IF result->>'ok' IS DISTINCT FROM 'true' THEN RETURN result;END IF;
 IF old.report_id IS NULL THEN
  INSERT INTO synthetic_review_ci.adapter_requests VALUES(i,a,q,k,(result->>'reportId')::uuid,to_timestamp((result->>'expiresAtMs')::double precision/1000));
  UPDATE synthetic_review_ci.adapter_journals SET report_id=(result->>'reportId')::uuid,expires_at=to_timestamp((result->>'expiresAtMs')::double precision/1000) WHERE record_id=i;
 END IF;RETURN result;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_receipt(a text,w text,c text,e text,i uuid,q uuid,g text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE x synthetic_review_ci.adapter_requests;r jsonb;
BEGIN PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'submit');
 SELECT * INTO x FROM synthetic_review_ci.adapter_requests WHERE record_id=i AND actor=a AND request_id=q;
 IF NOT FOUND THEN RETURN NULL;END IF;
 r:=synthetic_review_ci.source_receipt(a,w,c,e,i,x.request_key);
 IF r->>'sourceGuildId' IS DISTINCT FROM g THEN RAISE EXCEPTION 'Unavailable';END IF;RETURN r;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_discover(a text,w text,c text,e text,i uuid,g text,n integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE items jsonb;
BEGIN PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'submit');IF n IS NULL OR n<1 OR n>20 THEN RAISE EXCEPTION 'Unavailable';END IF;
 SELECT coalesce(jsonb_agg(x.item ORDER BY x.submitted_at DESC,x.id),'[]'::jsonb) INTO items FROM(
  SELECT p.submitted_at,p.id,jsonb_build_object('requestId',q.request_id,'reportId',p.id,'revision',(r.reply->>'revision')::integer,'expiresAtMs',(extract(epoch FROM p.expires_at)*1000)::bigint) AS item
  FROM synthetic_review_ci.adapter_requests q JOIN synthetic_review_ci.report_snapshots p ON p.id=q.report_id
  JOIN synthetic_review_ci.report_sources s ON s.report_id=p.id JOIN synthetic_review_ci.report_receipts r ON r.record_id=i AND r.actor=a AND r.request_id=q.request_key
  WHERE q.record_id=i AND q.actor=a AND s.guild_id=g AND p.expires_at>synthetic_review_ci.fixture_now() AND q.expires_at=p.expires_at
  ORDER BY p.submitted_at DESC,p.id LIMIT n
 ) x;RETURN jsonb_build_object('ok',true,'items',items);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_read(a text,w text,c text,e text,i uuid,s uuid,g text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r jsonb;
BEGIN PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'read');r:=synthetic_review_ci.read_source_report(a,w,c,e,i,s);
 IF r->>'sourceGuildId' IS DISTINCT FROM g THEN RAISE EXCEPTION 'Unavailable';END IF;RETURN r;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_review(a text,w text,c text,e text,i uuid,v integer,s uuid,decision text,body text,g text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE k text;r jsonb;
BEGIN PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'review');
 IF body IS NULL OR char_length(body)>2000 OR octet_length(body)>8192 THEN RAISE EXCEPTION 'Unavailable';END IF;
 r:=synthetic_review_ci.adapter_read(a,w,c,e,i,s,g);IF r->>'ok' IS DISTINCT FROM 'true' THEN RETURN r;END IF;
 k:='demo-'||substr(encode(sha256(convert_to(jsonb_build_array(i,v,s,decision,body)::text,'UTF8')),'hex'),1,40);
 RETURN synthetic_review_ci.review_source_report(a,w,c,e,i,v,k,body,decision,s);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
CREATE FUNCTION synthetic_review_ci.adapter_claim_draft(a text,w text,c text,e text,i uuid,g text,ch text,m text,created_ms bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE d synthetic_review_ci.adapter_draft_claims;t timestamptz;deadline timestamptz;
BEGIN PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'review');t:=synthetic_review_ci.fixture_now();
 PERFORM 1 FROM synthetic_review_ci.adapter_journals WHERE record_id=i AND guild_id=g AND channel_id=ch AND state='available';IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable';END IF;
 IF m IS NULL OR m !~ '^[0-9]{17,20}$' OR created_ms IS NULL OR created_ms<0 OR created_ms>8640000000000000-86400000 THEN RAISE EXCEPTION 'Unavailable';END IF;
 deadline:=to_timestamp(created_ms::double precision/1000)+interval '24 hours';IF t<deadline THEN RETURN jsonb_build_object('claimed',false);END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(g||'|'||ch||'|'||m,0));
 IF EXISTS(SELECT 1 FROM synthetic_review_ci.report_sources WHERE guild_id=g AND channel_id=ch AND message_id=m) THEN RETURN jsonb_build_object('claimed',false);END IF;
 SELECT * INTO d FROM synthetic_review_ci.adapter_draft_claims WHERE guild_id=g AND channel_id=ch AND message_id=m FOR UPDATE;
 IF FOUND THEN RETURN jsonb_build_object('claimed',false);END IF;
 INSERT INTO synthetic_review_ci.adapter_draft_claims(record_id,guild_id,channel_id,message_id,source_created_ms,expires_at) VALUES(i,g,ch,m,created_ms,deadline) RETURNING * INTO d;
 RETURN jsonb_build_object('claimed',true,'token',d.token);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('claimed',false);END $$;
CREATE FUNCTION synthetic_review_ci.adapter_finish_draft(a text,w text,c text,e text,i uuid,tok uuid,outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
BEGIN PERFORM synthetic_review_ci.adapter_authority(a,w,c,e,i,'review');IF outcome IS NULL OR outcome NOT IN('confirmed','unknown') THEN RAISE EXCEPTION 'Unavailable';END IF;
 DELETE FROM synthetic_review_ci.adapter_draft_claims WHERE record_id=i AND token=tok;IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable';END IF;
 RETURN jsonb_build_object('ok',true,'outcome',outcome);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');END $$;
-- Admin-only fixture cleanup: no grace period, extension, receipt or tombstone.
CREATE FUNCTION synthetic_review_ci.adapter_expire_metadata() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE t timestamptz;
BEGIN t:=synthetic_review_ci.fixture_now();DELETE FROM synthetic_review_ci.adapter_draft_claims WHERE expires_at<=t;
 DELETE FROM synthetic_review_ci.adapter_requests WHERE expires_at<=t;DELETE FROM synthetic_review_ci.adapter_journals WHERE expires_at<=t;END $$;
REVOKE EXECUTE ON FUNCTION synthetic_review_ci.create_record(text,text,text,text),synthetic_review_ci.submit_source_report(text,text,text,text,uuid,integer,text,text,text,text,text,bigint),
 synthetic_review_ci.source_receipt(text,text,text,text,uuid,text),synthetic_review_ci.read_source_report(text,text,text,text,uuid,uuid),
 synthetic_review_ci.review_source_report(text,text,text,text,uuid,integer,text,text,text,uuid),synthetic_review_ci.read_report(text,text,text,text,uuid,uuid),
 synthetic_review_ci.rehearsal_binding(text,uuid,text) FROM synthetic_review_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA synthetic_review_ci FROM PUBLIC;
GRANT EXECUTE ON FUNCTION synthetic_review_ci.adapter_create_record(text,text,text,text,text),synthetic_review_ci.adapter_binding(text,text,text,text,uuid,text),
 synthetic_review_ci.adapter_journal_read(text,text,text,text,uuid,text),synthetic_review_ci.adapter_journal_write(text,text,text,text,uuid,text,uuid,text,text),
 synthetic_review_ci.adapter_submit(text,text,text,text,uuid,integer,uuid,text,text,text,text,bigint),synthetic_review_ci.adapter_receipt(text,text,text,text,uuid,uuid,text),
 synthetic_review_ci.adapter_discover(text,text,text,text,uuid,text,integer),synthetic_review_ci.adapter_read(text,text,text,text,uuid,uuid,text),
 synthetic_review_ci.adapter_review(text,text,text,text,uuid,integer,uuid,text,text,text),synthetic_review_ci.adapter_claim_draft(text,text,text,text,uuid,text,text,text,bigint),
 synthetic_review_ci.adapter_finish_draft(text,text,text,text,uuid,uuid,text) TO synthetic_review_worker;
COMMIT;
