-- Proposed migration only; apply separately after migrations 001 through 005.
-- Adds no closure defaults, backfill, deletion, scheduler, grants, or runtime wiring.
BEGIN;

ALTER TABLE certification_enrollments
  ADD COLUMN IF NOT EXISTS application_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS application_closed_by TEXT,
  ADD COLUMN IF NOT EXISTS application_closed_as TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='certification_application_closure_complete'
      AND conrelid='certification_enrollments'::regclass
  ) THEN
    ALTER TABLE certification_enrollments
      ADD CONSTRAINT certification_application_closure_complete CHECK (
        (application_closed_at IS NULL AND application_closed_by IS NULL AND application_closed_as IS NULL)
        OR (
          application_closed_at IS NOT NULL AND
          application_closed_by IS NOT NULL AND
          application_closed_as IS NOT NULL AND
          status = 'denied' AND student_id IS NULL AND
          application_closed_by ~ '^[0-9]{17,20}$' AND
          application_closed_as IN ('denied','withdrawn','abandoned') AND
          application_closed_at >= TIMESTAMPTZ '1970-01-01 00:00:00+00' AND
          application_closed_at < TIMESTAMPTZ '9999-01-01 00:00:00+00' AND
          application_closed_at = date_trunc('milliseconds', application_closed_at)
        )
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION certification_preserve_application_closure()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.application_closed_at IS NOT NULL AND (
    NEW.application_closed_at IS DISTINCT FROM OLD.application_closed_at OR
    NEW.application_closed_by IS DISTINCT FROM OLD.application_closed_by OR
    NEW.application_closed_as IS DISTINCT FROM OLD.application_closed_as
  ) THEN
    RAISE EXCEPTION 'A recorded application closure cannot be reset or replaced';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certification_application_closure_immutable ON certification_enrollments;
CREATE TRIGGER certification_application_closure_immutable
BEFORE UPDATE ON certification_enrollments
FOR EACH ROW EXECUTE FUNCTION certification_preserve_application_closure();

COMMENT ON COLUMN certification_enrollments.application_closed_at IS
  'Explicit administrative closure timestamp at millisecond precision. NULL means no recorded closure, even for denied applications. Not an automatic inactivity timer.';
COMMENT ON COLUMN certification_enrollments.application_closed_by IS
  'Discord actor ID recorded by a future owner-authorized closure transaction. ID syntax does not establish authorization.';
COMMENT ON COLUMN certification_enrollments.application_closed_as IS
  'denied, withdrawn, or abandoned. A closed application uses the existing non-authorizing denied status; presentation must distinguish the closure category. Issued-ID cases require separate review.';

COMMIT;
