# Per-course lifecycle — staged backend only

Status: proposed schema and backend preparation. No live migration/grant, course assignment/completion, runtime authorization change, certificate award, deletion, merge, deployment, or activation occurs in this patch.

Migration 007 adds certification_course_enrollments with Discord account/course key, active/completed status, assigning admin/time, and completing admin/time. It stores no lesson progress, quiz answers, XP, badges, grades, legal names, or certificate award. It does not assign any courses to historical enrollments. Original assignment identity and confirmed completion are immutable; re-enrollment/correction/cohort procedures are not implemented.

The lifecycle factory requires an explicit trusted course-key allowlist. Actual course/section mapping must be reviewed before runtime integration; the training-readiness section is not silently equated with a curriculum course. Allowlist management must preserve a reviewed way to complete retired assigned courses. No automatic assignment of every registry course is approved or performed.

Owner-authorized assignCourses requires a current approved account acknowledgment, agreement/check configuration, and permanent ID. It can assign an explicit batch atomically with its audit event; duplicate active assignments are no-op retries. It does not reopen completed courses or add new courses after all existing assignments are complete; new enrollment requires separate review.

Owner-authorized completeCourse requires an existing course assignment and prior approved enrollment. It can administratively record completion while the shared enrollment is approved, suspended, or revoked, without reinstating access or requiring a fresh acknowledgment merely to end a course. Completion and audit are atomic; retries preserve the original completion timestamp and do not duplicate audit events. Parent-row locking serializes assignment/completion for the same student.

getCourseAuthorization checks the specific course is active and the shared enrollment remains currently approved/complete. A completed course is denied by this new reader while another assigned active course can remain authorized. Missing schema must not trigger fallback to global authorization. The existing runtime still uses its previous global authorization path; this new reader is not connected yet. Do not enable or deploy completion functionality before all applicable access paths use the reviewed per-course checks.

allAssignedCoursesCompleted is true only for a nonempty assignment set with no active courses. It is an informational completion condition, not final deletion eligibility or deletion permission. A student with no assignments is not treated as all-complete. Shared enrollment status/ID are preserved. Parent deletion is restricted by the course foreign key: a future authorized purge must review and explicitly remove applicable child records in the correct order, without cascading unrelated labs/audits.

Unit tests reject unauthorized/invalid requests before database access. Disposable PostgreSQL 16/18 tests cover no-backfill/reapplication, independent course authorization, all-complete handling, concurrency, retry, audit rollback, suspended completion, foreign-key protection, and immutable metadata. New passing results are not claimed before CI execution.

Remaining work includes actual course/section mapping, restricted-role/readiness checks, confirmed admin assignment/completion UI, runtime authorization integration including existing section sessions, related-record deletion review and enforcement, provider/backup handling, final notices, and target-environment acceptance.
