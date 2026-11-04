-- SOURCE CANDIDATE ONLY: explicit admin-owned fictional record, not enrollment authority.
-- Also supply record_id,guild_id,learner_id,reviewer_id,course_key,exercise_key,grant_until.
\set ON_ERROR_STOP on
SELECT current_database()=:'staging_database' AND current_database()<>:'production_database'
 AND current_user=:'staging_admin' AND current_user<>:'staging_worker' AS seed_allowed \gset
\if :seed_allowed
\else
 \quit 3
\endif
BEGIN;
INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,valid_until)
 VALUES(:'record_id'::uuid,:'guild_id',:'learner_id',:'reviewer_id',:'course_key',:'exercise_key',:'grant_until'::timestamptz);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM fi_stage.records WHERE NOT isfinite(valid_until) OR valid_until<=clock_timestamp()) THEN RAISE EXCEPTION 'Future finite explicit grant deadline required';END IF;END $$;
COMMIT;
