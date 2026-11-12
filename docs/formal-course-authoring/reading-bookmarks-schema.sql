-- Candidate schema only. NOT an applied migration. Use the reviewed application schema/search_path.
BEGIN;
CREATE TABLE formal_reading_bookmarks (
  discord_user_id TEXT NOT NULL CHECK (discord_user_id ~ '^[0-9]{17,20}$'),
  course_key TEXT NOT NULL CHECK (course_key IN ('ethical-hacking','incident-response')),
  student_id TEXT NOT NULL CHECK (length(btrim(student_id)) BETWEEN 1 AND 100),
  revision TEXT NOT NULL CHECK (revision ~ '^[a-f0-9]{64}$'),
  lesson_key TEXT NOT NULL CHECK (lesson_key ~ '^[A-Za-z][A-Za-z0-9-]{0,79}$'),
  page_index INTEGER NOT NULL CHECK (page_index BETWEEN 0 AND 9999),
  version INTEGER NOT NULL CHECK (version BETWEEN 1 AND 2147483646),
  updated_at TIMESTAMPTZ NOT NULL CHECK (updated_at >= TIMESTAMPTZ '1970-01-01 00:00:00+00' AND updated_at < TIMESTAMPTZ '9999-01-01 00:00:00+00' AND updated_at=date_trunc('milliseconds',updated_at)),
  PRIMARY KEY (discord_user_id,course_key),
  FOREIGN KEY (discord_user_id,course_key) REFERENCES certification_course_enrollments(discord_user_id,course_key) ON DELETE RESTRICT
);
COMMENT ON TABLE formal_reading_bookmarks IS 'Reading location only; no completion, evidence, grade, XP, badge or certificate. No automatic retention/deletion policy; review separately before activation.';
COMMIT;
