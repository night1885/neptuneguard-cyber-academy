BEGIN;

CREATE TABLE IF NOT EXISTS certification_agreements (
  version TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  content_sha256 TEXT NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certification_enrollments (
  discord_user_id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'awaiting_acknowledgment'
    CHECK (status IN ('awaiting_acknowledgment','pending','approved','denied','suspended','revoked')),
  agreement_version TEXT REFERENCES certification_agreements(version),
  acknowledged_at TIMESTAMPTZ,
  signature_method TEXT,
  signature_reference TEXT,
  learner_confirmed_read_at TIMESTAMPTZ,
  comprehension_passed_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status <> 'approved' OR
    (student_id IS NOT NULL AND acknowledged_at IS NOT NULL AND
     signature_method IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE OR REPLACE FUNCTION certification_preserve_student_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.student_id IS NOT NULL AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'An issued student ID cannot be replaced or removed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certification_student_id_immutable ON certification_enrollments;
CREATE TRIGGER certification_student_id_immutable
BEFORE UPDATE ON certification_enrollments
FOR EACH ROW EXECUTE FUNCTION certification_preserve_student_id();

CREATE TABLE IF NOT EXISTS certification_lab_requests (
  request_id UUID PRIMARY KEY,
  discord_user_id TEXT NOT NULL REFERENCES certification_enrollments(discord_user_id),
  lab_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','denied','suspended','revoked','expired')),
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  rules_version TEXT NOT NULL,
  rules_acknowledged_at TIMESTAMPTZ NOT NULL,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at),
  CHECK (status <> 'approved' OR
    (starts_at IS NOT NULL AND expires_at IS NOT NULL AND
     approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS certification_audit_events (
  event_id BIGSERIAL PRIMARY KEY,
  actor_discord_user_id TEXT NOT NULL,
  subject_discord_user_id TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS certification_enrollment_queue
  ON certification_enrollments(status, created_at);
CREATE INDEX IF NOT EXISTS certification_lab_queue
  ON certification_lab_requests(status, created_at);
CREATE INDEX IF NOT EXISTS certification_audit_subject
  ON certification_audit_events(subject_discord_user_id, created_at DESC);

COMMIT;
