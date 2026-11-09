BEGIN;
CREATE SCHEMA formal_review;
CREATE TABLE formal_review.work (
 id uuid PRIMARY KEY, guild_id text NOT NULL CHECK(guild_id ~ '^[0-9]{17,20}$'),
 learner_id text NOT NULL CHECK(learner_id ~ '^[0-9]{17,20}$'), student_id text NOT NULL CHECK(length(btrim(student_id)) BETWEEN 1 AND 100),
 channel_id text NOT NULL CHECK(channel_id ~ '^[0-9]{17,20}$'), course_key text NOT NULL CHECK(course_key='ethical-hacking-reading'),
 exercise_key text NOT NULL CHECK(exercise_key ~ '^EH-[A-Z]+-[A-Z0-9-]{2,40}$'),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0), state text NOT NULL DEFAULT 'working' CHECK(state IN ('working','submitted','changes-requested','review-recorded')),
 created_ms bigint NOT NULL CHECK(created_ms BETWEEN 0 AND 8639999913600000),
 expires_ms bigint NOT NULL CHECK(expires_ms>created_ms AND expires_ms<=8640000000000000),
 UNIQUE(guild_id,channel_id), CHECK((revision=0 AND state='working' AND expires_ms=created_ms+86400000) OR (revision>0 AND state<>'working'))
);
CREATE TABLE formal_review.reports (
 id uuid PRIMARY KEY,work_id uuid NOT NULL REFERENCES formal_review.work(id) ON DELETE RESTRICT,
 revision integer NOT NULL CHECK(revision>0),body text NOT NULL,body_digest text NOT NULL,
 source_channel_id text NOT NULL CHECK(source_channel_id ~ '^[0-9]{17,20}$'),source_message_id text NOT NULL CHECK(source_message_id ~ '^[0-9]{17,20}$'),
 source_created_ms bigint NOT NULL CHECK(source_created_ms>=0),submitted_ms bigint NOT NULL,expires_ms bigint NOT NULL,
 CONSTRAINT formal_report_text CHECK(length(btrim(body))>0 AND char_length(body)<=2000 AND octet_length(body)<=8192),
 CONSTRAINT formal_report_digest CHECK(body_digest=encode(sha256(convert_to(body,'UTF8')),'hex')),
 CONSTRAINT formal_report_deadline CHECK(submitted_ms>=source_created_ms AND submitted_ms<source_created_ms+86400000 AND expires_ms=submitted_ms+86400000 AND expires_ms<=8640000000000000),
 UNIQUE(work_id,revision),UNIQUE(work_id,source_channel_id,source_message_id),UNIQUE(id,work_id,revision,expires_ms),UNIQUE(id,work_id,expires_ms)
);
CREATE TABLE formal_review.reviews (
 report_id uuid PRIMARY KEY,work_id uuid NOT NULL,expected_revision integer NOT NULL,new_revision integer NOT NULL,
 reviewer_id text NOT NULL CHECK(reviewer_id ~ '^[0-9]{17,20}$'),decision text NOT NULL CHECK(decision IN ('changes-requested','review-recorded')),
 feedback text NOT NULL CHECK(length(btrim(feedback))>0 AND char_length(feedback)<=2000 AND octet_length(feedback)<=8192),expires_ms bigint NOT NULL,
 CHECK(new_revision=expected_revision+1),
 FOREIGN KEY(report_id,work_id,expected_revision,expires_ms) REFERENCES formal_review.reports(id,work_id,revision,expires_ms) ON DELETE CASCADE
);
CREATE TABLE formal_review.operations (
 work_id uuid NOT NULL,actor_id text NOT NULL CHECK(actor_id ~ '^[0-9]{17,20}$'),operation_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('submit','review')),digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),report_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0),expires_ms bigint NOT NULL,PRIMARY KEY(work_id,actor_id,operation_id),
 FOREIGN KEY(report_id,work_id,expires_ms) REFERENCES formal_review.reports(id,work_id,expires_ms) ON DELETE CASCADE
);
CREATE FUNCTION formal_review.preserve_work() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF (NEW.id,NEW.guild_id,NEW.learner_id,NEW.student_id,NEW.channel_id,NEW.course_key,NEW.exercise_key,NEW.created_ms) IS DISTINCT FROM
    (OLD.id,OLD.guild_id,OLD.learner_id,OLD.student_id,OLD.channel_id,OLD.course_key,OLD.exercise_key,OLD.created_ms) OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Immutable work identity or invalid revision'; END IF;
 IF NOT ((OLD.state IN ('working','changes-requested') AND NEW.state='submitted' AND NEW.expires_ms>=OLD.expires_ms) OR
         (OLD.state='submitted' AND NEW.state IN ('changes-requested','review-recorded') AND NEW.expires_ms=OLD.expires_ms)) THEN RAISE EXCEPTION 'Invalid work transition'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER formal_work_immutable BEFORE UPDATE ON formal_review.work FOR EACH ROW EXECUTE FUNCTION formal_review.preserve_work();
CREATE FUNCTION formal_review.deny_update() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'Immutable review record'; END; $$;
CREATE TRIGGER formal_report_immutable BEFORE UPDATE ON formal_review.reports FOR EACH ROW EXECUTE FUNCTION formal_review.deny_update();
CREATE TRIGGER formal_feedback_immutable BEFORE UPDATE ON formal_review.reviews FOR EACH ROW EXECUTE FUNCTION formal_review.deny_update();
CREATE TRIGGER formal_operation_immutable BEFORE UPDATE ON formal_review.operations FOR EACH ROW EXECUTE FUNCTION formal_review.deny_update();
REVOKE ALL ON SCHEMA formal_review FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA formal_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA formal_review FROM PUBLIC;
COMMENT ON SCHEMA formal_review IS 'Source candidate only. Separate approval required before migration, grants, source collection or runtime activation. No purge or external erasure is implemented.';
COMMIT;
