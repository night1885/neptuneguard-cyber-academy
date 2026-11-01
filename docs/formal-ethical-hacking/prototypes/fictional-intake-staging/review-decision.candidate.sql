-- CANDIDATE ONLY: separate reviewed installation; never a startup migration.
-- Required psql variables: staging_database, production_database, staging_admin, staging_worker.
\set ON_ERROR_STOP on
SELECT current_database()=:'staging_database' AND current_database()<>:'production_database'
 AND current_user=:'staging_admin' AND current_user<>:'staging_worker'
 AND current_setting('server_version_num')::integer>=160000 AND fi_stage.contract()=1
 AND to_regprocedure('fi_stage.reviewer_read(text,text,uuid,text,text,uuid)') IS NOT NULL
 AND NOT has_schema_privilege(:'staging_worker','fi_stage','CREATE')
 AND NOT has_table_privilege(:'staging_worker','fi_stage.reports','SELECT,INSERT,UPDATE,DELETE')
 AND NOT has_table_privilege(:'staging_worker','fi_stage.records','SELECT,INSERT,UPDATE,DELETE')
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=:'staging_worker'
 AND NOT(rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) AS allowed \gset
\if :allowed
\else
 \echo 'Explicit isolated admin and restricted worker required'
 \quit 3
\endif
BEGIN;
CREATE TABLE fi_stage.review_state(
 report_id uuid PRIMARY KEY REFERENCES fi_stage.reports(id) ON DELETE CASCADE,
 record_id uuid NOT NULL REFERENCES fi_stage.records(id),
 reviewer_id text NOT NULL CHECK(reviewer_id~'^[0-9]{17,20}$'),
 report_digest text NOT NULL CHECK(report_digest~'^[a-f0-9]{64}$'),
 review_revision integer NOT NULL CHECK(review_revision>0),
 decision text NOT NULL CHECK(decision IN('changes-requested','review-recorded')),
 feedback text NOT NULL CHECK(feedback~'[^[:space:]]' AND char_length(feedback)<=2000 AND octet_length(feedback)<=8192)
);
CREATE TABLE fi_stage.review_requests(
 report_id uuid NOT NULL REFERENCES fi_stage.reports(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 fingerprint text NOT NULL CHECK(fingerprint~'^[a-f0-9]{64}$'),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 PRIMARY KEY(report_id,request_id)
);
REVOKE ALL ON fi_stage.review_state,fi_stage.review_requests FROM PUBLIC;
-- Existing report-payload redaction must also remove feedback and replay metadata.
-- The parent report may remain deletion-pending; new review payloads must not.
CREATE FUNCTION fi_stage.redact_review_payloads() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fi_stage AS $fn$
BEGIN
 DELETE FROM fi_stage.review_requests WHERE report_id=NEW.id;
 DELETE FROM fi_stage.review_state WHERE report_id=NEW.id;
 RETURN NEW;
END $fn$;
CREATE TRIGGER redact_review_payloads AFTER UPDATE OF body ON fi_stage.reports
 FOR EACH ROW WHEN(NEW.body IS NULL) EXECUTE FUNCTION fi_stage.redact_review_payloads();
REVOKE ALL ON FUNCTION fi_stage.redact_review_payloads() FROM PUBLIC;

CREATE FUNCTION fi_stage.record_review(p_actor text,p_guild text,p_record uuid,p_course text,p_exercise text,p_report uuid,p_request uuid,p_expected integer,p_decision text,p_feedback text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fi_stage AS $fn$
DECLARE r fi_stage.records;x fi_stage.reports;v fi_stage.review_state;q fi_stage.review_requests;
 has_review boolean;fp text;current_revision integer;answer jsonb;
BEGIN
 IF p_request IS NULL OR p_expected IS NULL OR p_expected<0 OR p_expected>=2147483647
 OR p_decision IS NULL OR p_decision NOT IN('changes-requested','review-recorded')
 OR coalesce(p_feedback,'')!~'[^[:space:]]' OR char_length(p_feedback)>2000 OR octet_length(p_feedback)>8192 THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 SELECT * INTO r FROM fi_stage.records WHERE id=p_record FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 IF p_actor IS DISTINCT FROM r.reviewer_id OR p_guild IS DISTINCT FROM r.guild_id
 OR p_course IS DISTINCT FROM r.course_key OR p_exercise IS DISTINCT FROM r.exercise_key THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 SELECT * INTO x FROM fi_stage.reports WHERE id=p_report AND record_id=r.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 -- Reuse the validated read guard AFTER both locks, including deadline/digest checks.
 PERFORM fi_stage.reviewer_read(p_actor,p_guild,p_record,p_course,p_exercise,p_report);
 SELECT * INTO v FROM fi_stage.review_state WHERE report_id=x.id FOR UPDATE;has_review:=FOUND;
 IF has_review AND (v.record_id IS DISTINCT FROM r.id OR v.report_digest IS DISTINCT FROM x.digest OR v.reviewer_id IS DISTINCT FROM r.reviewer_id) THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 fp:=encode(sha256(convert_to(jsonb_build_array(p_actor,x.digest,p_expected,p_decision,p_feedback)::text,'UTF8')),'hex');
 SELECT * INTO q FROM fi_stage.review_requests WHERE report_id=x.id AND request_id=p_request;
 IF FOUND THEN
 IF q.fingerprint IS DISTINCT FROM fp THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflict';END IF;
 RETURN q.result;
 END IF;
 current_revision:=CASE WHEN has_review THEN v.review_revision ELSE 0 END;
 IF current_revision IS DISTINCT FROM p_expected OR current_revision>=2147483647 THEN
 RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Conflict';END IF;
 IF (SELECT count(*) FROM fi_stage.review_requests WHERE report_id=x.id)>=50 THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 answer:=jsonb_build_object('ok',true,'reportId',x.id,'recordId',r.id,
 'submissionRevision',x.revision,'reviewRevision',current_revision+1,'status',p_decision,
 'expiresAtMs',(extract(epoch FROM x.expires_at)*1000)::bigint);
 INSERT INTO fi_stage.review_state(report_id,record_id,reviewer_id,report_digest,review_revision,decision,feedback)
 VALUES(x.id,r.id,r.reviewer_id,x.digest,current_revision+1,p_decision,p_feedback)
 ON CONFLICT(report_id) DO UPDATE SET review_revision=EXCLUDED.review_revision,decision=EXCLUDED.decision,feedback=EXCLUDED.feedback;
 INSERT INTO fi_stage.review_requests VALUES(x.id,p_request,fp,answer);
 RETURN answer;
END $fn$;
REVOKE ALL ON FUNCTION fi_stage.record_review(text,text,uuid,text,text,uuid,uuid,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fi_stage.record_review(text,text,uuid,text,text,uuid,uuid,integer,text,text) TO :"staging_worker";

CREATE FUNCTION fi_stage.learner_status(p_actor text,p_guild text,p_record uuid,p_course text,p_exercise text,p_report uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fi_stage AS $fn$
DECLARE r fi_stage.records;x fi_stage.reports;v fi_stage.review_state;t timestamptz;has_review boolean;
BEGIN
 SELECT * INTO r FROM fi_stage.records WHERE id=p_record FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 IF p_actor IS DISTINCT FROM r.learner_id OR p_guild IS DISTINCT FROM r.guild_id
 OR p_course IS DISTINCT FROM r.course_key OR p_exercise IS DISTINCT FROM r.exercise_key THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 SELECT * INTO x FROM fi_stage.reports WHERE id=p_report AND record_id=r.id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 t:=clock_timestamp();
 IF r.active IS DISTINCT FROM true OR NOT isfinite(r.valid_until) OR t>=r.valid_until
 OR r.journal->>'state' IS DISTINCT FROM 'available' OR NOT isfinite(r.journal_expires) OR t>=r.journal_expires
 OR x.source_channel IS DISTINCT FROM r.journal->>'channelId'
 OR NOT isfinite(x.submitted_at) OR NOT isfinite(x.expires_at) OR x.submitted_at>t OR t>=x.expires_at
 OR x.expires_at IS DISTINCT FROM x.submitted_at+interval '24 hours'
 OR x.body IS NULL OR x.digest IS DISTINCT FROM encode(sha256(convert_to(x.body,'UTF8')),'hex') THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 SELECT * INTO v FROM fi_stage.review_state WHERE report_id=x.id FOR SHARE;has_review:=FOUND;
 IF has_review AND (v.record_id IS DISTINCT FROM r.id OR v.report_digest IS DISTINCT FROM x.digest OR v.reviewer_id IS DISTINCT FROM r.reviewer_id) THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 RETURN jsonb_build_object('ok',true,'reportId',x.id,'recordId',r.id,'submissionRevision',x.revision,
 'reviewRevision',CASE WHEN has_review THEN v.review_revision ELSE 0 END,
 'status',CASE WHEN has_review THEN v.decision ELSE 'submitted' END,
 'expiresAtMs',(extract(epoch FROM x.expires_at)*1000)::bigint);
END $fn$;
REVOKE ALL ON FUNCTION fi_stage.learner_status(text,text,uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fi_stage.learner_status(text,text,uuid,text,text,uuid) TO :"staging_worker";
COMMIT;
