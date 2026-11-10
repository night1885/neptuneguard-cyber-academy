-- SOURCE CANDIDATE ONLY. Requires migrations 007 and 012.
-- Not installed by this commit. No backfill, runtime integration or production grants.
BEGIN;
ALTER TABLE public.certification_course_enrollments
 ADD CONSTRAINT certification_course_assignment_episode
 UNIQUE (discord_user_id,course_key,assigned_at);
ALTER TABLE formal_review.work
 ADD CONSTRAINT formal_work_binding_identity UNIQUE (id,learner_id,course_key);
CREATE TABLE formal_review.assignment_bindings (
 work_id uuid PRIMARY KEY,
 learner_id text NOT NULL,
 course_key text NOT NULL,
 assigned_at timestamptz NOT NULL,
 FOREIGN KEY (work_id,learner_id,course_key)
 REFERENCES formal_review.work(id,learner_id,course_key) ON DELETE RESTRICT,
 FOREIGN KEY (learner_id,course_key,assigned_at)
 REFERENCES public.certification_course_enrollments(discord_user_id,course_key,assigned_at) ON DELETE RESTRICT
);
CREATE TRIGGER formal_assignment_binding_immutable
 BEFORE UPDATE ON formal_review.assignment_bindings
 FOR EACH ROW EXECUTE FUNCTION formal_review.deny_update();
REVOKE ALL ON formal_review.assignment_bindings FROM PUBLIC;
COMMENT ON TABLE formal_review.assignment_bindings IS
 'Unactivated identity-link candidate only. Does not prove consent, actor authority, assignment eligibility or present access. No backfill. Runtime and cleanup integration require separate review and acceptance.';
COMMIT;
