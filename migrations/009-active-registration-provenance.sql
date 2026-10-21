-- Proposed only: apply separately after migrations 001-008.
-- No backfill, grants, audit deletion, scheduler, or runtime activation.
BEGIN;

ALTER TABLE certification_enrollments
  ADD COLUMN IF NOT EXISTS registration_owner_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid='certification_enrollments'::regclass
      AND attname='registration_owner_id' AND attnum>0 AND NOT attisdropped
      AND atttypid='pg_catalog.text'::regtype AND NOT attnotnull
      AND NOT atthasdef AND attgenerated='' AND attidentity=''
  ) THEN
    RAISE EXCEPTION 'Registration provenance must be nullable text without a default';
  END IF;
END;
$$;

ALTER TABLE certification_enrollments
  DROP CONSTRAINT IF EXISTS certification_active_registration_owner;
ALTER TABLE certification_enrollments
  ADD CONSTRAINT certification_active_registration_owner CHECK (
    registration_owner_id IS NULL OR (
      registration_owner_id ~ '^[0-9]{17,20}$' AND
      discord_user_id ~ '^[0-9]{17,20}$' AND
      status='awaiting_acknowledgment' AND student_id IS NULL AND
      approved_by IS NULL AND approved_at IS NULL AND
      acknowledgment_name IS NULL AND signature_reference IS NULL
    )
  );

CREATE OR REPLACE FUNCTION certification_guard_registration_provenance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD.registration_owner_id IS NOT NULL AND
       NEW.discord_user_id IS DISTINCT FROM OLD.discord_user_id THEN
      RAISE EXCEPTION 'An active registration invitation target cannot be changed';
    END IF;
    IF NEW.registration_owner_id IS DISTINCT FROM OLD.registration_owner_id AND
       (NEW.registration_owner_id IS NOT NULL OR NEW.status='awaiting_acknowledgment') THEN
      RAISE EXCEPTION 'Active registration provenance is immutable';
    END IF;
    IF NEW.status IS DISTINCT FROM 'awaiting_acknowledgment' THEN
      NEW.registration_owner_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certification_registration_provenance_guard ON certification_enrollments;
CREATE TRIGGER certification_registration_provenance_guard
BEFORE INSERT OR UPDATE ON certification_enrollments
FOR EACH ROW EXECUTE FUNCTION certification_guard_registration_provenance();

COMMENT ON COLUMN certification_enrollments.registration_owner_id IS
  'Owner Discord ID for an active clean awaiting invitation, assigned only at INSERT by a separately authorized registration service. Immutable while awaiting; cleared from this live column when status leaves awaiting. NULL does not establish an invitation. No historical audit backfill or identity/access authorization is implied. Other audit/approval/closure metadata and provider copies are independent.';

COMMIT;
