-- SOURCE CANDIDATE ONLY. Explicit isolated-database installation, never startup migration.
-- psql variables: staging_database, production_database, staging_admin, staging_worker.
\set ON_ERROR_STOP on
SELECT current_database()=:'staging_database' AND current_database()<>:'production_database'
 AND current_user=:'staging_admin' AND current_user<>:'staging_worker'
 AND current_setting('server_version_num')::integer>=160000 AS install_allowed \gset
\if :install_allowed
\else
 \echo 'Explicit isolated staging admin/database required'
 \quit 3
\endif
BEGIN;
CREATE SCHEMA fi_stage;
REVOKE ALL ON SCHEMA fi_stage FROM PUBLIC;
CREATE TABLE fi_stage.records(
 id uuid PRIMARY KEY,guild_id text NOT NULL,learner_id text NOT NULL,reviewer_id text NOT NULL,
 course_key text NOT NULL,exercise_key text NOT NULL,active boolean NOT NULL DEFAULT true,
 valid_until timestamptz NOT NULL CHECK(isfinite(valid_until)),revision integer NOT NULL DEFAULT 0,
 journal jsonb NOT NULL DEFAULT '{"state":"unprovisioned"}',
 journal_expires timestamptz NOT NULL DEFAULT(clock_timestamp()+interval '24 hours'),
 CHECK(learner_id<>reviewer_id),CHECK(guild_id~'^[0-9]{17,20}$'),
 CHECK(learner_id~'^[0-9]{17,20}$'),CHECK(reviewer_id~'^[0-9]{17,20}$'),
 CHECK(course_key~'^demo-[a-zA-Z0-9-]{1,70}$'),CHECK(exercise_key~'^demo-[a-zA-Z0-9-]{1,70}$')
);
CREATE TABLE fi_stage.reports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),record_id uuid NOT NULL REFERENCES fi_stage.records,
 request_id uuid NOT NULL,revision integer NOT NULL,body text,digest text,
 source_channel text NOT NULL,source_message text NOT NULL,source_created_ms bigint NOT NULL,
 submitted_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 UNIQUE(record_id,request_id),UNIQUE(source_channel,source_message),
 CHECK((body IS NULL AND digest IS NULL) OR (body IS NOT NULL AND digest IS NOT NULL AND char_length(body) BETWEEN 1 AND 2000 AND octet_length(body)<=8192)),
 CHECK(expires_at=submitted_at+interval '24 hours')
);
CREATE TABLE fi_stage.drafts(
 record_id uuid NOT NULL REFERENCES fi_stage.records,channel_id text NOT NULL,message_id text NOT NULL,
 created_ms bigint NOT NULL,expires_at timestamptz NOT NULL,claimed boolean NOT NULL DEFAULT false,
 PRIMARY KEY(channel_id,message_id)
);
CREATE FUNCTION fi_stage.contract() RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT 1';
CREATE FUNCTION fi_stage.dispatch(p_actor text,p_guild text,p_record uuid,p_course text,p_exercise text,p_op text,p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fi_stage AS $$
DECLARE r fi_stage.records; x fi_stage.reports; j jsonb;t timestamptz;n integer;deadline timestamptz;items jsonb;
BEGIN
 SELECT * INTO STRICT r FROM fi_stage.records WHERE id=p_record FOR UPDATE;
 -- Capture authority/deadline time AFTER acquiring this record lock.
 t:=date_trunc('milliseconds',clock_timestamp());
 IF r.guild_id IS DISTINCT FROM p_guild OR r.course_key IS DISTINCT FROM p_course OR r.exercise_key IS DISTINCT FROM p_exercise THEN RAISE EXCEPTION 'Unavailable';END IF;
 IF p_op IN('due','claim','erase','maintenance','noteDraft','retireJournal') THEN
  IF p_actor IS DISTINCT FROM r.reviewer_id THEN RAISE EXCEPTION 'Unavailable';END IF;
 ELSE
  IF NOT r.active OR t>=r.valid_until OR p_actor IS DISTINCT FROM r.learner_id THEN RAISE EXCEPTION 'Unavailable';END IF;
 END IF;
 IF p_op IS NULL OR jsonb_typeof(p) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Unavailable';END IF;
 IF p_op='maintenance' THEN RETURN jsonb_build_object('ok',true,'journal',r.journal,'journalExpiresAtMs',(extract(epoch FROM r.journal_expires)*1000)::bigint);END IF;
 IF p_op='retireJournal' THEN
  IF t>=r.journal_expires AND NOT EXISTS(SELECT 1 FROM fi_stage.reports WHERE record_id=r.id) AND NOT EXISTS(SELECT 1 FROM fi_stage.drafts WHERE record_id=r.id) THEN UPDATE fi_stage.records SET journal='{"state":"erased"}'::jsonb WHERE id=r.id;END IF;RETURN '{"ok":true}';
 END IF;
 IF p_op='resolve' THEN RETURN jsonb_build_object('ok',true,'recordId',r.id,'learnerId',r.learner_id,'courseKey',r.course_key,'exerciseKey',r.exercise_key,'revision',r.revision);END IF;
 IF p_op='journalRead' THEN
  IF t>=r.journal_expires THEN RETURN jsonb_build_object('ok',true,'journal',jsonb_build_object('state','reconcile-required'));END IF;
  RETURN jsonb_build_object('ok',true,'journal',CASE WHEN r.journal->>'state'='unprovisioned' THEN NULL ELSE r.journal END);
 END IF;
 IF p_op='journalWrite' THEN
  IF t>=r.journal_expires OR coalesce(p->>'state','') NOT IN('creating','verify-pending','available','reconcile-required') OR (p->>'operationId')::uuid IS NULL THEN RAISE EXCEPTION 'Unavailable';END IF;
  IF r.journal->>'state'='unprovisioned' THEN
   IF p->>'state'<>'creating' OR p ? 'channelId' THEN RAISE EXCEPTION 'Unavailable';END IF;
  ELSE
   IF r.journal->>'operationId' IS DISTINCT FROM p->>'operationId' OR (r.journal ? 'channelId' AND r.journal->>'channelId' IS DISTINCT FROM p->>'channelId') THEN RAISE EXCEPTION 'Unavailable';END IF;
   IF NOT(r.journal->>'state'=p->>'state' OR (r.journal->>'state'='creating' AND p->>'state' IN('verify-pending','reconcile-required')) OR (r.journal->>'state'='verify-pending' AND p->>'state' IN('available','reconcile-required'))) THEN RAISE EXCEPTION 'Unavailable';END IF;
  END IF;
  IF p->>'state' IN('verify-pending','available') AND coalesce(p->>'channelId','')!~'^[0-9]{17,20}$' THEN RAISE EXCEPTION 'Unavailable';END IF;
  UPDATE fi_stage.records SET journal=p WHERE id=r.id;RETURN '{"ok":true}';
 END IF;
 IF p_op='noteDraft' THEN
  IF r.journal->>'state'<>'available' OR p->>'channelId' IS DISTINCT FROM r.journal->>'channelId'
   OR coalesce(p->>'messageId','')!~'^[0-9]{17,20}$' OR (p->>'createdAtMs')::bigint NOT BETWEEN 0 AND 8639999913600000 THEN RAISE EXCEPTION 'Unavailable';END IF;
  deadline:=to_timestamp((p->>'createdAtMs')::double precision/1000)+interval '24 hours';
  IF to_timestamp((p->>'createdAtMs')::double precision/1000)>t THEN RAISE EXCEPTION 'Unavailable';END IF;
  IF NOT EXISTS(SELECT 1 FROM fi_stage.reports WHERE source_channel=p->>'channelId' AND source_message=p->>'messageId') THEN
   INSERT INTO fi_stage.drafts VALUES(r.id,p->>'channelId',p->>'messageId',(p->>'createdAtMs')::bigint,deadline,false) ON CONFLICT DO NOTHING;
  END IF;RETURN '{"ok":true}';
 END IF;
 IF p_op='submit' THEN
  IF NOT(p ?& ARRAY['requestId','expectedRevision','body','digest','channelId','messageId','createdAtMs']) OR EXISTS(SELECT 1 FROM jsonb_each(p) kv WHERE kv.value='null'::jsonb) THEN RAISE EXCEPTION 'Unavailable';END IF;
  SELECT * INTO x FROM fi_stage.reports WHERE record_id=r.id AND request_id=(p->>'requestId')::uuid;
  IF FOUND THEN
   IF t>=x.expires_at OR x.digest IS DISTINCT FROM p->>'digest' OR x.source_channel IS DISTINCT FROM p->>'channelId' OR x.source_message IS DISTINCT FROM p->>'messageId' OR x.source_created_ms IS DISTINCT FROM (p->>'createdAtMs')::bigint THEN RAISE EXCEPTION 'Unavailable';END IF;
  ELSE
   IF r.revision IS DISTINCT FROM (p->>'expectedRevision')::integer OR r.journal->>'state'<>'available' OR t>=r.journal_expires
    OR r.journal->>'channelId' IS DISTINCT FROM p->>'channelId' OR coalesce(p->>'messageId','')!~'^[0-9]{17,20}$'
    OR (p->>'createdAtMs')::bigint NOT BETWEEN 0 AND 8639999913600000 OR coalesce(btrim(p->>'body'),'')=''
    OR char_length(p->>'body')>2000 OR octet_length(p->>'body')>8192 OR encode(sha256(convert_to(p->>'body','UTF8')),'hex') IS DISTINCT FROM p->>'digest'
    OR to_timestamp((p->>'createdAtMs')::double precision/1000)>t OR t>=to_timestamp((p->>'createdAtMs')::double precision/1000)+interval '24 hours'
    OR EXISTS(SELECT 1 FROM fi_stage.drafts WHERE channel_id=p->>'channelId' AND message_id=p->>'messageId' AND claimed) THEN RAISE EXCEPTION 'Unavailable';END IF;
   INSERT INTO fi_stage.reports(record_id,request_id,revision,body,digest,source_channel,source_message,source_created_ms,submitted_at,expires_at)
    VALUES(r.id,(p->>'requestId')::uuid,r.revision+1,p->>'body',p->>'digest',p->>'channelId',p->>'messageId',(p->>'createdAtMs')::bigint,t,t+interval '24 hours') RETURNING * INTO x;
   UPDATE fi_stage.records SET revision=x.revision,journal_expires=x.expires_at WHERE id=r.id;
   DELETE FROM fi_stage.drafts WHERE channel_id=x.source_channel AND message_id=x.source_message;
  END IF;
 ELSIF p_op='receipt' THEN
  SELECT * INTO x FROM fi_stage.reports WHERE record_id=r.id AND request_id=(p->>'requestId')::uuid;
  IF NOT FOUND THEN RETURN 'null'::jsonb;END IF;IF t>=x.expires_at THEN RAISE EXCEPTION 'Unavailable';END IF;
 ELSIF p_op='discover' THEN
  n:=(p->>'limit')::integer;IF n NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Unavailable';END IF;
  SELECT coalesce(jsonb_agg(z.item),'[]'::jsonb) INTO items FROM(SELECT jsonb_build_object('requestId',request_id,'reportId',id,'revision',revision,'expiresAtMs',(extract(epoch FROM expires_at)*1000)::bigint) AS item FROM fi_stage.reports WHERE record_id=r.id AND expires_at>t ORDER BY submitted_at DESC,id LIMIT n) z;
  RETURN jsonb_build_object('ok',true,'items',items);
 ELSIF p_op='due' THEN
  -- Independent DB payload erasure; external deletion uncertainty is not permission to keep body.
  UPDATE fi_stage.reports SET body=NULL,digest=NULL WHERE id IN(SELECT id FROM fi_stage.reports WHERE record_id=r.id AND expires_at<=t AND body IS NOT NULL LIMIT 20);
  SELECT coalesce(jsonb_agg(z.item),'[]'::jsonb) INTO items FROM(
   SELECT jsonb_build_object('kind','report','id',id,'channelId',source_channel,'messageId',source_message,'deadlineMs',(extract(epoch FROM expires_at)*1000)::bigint) AS item FROM fi_stage.reports WHERE record_id=r.id AND expires_at<=t
   UNION ALL SELECT jsonb_build_object('kind','draft','channelId',channel_id,'messageId',message_id,'deadlineMs',(extract(epoch FROM expires_at)*1000)::bigint) FROM fi_stage.drafts WHERE record_id=r.id AND expires_at<=t
   LIMIT 20) z;RETURN jsonb_build_object('ok',true,'items',items);
 ELSIF p_op='claim' THEN
  UPDATE fi_stage.drafts SET claimed=true WHERE record_id=r.id AND channel_id=p->>'channelId' AND message_id=p->>'messageId' AND expires_at<=t;
  RETURN jsonb_build_object('ok',true,'claimed',FOUND);
 ELSIF p_op='erase' THEN
  IF p->>'confirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Unavailable';END IF;
  IF p->>'kind'='report' THEN
   SELECT * INTO STRICT x FROM fi_stage.reports WHERE id=(p->>'id')::uuid AND record_id=r.id AND expires_at<=t;
   IF x.source_channel IS DISTINCT FROM p->>'channelId' OR x.source_message IS DISTINCT FROM p->>'messageId' THEN RAISE EXCEPTION 'Unavailable';END IF;
   DELETE FROM fi_stage.reports WHERE id=x.id;
   IF NOT EXISTS(SELECT 1 FROM fi_stage.reports WHERE record_id=r.id) AND t>=r.journal_expires THEN
    UPDATE fi_stage.records SET journal='{"state":"erased"}'::jsonb WHERE id=r.id;
   END IF;
  ELSIF p->>'kind'='draft' THEN
   DELETE FROM fi_stage.drafts WHERE record_id=r.id AND channel_id=p->>'channelId' AND message_id=p->>'messageId' AND expires_at<=t AND claimed;
   IF NOT FOUND THEN RAISE EXCEPTION 'Unavailable';END IF;
  ELSE RAISE EXCEPTION 'Unavailable';END IF;
  IF t>=r.journal_expires AND NOT EXISTS(SELECT 1 FROM fi_stage.reports WHERE record_id=r.id) AND NOT EXISTS(SELECT 1 FROM fi_stage.drafts WHERE record_id=r.id) THEN UPDATE fi_stage.records SET journal='{"state":"erased"}'::jsonb WHERE id=r.id;END IF;RETURN '{"ok":true}';
 ELSE RAISE EXCEPTION 'Unavailable';END IF;
 RETURN jsonb_build_object('ok',true,'reportId',x.id,'recordId',r.id,'learnerId',r.learner_id,'revision',x.revision,'digest',x.digest,
  'submittedAtMs',(extract(epoch FROM x.submitted_at)*1000)::bigint,'expiresAtMs',(extract(epoch FROM x.expires_at)*1000)::bigint,
  'sourceGuildId',r.guild_id,'sourceChannelId',x.source_channel,'sourceMessageId',x.source_message,'sourceCreatedAtMs',x.source_created_ms);
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA fi_stage FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fi_stage FROM PUBLIC;
GRANT USAGE ON SCHEMA fi_stage TO :"staging_worker";
GRANT EXECUTE ON FUNCTION fi_stage.contract(),fi_stage.dispatch(text,text,uuid,text,text,text,jsonb) TO :"staging_worker";
COMMIT;
-- Bootstrap a fictional work record ONLY as the separately approved admin, with explicit
-- id/guild/learner/reviewer/demo-course/demo-exercise/finite grant deadline. No seed default.
