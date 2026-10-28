-- Owned disposable rehearsal fixture only. No production identity adapter.
BEGIN;
DO $$ BEGIN
  IF current_database()<>'synthetic_review_test' OR current_user<>'synthetic_review_admin'
    OR current_setting('server_version_num')::int/10000 NOT IN (16,18)
    OR to_regclass('synthetic_review_ci.report_sources') IS NULL THEN
    RAISE EXCEPTION 'Explicit source-provenance CI required';
  END IF;
  IF EXISTS(SELECT 1 FROM synthetic_review_ci.records) THEN RAISE EXCEPTION 'Unpopulated fixture required'; END IF;
END $$;
CREATE FUNCTION synthetic_review_ci.rehearsal_binding(a text,i uuid,op text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,synthetic_review_ci AS $$
DECLARE r synthetic_review_ci.records; v integer;
BEGIN
  IF op IS NULL OR op NOT IN ('submit','review') THEN RAISE EXCEPTION 'Unavailable'; END IF;
  r:=synthetic_review_ci.lock_authorized(a,'demo-workspace','demo-ethical-hacking','demo-first-practical',i,op);
  SELECT revision INTO v FROM synthetic_review_ci.report_state WHERE record_id=i;
  RETURN jsonb_build_object('ok',true,'recordId',r.id,'learnerId',r.owner,
    'courseKey',r.course,'exerciseKey',r.exercise,'revision',coalesce(v,0));
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'reason','unavailable');
END $$;
REVOKE ALL ON FUNCTION synthetic_review_ci.rehearsal_binding(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION synthetic_review_ci.rehearsal_binding(text,uuid,text) TO synthetic_review_worker;
COMMIT;
