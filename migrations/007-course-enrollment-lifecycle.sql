-- Proposed only; apply separately after migrations 001-006. No backfill, grants, or deletion.
BEGIN;

CREATE TABLE IF NOT EXISTS certification_course_enrollments (
  discord_user_id TEXT NOT NULL REFERENCES certification_enrollments(discord_user_id) ON DELETE RESTRICT
    CHECK (discord_user_id ~ '^[0-9]{17,20}$'),
  course_key TEXT NOT NULL CHECK (course_key ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  status TEXT NOT NULL CHECK (status IN ('active','completed')),
  assigned_at TIMESTAMPTZ NOT NULL,
  assigned_by TEXT NOT NULL CHECK (assigned_by ~ '^[0-9]{17,20}$'),
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  PRIMARY KEY (discord_user_id,course_key),
  CHECK (assigned_at >= TIMESTAMPTZ '1970-01-01 00:00:00+00'
    AND assigned_at < TIMESTAMPTZ '9999-01-01 00:00:00+00'
    AND assigned_at = date_trunc('milliseconds',assigned_at)),
  CHECK ((status='active' AND completed_at IS NULL AND completed_by IS NULL) OR
    (status='completed' AND completed_at IS NOT NULL AND completed_by IS NOT NULL
      AND completed_by ~ '^[0-9]{17,20}$' AND completed_at >= assigned_at
      AND completed_at < TIMESTAMPTZ '9999-01-01 00:00:00+00'
      AND completed_at = date_trunc('milliseconds',completed_at)))
);

CREATE OR REPLACE FUNCTION certification_preserve_course_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.discord_user_id IS DISTINCT FROM OLD.discord_user_id OR
     NEW.course_key IS DISTINCT FROM OLD.course_key OR
     NEW.assigned_at IS DISTINCT FROM OLD.assigned_at OR
     NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
    RAISE EXCEPTION 'A course assignment identity cannot be replaced';
  END IF;
  IF OLD.status='completed' AND (NEW.status IS DISTINCT FROM OLD.status OR
     NEW.completed_at IS DISTINCT FROM OLD.completed_at OR NEW.completed_by IS DISTINCT FROM OLD.completed_by) THEN
    RAISE EXCEPTION 'An admin-confirmed course completion cannot be reset or replaced';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certification_course_lifecycle_immutable ON certification_course_enrollments;
CREATE TRIGGER certification_course_lifecycle_immutable
BEFORE UPDATE ON certification_course_enrollments
FOR EACH ROW EXECUTE FUNCTION certification_preserve_course_lifecycle();

COMMENT ON TABLE certification_course_enrollments IS
  'Minimal per-course access assignment and designated-admin completion metadata. Not lesson progress, quiz history, XP, badges, grades, or certificate awards. Parent deletion is restricted; related-record cleanup requires separate review.';

COMMIT;
