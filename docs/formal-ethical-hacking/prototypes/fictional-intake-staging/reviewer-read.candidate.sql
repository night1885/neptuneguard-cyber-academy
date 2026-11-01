-- OFFLINE CANDIDATE: not installed, PostgreSQL-parsed, or execution-validated.
-- Required psql variables: staging_database, production_database, staging_admin, staging_worker.
\set ON_ERROR_STOP on
SELECT current_database()=:'staging_database' AND current_database()<>:'production_database'
 AND current_user=:'staging_admin' AND current_user<>:'staging_worker'
 AND current_setting('server_version_num')::integer>=160000 AND fi_stage.contract()=1
 AND NOT has_schema_privilege(:'staging_worker','fi_stage','CREATE')
 AND NOT has_table_privilege(:'staging_worker','fi_stage.records','SELECT,INSERT,UPDATE,DELETE')
 AND NOT has_table_privilege(:'staging_worker','fi_stage.reports','SELECT,INSERT,UPDATE,DELETE')
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=:'staging_worker'
 AND NOT(rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) AS allowed \gset
\if :allowed
\else
 \echo 'Explicit isolated administrator and restricted worker required'
 \quit 3
\endif
BEGIN;
CREATE FUNCTION fi_stage.reviewer_read(p_actor text,p_guild text,p_record uuid,p_course text,p_exercise text,p_report uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fi_stage AS $fn$
DECLARE r fi_stage.records; x fi_stage.reports; t timestamptz;
BEGIN
 SELECT * INTO r FROM fi_stage.records WHERE id=p_record FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 IF p_actor IS DISTINCT FROM r.reviewer_id OR p_guild IS DISTINCT FROM r.guild_id
 OR p_course IS DISTINCT FROM r.course_key OR p_exercise IS DISTINCT FROM r.exercise_key
 OR p_actor IS NOT DISTINCT FROM r.learner_id THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 SELECT * INTO x FROM fi_stage.reports WHERE id=p_report AND record_id=r.id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 t:=clock_timestamp();
 IF r.active IS DISTINCT FROM true OR NOT isfinite(r.valid_until) OR t>=r.valid_until
 OR r.journal->>'state' IS DISTINCT FROM 'available' OR NOT isfinite(r.journal_expires) OR t>=r.journal_expires
 OR x.source_channel IS DISTINCT FROM r.journal->>'channelId'
 OR NOT isfinite(x.submitted_at) OR NOT isfinite(x.expires_at) OR x.submitted_at>t OR t>=x.expires_at
 OR x.expires_at IS DISTINCT FROM x.submitted_at+interval '24 hours'
 OR x.body IS NULL OR btrim(x.body)='' OR char_length(x.body)>2000 OR octet_length(x.body)>8192
 OR x.digest IS DISTINCT FROM encode(sha256(convert_to(x.body,'UTF8')),'hex') THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
 RETURN jsonb_build_object('ok',true,'reportId',x.id,'recordId',r.id,'learnerId',r.learner_id,
 'body',x.body,'digest',x.digest,'revision',x.revision,
 'submittedAtMs',(extract(epoch FROM x.submitted_at)*1000)::bigint,
 'expiresAtMs',(extract(epoch FROM x.expires_at)*1000)::bigint);
END $fn$;
REVOKE ALL ON FUNCTION fi_stage.reviewer_read(text,text,uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fi_stage.reviewer_read(text,text,uuid,text,text,uuid) TO :"staging_worker";
COMMIT;
