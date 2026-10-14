-- Proposed only; review and apply separately after migrations 001–004.
-- No legacy backfill, activation, or deletion.
BEGIN;
ALTER TABLE certification_enrollments
  ADD COLUMN IF NOT EXISTS age_eligibility_confirmed BOOLEAN,
  ADD COLUMN IF NOT EXISTS age_eligibility_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS age_policy_version TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conname='certification_age_evidence_complete'
      AND conrelid='certification_enrollments'::regclass) THEN
    ALTER TABLE certification_enrollments
      ADD CONSTRAINT certification_age_evidence_complete CHECK (
        (age_eligibility_confirmed IS NULL AND age_eligibility_confirmed_at IS NULL AND age_policy_version IS NULL)
        OR (age_eligibility_confirmed IS TRUE AND age_eligibility_confirmed_at IS NOT NULL
          AND age_policy_version IS NOT NULL
          AND age_policy_version ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$')
      );
  END IF;
END;
$$;
COMMENT ON COLUMN certification_enrollments.age_eligibility_confirmed IS
  'Learner self-reported meeting the enrollment age policy; not independent age verification. NULL is no evidence.';
COMMENT ON COLUMN certification_enrollments.age_eligibility_confirmed_at IS
  'Confirmation timestamp to be assigned by server-side submission SQL, never supplied by the learner.';
COMMENT ON COLUMN certification_enrollments.age_policy_version IS
  'Age-policy version associated with the self-reported eligibility confirmation; no exact age or birth date.';
COMMIT;
