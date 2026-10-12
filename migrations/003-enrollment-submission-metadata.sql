-- Proposed only; apply separately after migrations 001 and 002.
-- No legacy record conversion, activation, or deletion.
BEGIN;
ALTER TABLE certification_enrollments
  ADD COLUMN IF NOT EXISTS agreement_content_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS comprehension_check_version TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conname='certification_acknowledgment_hash_format'
      AND conrelid='certification_enrollments'::regclass) THEN
    ALTER TABLE certification_enrollments
      ADD CONSTRAINT certification_acknowledgment_hash_format
      CHECK (agreement_content_sha256 IS NULL OR agreement_content_sha256 ~ '^[a-f0-9]{64}$');
  END IF;
END;
$$;
COMMENT ON COLUMN certification_enrollments.agreement_content_sha256 IS
  'Exact agreement content hash captured at learner submission; legacy records remain NULL.';
COMMENT ON COLUMN certification_enrollments.comprehension_check_version IS
  'Server-configured comprehension check version; legacy records remain NULL.';
COMMIT;
