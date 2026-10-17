# Course section access — staged mapping and entry factory

Status: repository preparation only. Existing runtime routes and default section behavior remain unchanged. No live configuration, migration/grant, course assignment/completion, deletion, merge, deployment, or activation is performed by this patch.

COURSE_SECTION_CATALOG projects only key/title metadata from the existing course registry; COURSE_SECTION_KEYS uses those exact keys as the proposed curriculum section identifiers. The separate training-readiness introduction is explicitly excluded rather than silently treated as a curriculum course. Unknown keys fail closed. No learner-course records are assigned or backfilled by this mapping.

createCourseSectionAuthorization uses the new per-course lifecycle reader with the registry allowlist. Each request checks current course-specific authorization; there is no positive authorization cache or fallback to the global enrollment reader. It does not query the old learner profile, progress, XP, badge, or quiz-history tables.

The existing section identity/login helpers now accept an optional trusted authorizeCourseSection callback. When provided, verification requires both the account-bound permanent ID and returned course_key matching the exact requested section. Callback errors deny entry. Without this callback, existing enrollment-level readiness-section behavior is preserved.

createCourseSectionLoginHandler supplies the fixed curriculum allowlist and course authorizer; caller options cannot replace those two controls. It reuses the existing owner-of-account/server-bound, expiring single-use modal challenge and queries current course access at submission time. Completing the course after opening a modal blocks entry, while another assigned active course can remain eligible. The verification callback is an integration point, not an implemented learner content renderer or runtime grant.

This patch does not connect the new entry factory to runtime or alter existing page-session checks. Runtime integration must also recheck course-specific access on every protected page/action, including previously opened section sessions. Completion controls must stay unexposed until that integration and readiness/restricted-role acceptance are complete.

Inspection found legacy academy handlers still read/write learner profiles, activity/progress, XP, quiz outcomes, and badges. Adding certification authorization would not remove those writes. Do not reconnect those handlers under the limited-data policy; use separately reviewed non-tracking content routes instead. Admin curriculum inspection remains distinct from student course entry.

Unit tests cover exact metadata mapping, fresh independent-course reads, exact ID/course binding, completion between modal opening/submission, replay rejection, unknown/readiness section rejection, caller-override resistance, default compatibility, and fail-closed database errors. Existing PostgreSQL lifecycle tests cover the actual per-course database reader. New passing results are not claimed before CI execution.
