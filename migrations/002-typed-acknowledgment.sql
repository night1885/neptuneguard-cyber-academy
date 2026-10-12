-- Proposed migration only. Review and apply separately after 001-certification.sql.
-- This does not convert legacy signing records or delete any stored information.
BEGIN;

ALTER TABLE certification_enrollments
  ADD COLUMN IF NOT EXISTS acknowledgment_name TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='certification_typed_name_required'
      AND conrelid='certification_enrollments'::regclass
  ) THEN
    ALTER TABLE certification_enrollments
      ADD CONSTRAINT certification_typed_name_required CHECK (
        signature_method IS DISTINCT FROM 'typed_name' OR
        (acknowledgment_name IS NOT NULL AND
         char_length(btrim(acknowledgment_name)) BETWEEN 1 AND 200)
      );
  END IF;
END;
$$;

COMMENT ON COLUMN certification_enrollments.acknowledgment_name IS
  'Typed learner acknowledgment name; not an uploaded document or identity verification. Personal-data retention policy requires separate approval.';

COMMIT;
