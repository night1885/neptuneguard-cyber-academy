-- Proposed migration only; apply separately after migrations 001 through 004.
-- Does not backfill, convert, delete, or approve any learner record.
BEGIN;

ALTER TABLE certification_enrollments
  ADD COLUMN IF NOT EXISTS age_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS age_declared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS age_declaration_version TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='certification_account_acknowledgment_required'
      AND conrelid='certification_enrollments'::regclass
  ) THEN
    ALTER TABLE certification_enrollments
      ADD CONSTRAINT certification_account_acknowledgment_required CHECK (
        signature_method IS DISTINCT FROM 'discord_account' OR (
          discord_user_id ~ '^[0-9]{17,20}$' AND
          acknowledgment_name IS NULL AND signature_reference IS NULL AND
          agreement_version IS NOT NULL AND char_length(agreement_version) BETWEEN 1 AND 100 AND
          agreement_content_sha256 IS NOT NULL AND agreement_content_sha256 ~ '^[a-f0-9]{64}$' AND
          acknowledged_at IS NOT NULL AND learner_confirmed_read_at IS NOT NULL AND
          comprehension_passed_at IS NOT NULL AND
          comprehension_check_version IS NOT NULL AND char_length(comprehension_check_version) > 0 AND
          age_eligible IS TRUE AND age_declared_at IS NOT NULL AND
          age_declaration_version IS NOT NULL AND age_declaration_version = 'adult-18-v1'
        )
      );
  END IF;
END;
$$;

COMMENT ON COLUMN certification_enrollments.age_eligible IS
  'Self-declared eligibility for the Academy age threshold, not actual age, birth date, or independent verification.';
COMMENT ON COLUMN certification_enrollments.age_declaration_version IS
  'adult-18-v1 means the learner answered Yes to being 18 years of age or older.';

COMMIT;
