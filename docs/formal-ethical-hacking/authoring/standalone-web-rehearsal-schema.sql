-- Candidate schema for a separately approved disposable database only.
-- Not an automatically applied migration; no roles or credentials are created.
BEGIN;
DO $$
BEGIN
  IF current_database() !~ '^ng_web_review_[a-z0-9_]{1,30}$' THEN
    RAISE EXCEPTION 'Disposable web review database required';
  END IF;
END;
$$;
CREATE SCHEMA web_review_progress;
REVOKE ALL ON SCHEMA web_review_progress FROM PUBLIC;
CREATE TABLE web_review_progress.bookmarks (
  guild_id text NOT NULL CHECK (guild_id ~ '^[0-9]{17,20}$'),
  actor_id text NOT NULL CHECK (actor_id ~ '^[0-9]{17,20}$'),
  course_key text NOT NULL CHECK (course_key = 'standalone-web-review'),
  content_revision text NOT NULL CHECK (content_revision ~ '^[a-f0-9]{64}$'),
  page_key text NOT NULL CHECK (page_key IN ('entry','http')),
  revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740990),
  PRIMARY KEY (guild_id,actor_id,course_key,content_revision)
);
REVOKE ALL ON TABLE web_review_progress.bookmarks FROM PUBLIC;
COMMIT;
