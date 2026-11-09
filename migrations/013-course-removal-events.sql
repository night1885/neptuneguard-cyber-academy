-- Source candidate only. Requires 001-007 in the selected schema. No grants or live application.
BEGIN;
CREATE TABLE certification_course_removals (
 discord_user_id text NOT NULL,course_key text NOT NULL,assigned_at timestamptz NOT NULL,
 removed_at timestamptz NOT NULL,removed_by text NOT NULL CHECK(removed_by ~ '^[0-9]{17,20}$'),reference uuid NOT NULL UNIQUE,
 PRIMARY KEY(discord_user_id,course_key),
 FOREIGN KEY(discord_user_id,course_key) REFERENCES certification_course_enrollments(discord_user_id,course_key) ON DELETE RESTRICT,
 CHECK(removed_at>=assigned_at AND removed_at<TIMESTAMPTZ '9999-01-01 00:00:00+00' AND removed_at=date_trunc('milliseconds',removed_at))
);
CREATE FUNCTION certification_guard_course_removal() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE assigned timestamptz;state text;
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Immutable course removal event'; END IF;
 EXECUTE pg_catalog.format('SELECT assigned_at,status FROM %I.certification_course_enrollments WHERE discord_user_id=$1 AND course_key=$2 FOR UPDATE',TG_TABLE_SCHEMA) INTO assigned,state USING NEW.discord_user_id,NEW.course_key;
 IF assigned IS NULL OR state IS DISTINCT FROM 'active' OR NEW.assigned_at IS DISTINCT FROM assigned OR NEW.removed_at>pg_catalog.clock_timestamp() THEN RAISE EXCEPTION 'Current active course assignment and original event time required'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER certification_course_removal_immutable BEFORE INSERT OR UPDATE ON certification_course_removals FOR EACH ROW EXECUTE FUNCTION certification_guard_course_removal();
CREATE FUNCTION certification_block_removed_completion() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE removed boolean;
BEGIN
 IF NEW.status='completed' THEN
  EXECUTE pg_catalog.format('SELECT EXISTS(SELECT 1 FROM %I.certification_course_removals WHERE discord_user_id=$1 AND course_key=$2)',TG_TABLE_SCHEMA) INTO removed USING NEW.discord_user_id,NEW.course_key;
  IF removed THEN RAISE EXCEPTION 'Removed course cannot be completed'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER certification_course_removed_completion_guard BEFORE UPDATE ON certification_course_enrollments FOR EACH ROW EXECUTE FUNCTION certification_block_removed_completion();
REVOKE ALL ON certification_course_removals FROM PUBLIC;
REVOKE ALL ON FUNCTION certification_guard_course_removal() FROM PUBLIC;
REVOKE ALL ON FUNCTION certification_block_removed_completion() FROM PUBLIC;
COMMENT ON TABLE certification_course_removals IS 'Original administrator course-removal evidence, not completion, erasure, or certificate verification. Parent cleanup must explicitly account for this dependency.';
COMMIT;
