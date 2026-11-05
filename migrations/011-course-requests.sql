-- Source proposal only. Apply separately after reviewed migrations 001-010.
BEGIN;
CREATE TABLE certification_course_requests (
  request_id UUID PRIMARY KEY,
  discord_user_id TEXT NOT NULL REFERENCES certification_enrollments(discord_user_id) ON DELETE RESTRICT,
  course_key TEXT NOT NULL CHECK (course_key ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  status TEXT NOT NULL CHECK (status IN ('pending','approved','denied')),
  requested_at TIMESTAMPTZ NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  CHECK (discord_user_id ~ '^[0-9]{17,20}$'),
  CHECK (isfinite(requested_at) AND requested_at >= TIMESTAMPTZ '1970-01-01' AND requested_at < TIMESTAMPTZ '9999-01-01' AND requested_at = date_trunc('milliseconds', requested_at)),
  CHECK ((status='pending' AND reviewed_at IS NULL AND reviewed_by IS NULL) OR
    (status IN ('approved','denied') AND reviewed_at IS NOT NULL AND isfinite(reviewed_at) AND reviewed_at >= requested_at AND reviewed_at < TIMESTAMPTZ '9999-01-01' AND reviewed_at = date_trunc('milliseconds',reviewed_at) AND reviewed_by IS NOT NULL AND reviewed_by ~ '^[0-9]{17,20}$'))
);
CREATE UNIQUE INDEX certification_one_pending_course_request
  ON certification_course_requests(discord_user_id,course_key) WHERE status='pending';
CREATE FUNCTION certification_preserve_course_request() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.request_id IS DISTINCT FROM OLD.request_id OR NEW.discord_user_id IS DISTINCT FROM OLD.discord_user_id OR NEW.course_key IS DISTINCT FROM OLD.course_key OR NEW.requested_at IS DISTINCT FROM OLD.requested_at THEN
    RAISE EXCEPTION 'Course request identity is immutable';
  END IF;
  IF OLD.status <> 'pending' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Reviewed course request is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER certification_course_request_immutable BEFORE UPDATE ON certification_course_requests
  FOR EACH ROW EXECUTE FUNCTION certification_preserve_course_request();
COMMENT ON TABLE certification_course_requests IS 'One course per request. Pending requests grant no access. No report content; retention/cleanup requires separate review.';
COMMIT;
