-- Detached candidate. Required psql variables: staging_database, production_database, staging_admin, staging_worker.
\set ON_ERROR_STOP on
SELECT current_database()=:'staging_database' AND current_database()<>:'production_database'
 AND current_user=:'staging_admin' AND current_user<>:'staging_worker'
 AND fi_stage.contract()=1 AND current_setting('server_version_num')::integer>=160000
 AND to_regprocedure('fi_stage.record_review(text,text,uuid,text,text,uuid,uuid,integer,text,text)') IS NOT NULL
 AND NOT has_schema_privilege(:'staging_worker','fi_stage','CREATE')
 AND NOT has_table_privilege(:'staging_worker','fi_stage.reports','SELECT,INSERT,UPDATE,DELETE')
 AND NOT has_table_privilege(:'staging_worker','fi_stage.review_state','SELECT,INSERT,UPDATE,DELETE')
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=:'staging_worker' AND NOT(rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) AS allowed \gset
\if :allowed
\else
 \echo 'Explicit isolated admin and restricted worker required'
 \quit 3
\endif
BEGIN;
CREATE FUNCTION fi_stage.review_authority(p_actor text,p_guild text,p_record uuid,p_course text,p_exercise text,p_report uuid,p_purpose text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fi_stage AS $fn$
DECLARE r fi_stage.records;x fi_stage.reports;v fi_stage.review_state;t timestamptz;has_review boolean;
BEGIN
 IF p_purpose IS NULL OR p_purpose NOT IN('review','status') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 SELECT * INTO r FROM fi_stage.records WHERE id=p_record FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 SELECT * INTO x FROM fi_stage.reports WHERE id=p_report AND record_id=r.id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 IF p_purpose='review' THEN
 PERFORM fi_stage.reviewer_read(p_actor,p_guild,p_record,p_course,p_exercise,p_report);
 ELSE
 PERFORM fi_stage.learner_status(p_actor,p_guild,p_record,p_course,p_exercise,p_report);
 END IF;
 SELECT * INTO v FROM fi_stage.review_state WHERE report_id=x.id FOR SHARE;has_review:=FOUND;
 IF has_review AND (v.record_id IS DISTINCT FROM r.id OR v.report_digest IS DISTINCT FROM x.digest OR v.reviewer_id IS DISTINCT FROM r.reviewer_id) THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 t:=clock_timestamp();
 IF t>=r.valid_until OR t>=x.expires_at THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 -- Floor authority deadlines: local metadata must never round a grant later.
 RETURN jsonb_build_object('ok',true,'actorId',p_actor,'recordId',r.id,'reportId',x.id,'purpose',p_purpose,
 'validUntilMs',floor(extract(epoch FROM r.valid_until)*1000)::bigint,
 'expiresAtMs',floor(extract(epoch FROM x.expires_at)*1000)::bigint,'digest',x.digest,
 'submissionRevision',x.revision,'reviewRevision',CASE WHEN has_review THEN v.review_revision ELSE 0 END,
 'status',CASE WHEN has_review THEN v.decision ELSE 'submitted' END);
END $fn$;
REVOKE ALL ON FUNCTION fi_stage.review_authority(text,text,uuid,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fi_stage.review_authority(text,text,uuid,text,text,uuid,text) TO :"staging_worker";
COMMIT;
